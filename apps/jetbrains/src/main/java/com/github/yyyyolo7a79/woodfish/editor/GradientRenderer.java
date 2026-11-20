package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.color.CssGradient;
import com.github.yyyyolo7a79.woodfish.core.color.TokenColorDeriver;
import com.github.yyyyolo7a79.woodfish.core.color.TokenColors;
import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.markup.CustomHighlighterOrder;
import com.intellij.openapi.editor.markup.CustomHighlighterRenderer;
import com.intellij.openapi.editor.markup.RangeHighlighter;
import org.jetbrains.annotations.NotNull;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.LinearGradientPaint;
import java.awt.MultipleGradientPaint;
import java.awt.Rectangle;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 渐变层：在编辑器画完文字之后（{@code isForeground() == true} 即 {@code CustomHighlighterOrder.AFTER_TEXT}），
 * 用同样的字体、位置与渲染提示重画每个 token 的字形，画笔换成「浅 0% → 原色 50% → 深 100%」的
 * 线性渐变，相当于原版的 {@code background-clip: text}。
 *
 * <p>不用 {@code getOrder()}：它和 {@code CustomHighlighterOrder} 在 243 ~ 262 都标着
 * {@code @ApiStatus.Experimental}；稳定的 {@code isForeground()} 默认实现正好映射到
 * AFTER_TEXT / AFTER_BACKGROUND。
 *
 * <p>传入的 Graphics 就是编辑器绘制会话的那一个（{@code EditorComponentImpl.paintComponent} 已设好
 * 编辑器的文字抗锯齿、LCD 对比度与小数字宽），这里不改任何渲染提示，只在副本上换画笔。
 *
 * <p><b>LCD 次像素抗锯齿</b>（Windows 编辑器默认）：Java2D 只对纯色画笔做 LCD 文字，渐变画笔会退成灰度
 * （{@code SurfaceData.canRenderLCDText} 要求 {@code paintState <= PAINT_ALPHACOLOR}）。JBR 自带字体（JetBrains Mono 等）
 * 在 LCD 与灰度下由同一个光栅化器生成、步进一致，字形内部被渐变完全覆盖，边缘像素按覆盖率混合，残留约
 * 「1 − 覆盖率」的原 LCD 彩边；原版在 Chromium 里同样是灰度抗锯齿（background-clip: text 会关闭 LCD 文字），
 * 视觉上一致。中日韩回退字体与系统字体则不同：LCD 下由原生光栅化，退成灰度后字形与步进都对不上，
 * 叠在原字上就是逐字错位的重影。这类 piece（{@code PaintFrame.pieceNativeRisk}）交给 {@link LcdGradientPainter}
 * 逐字取样渐变色、用纯色画，保留 LCD，与编辑器用同一份字形缓存。
 *
 * <p><b>字符网格</b>（{@link EditorGrid}，如 2026.2 里含中文的 Markdown 表格）：编辑器把字宽与格宽不符的字挪进格子居中，
 * 重画时一律照编辑器的位置（见 {@link #drawPiece}），否则同一段里越画越偏。
 */
final class GradientRenderer implements CustomHighlighterRenderer {

    private static final float[] FRACTIONS = {0f, 0.5f, 1f};
    private static final int PAINT_CACHE_CAPACITY = 512;

    /**
     * 画笔缓存键：三个颜色 + 盒子尺寸（1/4 像素量化）。渐变按盒子左上角为原点定义，绘制时把 Graphics
     * 平移到盒子左上角（取整），同色同长的 token 就能共用一个画笔实例；
     * MultipleGradientPaint 把颜色查找表缓存在画笔实例里，软件渲染管线（Windows 上 IDE 默认关闭 D3D）
     * 每次新建画笔都要重算一遍。
     */
    private record PaintKey(int light, int base, int dark, int width4, int height4) {
    }

    private final SyntaxEffects effects;
    private final TextPieces.GlyphCache glyphs = new TextPieces.GlyphCache();
    private final LcdGradientPainter solid = new LcdGradientPainter();
    private final Map<PaintKey, LinearGradientPaint> paints = new LinkedHashMap<>(256, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<PaintKey, LinearGradientPaint> eldest) {
            return size() > PAINT_CACHE_CAPACITY;
        }
    };
    private double paintsAngle = Double.NaN;

    GradientRenderer(SyntaxEffects effects) {
        this.effects = effects;
    }

    @Override
    public CustomHighlighterOrder getOrder() {
        // 不用 isForeground()：它带 @Deprecated(forRemoval = true)（243 ~ 262 均如此）。
        // getOrder() 在 243 ~ 262 标 @ApiStatus.Experimental，但三个版本字节码一致且 EditorPainter
        // 从 243 起就依赖它；两害相权取编译零警告、行为明确的一方，风险记入 docs/handoff。
        return CustomHighlighterOrder.AFTER_TEXT;
    }

    @Override
    public void paint(@NotNull Editor editor, @NotNull RangeHighlighter highlighter, @NotNull Graphics g) {
        EffectSettings settings = effects.settings();
        if (!settings.gradientActive() || effects.isDisabled() || !(g instanceof Graphics2D g2)) {
            return;
        }
        try {
            paintGradient(g2, settings);
            effects.renderSucceeded();
        } catch (Throwable t) {
            effects.renderFailed(t, "渐变");
        } finally {
            effects.scanner().endSession(); // 渐变总是同一会话里最后一个使用帧数据的渲染器
        }
    }

    /** 设置或配色变化：画笔与排版缓存全部作废 */
    void clearCaches() {
        paints.clear();
        glyphs.clear();
        paintsAngle = Double.NaN;
    }

    private void paintGradient(Graphics2D g, EffectSettings settings) {
        Rectangle clip = effects.clipOf(g);
        if (clip == null) {
            return;
        }
        PaintFrame f = effects.scanner().scan(g, clip, 0, effects.skipSelectedText());
        if (f.pieceCount == 0) {
            return;
        }
        double angle = settings.angle();
        if (Double.compare(angle, paintsAngle) != 0) {
            paints.clear();
            paintsAngle = angle;
        }
        TokenColorDeriver deriver = effects.deriver();

        Graphics2D gg = (Graphics2D) g.create();
        try {
            FontRenderContext frc = gg.getFontRenderContext();
            AffineTransform base = gg.getTransform();
            // LcdGradientPainter 按「缩放 + 平移」换算设备像素；编辑器不会斜切或旋转，遇到时只是不画有风险的 piece
            boolean axisAligned = base.getShearX() == 0 && base.getShearY() == 0;
            int clipTop = clip.y;
            int clipBottom = clip.y + clip.height;
            for (int line = 0; line < f.lineCount; line++) {
                int top = f.lineTop[line];
                if (top >= clipBottom || top + f.lineHeight <= clipTop) {
                    continue;
                }
                float baseline = top + f.ascent;
                for (int t = f.lineTokenFrom[line]; t < f.lineTokenTo[line]; t++) {
                    // 斜体、宽字形会伸出逻辑边界，按 1em 留余量判断是否落在 clip 里
                    float margin = f.tokenEm[t];
                    float clipLeft = clip.x - margin;
                    float clipRight = clip.x + clip.width + margin;
                    if (f.tokenX1[t] < clipLeft || f.tokenX0[t] > clipRight) {
                        continue;
                    }
                    TokenColors colors = deriver.derive(f.tokenColor[t], f.tokenPunctuation[t]);
                    if (colors.light().getRGB() == colors.base().getRGB()
                            && colors.dark().getRGB() == colors.base().getRGB()) {
                        continue; // 渐变退化成纯色：编辑器画的就是它，重画只会让字变粗
                    }
                    // 原版 padding-inline: 0.12em 让渐变盒子比文字略宽，两端的浅 / 深色不会被字形截掉一半
                    float pad = 0.12f * f.tokenEm[t];
                    int boxX = (int) Math.floor(f.tokenX0[t] - pad);
                    int boxY = (int) Math.floor(f.tokenTop[t]);
                    LinearGradientPaint paint = paint(colors, f.tokenX1[t] + pad - boxX, f.tokenBottom[t] - boxY, angle);
                    if (paint == null) {
                        continue;
                    }
                    // 只按整数平移：pieceX − boxX 是精确的浮点差，变换后的设备坐标与编辑器画字时完全相同
                    gg.setTransform(base);
                    gg.translate(boxX, boxY);
                    gg.setPaint(paint);
                    double[] ends = null;
                    for (int p = f.tokenPieceFrom[t]; p < f.tokenPieceTo[t]; p++) {
                        float x = f.pieceX[p];
                        if (x > clipRight || x + f.pieceWidth[p] < clipLeft) {
                            continue;
                        }
                        byte selection = f.pieceSelection[p];
                        if (selection == PaintFrame.SELECTION_FULL) {
                            continue; // 方案定义了选区前景色：选中文字保持编辑器的颜色
                        }
                        if (f.pieceCjk[p] && !settings.cjkGradientEnabled()) {
                            continue; // 用户关闭了中日韩效果：保留 IDE 原生单次绘制
                        }
                        if (f.pieceNativeRisk[p]) {
                            // 原生光栅化的字不能用渐变画笔（会退成灰度、逐字错位成重影）：改用逐字纯色、保留 LCD
                            if (axisAligned) {
                                if (ends == null) {
                                    ends = endpoints(paint);
                                }
                                solid.paint(gg, f, t, p, ends, colors.light().getRGB(), colors.base().getRGB(),
                                        colors.dark().getRGB(), boxX, boxY, baseline, frc, glyphs);
                            }
                            continue;
                        }
                        Font font = f.fonts[f.pieceFont[p]];
                        if (selection == PaintFrame.SELECTION_NONE) {
                            drawPiece(gg, f, p, font, boxX, boxY, baseline, frc);
                        } else {
                            drawUnselected(gg, f, p, 2 * margin, font, boxX, boxY, baseline, frc);
                        }
                    }
                }
            }
        } finally {
            gg.dispose();
        }
    }

    /**
     * 部分选中的 piece：照 ComplexTextFragment 画子区间的做法，整段排版、按水平 clip 只露出未选中的部分，
     * 连字被选区切开时也与编辑器一致。
     */
    private void drawUnselected(Graphics2D g, PaintFrame f, int piece, float margin, Font font, int boxX, int boxY,
                                float baseline, FontRenderContext frc) {
        int start = f.textBase + f.pieceFrom[piece];
        int end = f.textBase + f.pieceTo[piece];
        int cursor = start;
        for (int s = 0; s < f.selectionCount && cursor < end; s++) {
            int selStart = f.selectionStart[s];
            int selEnd = f.selectionEnd[s];
            if (selEnd <= cursor) {
                continue;
            }
            if (selStart > cursor) {
                drawClipped(g, f, piece, font, cursor, Math.min(selStart, end), start, end, margin, boxX, boxY, baseline, frc);
            }
            cursor = Math.max(cursor, selEnd);
        }
        if (cursor < end) {
            drawClipped(g, f, piece, font, cursor, end, start, end, margin, boxX, boxY, baseline, frc);
        }
    }

    private void drawClipped(Graphics2D g, PaintFrame f, int piece, Font font, int from, int to,
                             int pieceStart, int pieceEnd, float margin, int boxX, int boxY,
                             float baseline, FontRenderContext frc) {
        Editor editor = effects.editor();
        double x0 = from == pieceStart ? f.pieceX[piece] - margin : editor.offsetToPoint2D(from, true, false).getX();
        double x1 = to == pieceEnd ? f.pieceX[piece] + f.pieceWidth[piece] + margin
                : editor.offsetToPoint2D(to, false, true).getX();
        Graphics2D sub = (Graphics2D) g.create();
        try {
            sub.clip(new Rectangle2D.Double(x0 - boxX, -f.lineHeight, x1 - x0, 4.0 * f.lineHeight));
            drawPiece(sub, f, piece, font, boxX, boxY, baseline, frc);
        } finally {
            sub.dispose();
        }
    }

    /**
     * 按编辑器的画法画整个 piece（画笔已设好，g 已平移到盒子左上角）：需要复杂排版的整段排版
     * （字符网格模式下字形位置随格子调整），网格里有字被挪进格子居中的逐字画，其余整段画。
     */
    private void drawPiece(Graphics2D g, PaintFrame f, int piece, Font font, int boxX, int boxY, float baseline,
                           FontRenderContext frc) {
        int from = f.pieceFrom[piece];
        int to = f.pieceTo[piece];
        if (TextPieces.needsLayout(font, f.chars, from, to)) {
            g.drawGlyphVector(glyphs.get(font, frc, f.chars, from, to, f.gridCells(), f.gridUnit),
                    f.pieceX[piece] - boxX, baseline - boxY);
        } else if (f.pieceGridAligned[piece]) {
            TextPieces.drawEach(g, font, f.chars, f.charX, from, to, -boxX, baseline - boxY);
        } else {
            TextPieces.drawRun(g, font, f.chars, from, to, f.pieceX[piece] - boxX, baseline - boxY);
        }
    }

    /** 渐变画笔的起止点 {x0, y0, x1, y1}（盒子局部坐标）：纯色近似与画笔取同一条渐变线 */
    private static double[] endpoints(LinearGradientPaint paint) {
        return new double[] {paint.getStartPoint().getX(), paint.getStartPoint().getY(),
                paint.getEndPoint().getX(), paint.getEndPoint().getY()};
    }

    /** 盒子 (0, 0, width, height) 上的 CSS 线性渐变；两端点重合（盒子退化）时返回 null */
    private LinearGradientPaint paint(TokenColors colors, float width, float height, double angle) {
        PaintKey key = new PaintKey(colors.light().getRGB(), colors.base().getRGB(), colors.dark().getRGB(),
                Math.round(width * 4), Math.round(height * 4));
        LinearGradientPaint cached = paints.get(key);
        if (cached != null || paints.containsKey(key)) {
            return cached;
        }
        double[] e = CssGradient.endpoints(0, 0, key.width4() / 4.0, key.height4() / 4.0, angle);
        LinearGradientPaint paint = null;
        double length = Math.hypot(e[2] - e[0], e[3] - e[1]);
        if (Double.isFinite(length) && length > 1e-3) {
            paint = new LinearGradientPaint((float) e[0], (float) e[1], (float) e[2], (float) e[3], FRACTIONS,
                    new Color[] {colors.light(), colors.base(), colors.dark()},
                    MultipleGradientPaint.CycleMethod.NO_CYCLE);
        }
        paints.put(key, paint);
        return paint;
    }
}
