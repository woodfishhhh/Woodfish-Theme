package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.color.CssGradient;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.Paint;
import java.awt.font.FontRenderContext;
import java.awt.font.GlyphVector;
import java.awt.geom.AffineTransform;

/**
 * 用纯色块近似渐变，重画 {@code pieceNativeRisk} 的 piece（LCD 编辑器上的中日韩、回退字体与系统字体）。
 *
 * <p>渐变画笔会让 Java2D 退成灰度字形缓存，而这些字在编辑器里由原生光栅化，字形与步进都不同，
 * 覆绘在原字上就是逐字错位的重影（见 {@link NativeGlyphs}）。纯色画笔保留 LCD，与编辑器用同一份字形缓存：
 * <ul>
 *   <li>普通文字逐字画在编辑器的位置（{@code PaintFrame.charX}，字符网格模式下已含格内居中），颜色取渐变在该字格子中心的值。
 *       渐变在一个字宽内变化明显（短 token）或带纵向分量（非水平角度）时，再把字格横向 / 纵向切成小块，
 *       每块用矩形裁剪和各自的纯色画同一个字</li>
 *   <li>需要复杂排版的文字（开了连字）整段排版（字符网格模式下照编辑器调整字形位置），按横向分块裁剪着画，
 *       与 ComplexTextFragment 画子区间的做法相同</li>
 * </ul>
 * 块的边界在设备像素上取整，相邻块共用同一条边界：每个设备像素只画一次，不会因重叠而加粗；
 * 矩形裁剪不影响 LCD（{@code canRenderLCDText} 只要求 {@code clipState <= CLIP_RECTANGULAR}）。
 *
 * <p>只在 EDT 上使用；每个 GradientRenderer 一个实例，字段是逐 piece 的临时状态。
 */
final class LcdGradientPainter {

    /** 相邻两块的最大渐变位置差：约为整条渐变的 1/12，在这一步长下三个色标之间看不出台阶 */
    static final double MAX_STEP = 1.0 / 12;
    /** 单个字格横向最多切几块 */
    static final int MAX_GLYPH_SLICES = 3;
    /** 纵向最多切几条色带 */
    static final int MAX_BANDS = 4;
    /** 整段排版的文字横向最多分几块：每块都要画整段字形，块数不能随字数增长 */
    static final int MAX_TILES = 16;
    /** 最外侧的块延伸到无穷远，盖住斜体等伸出逻辑边界的字形（横向与纵向共用） */
    private static final double MINUS_INF = Double.NEGATIVE_INFINITY;
    private static final double PLUS_INF = Double.POSITIVE_INFINITY;
    /** 无穷远在设备像素上的替身：足够远，且两者相减不会溢出 int */
    private static final int DEVICE_FAR = 1 << 28;
    private static final AffineTransform IDENTITY = new AffineTransform();

    // ===== 逐 piece 状态 =====
    private Graphics2D g;
    private AffineTransform user;
    private java.util.List<Color> stops;
    /** 渐变线两端（盒子局部坐标） */
    private double x0;
    private double y0;
    private double x1;
    private double y1;
    /** 色带的纵向范围（盒子局部坐标）与条数 */
    private double bandTop;
    private double bandBottom;
    private int bands;
    private int lastArgb;
    private Color lastColor;
    /** 当前要画的内容：vector != null 时画整段 GlyphVector，否则画 chars[from, to) */
    private Font font;
    private char[] chars;
    private int from;
    private int to;
    private float drawX;
    private float drawY;
    private GlyphVector vector;

    /** 渐变位置跨度 span 至少要切成几块，才能让每块内的跨度不超过 {@link #MAX_STEP}（结果在 [1, max]） */
    static int divisions(double span, int max) {
        if (!(span > MAX_STEP)) {
            return 1;
        }
        return (int) Math.min(max, Math.ceil(span / MAX_STEP));
    }

    /**
     * 画第 {@code piece} 个 piece（属于第 {@code token} 个 token）。
     *
     * @param g        已平移到渐变盒子左上角 (boxX, boxY) 的画布（整数平移，不含斜切）
     * @param ends     渐变线两端 {x0, y0, x1, y1}（盒子局部坐标，即渐变画笔的起止点）
     * @param baseline 本行基线（内容区绝对坐标）
     * @param frc      编辑器画字用的 FontRenderContext（复杂排版时与编辑器一致地排字）
     */
    void paint(Graphics2D g, PaintFrame f, int token, int piece, double[] ends, java.util.List<Color> stops,
               int boxX, int boxY, float baseline, FontRenderContext frc, TextPieces.GlyphCache glyphs) {
        double lengthSquared = (ends[2] - ends[0]) * (ends[2] - ends[0]) + (ends[3] - ends[1]) * (ends[3] - ends[1]);
        if (!(lengthSquared > 0)) {
            return; // 渐变退化：编辑器画的就是原色
        }
        this.g = g;
        this.user = g.getTransform();
        this.stops = stops;
        x0 = ends[0];
        y0 = ends[1];
        x1 = ends[2];
        y1 = ends[3];
        // 渐变位置对用户空间位移的变化率
        double perX = Math.abs(x1 - x0) / lengthSquared;
        double perY = Math.abs(y1 - y0) / lengthSquared;
        bandTop = f.tokenTop[token] - boxY;
        bandBottom = f.tokenBottom[token] - boxY;
        bands = divisions(perY * (bandBottom - bandTop), MAX_BANDS);
        lastColor = null;

        Paint savedPaint = g.getPaint();
        font = f.fonts[f.pieceFont[piece]];
        chars = f.chars;
        drawY = baseline - boxY;
        try {
            paintGlyphs(f, piece, boxX, perX, frc, glyphs);
        } finally {
            g.setPaint(savedPaint); // 不裁剪的快速路径直接在 g 上换了颜色
            vector = null;
            chars = null;
            font = null;
            lastColor = null;
            this.g = null;
            this.stops = null;
            user = null;
        }
    }
    private void paintGlyphs(PaintFrame f, int piece, int boxX, double perX, FontRenderContext frc,
                             TextPieces.GlyphCache glyphs) {
        int start = f.pieceFrom[piece];
        int end = f.pieceTo[piece];
        double left = f.pieceX[piece] - boxX;
        double right = left + f.pieceWidth[piece];
        boolean partial = f.pieceSelection[piece] == PaintFrame.SELECTION_PARTIAL;
        if (TextPieces.needsLayout(font, chars, start, end)) {
            if (partial) {
                return; // 部分选中的复杂排版文字：宁可保留编辑器的原色，也不冒险画错
            }
            vector = glyphs.get(font, frc, chars, start, end, f.pieceGridAligned[piece] ? f.charCell : null);
            drawX = (float) left;
            int tiles = divisions(perX * (right - left), MAX_TILES);
            paintColumns(left, right, tiles);
            return;
        }
        vector = null;
        if (!partial && !f.pieceGridAligned[piece] && divisions(perX * (right - left), 2) == 1) {
            // 整段颜色几乎不变：一次画完，与编辑器画这段文字的调用完全相同（网格里挪过位置的字编辑器是逐字画的）
            setChars(start, end, (float) left);
            paintColumns(left, right, 1);
            return;
        }
        int slices = divisions(perX * (right - left) / Math.max(1, end - start), MAX_GLYPH_SLICES);
        for (int i = start; i < end; i++) {
            if (partial && f.selectionState(f.textBase + i, f.textBase + i + 1) == PaintFrame.SELECTION_FULL) {
                continue; // 选中的字由编辑器用选区前景色画
            }
            double charLeft = f.charX[i] - boxX;
            double charRight = i + 1 < end ? f.charX[i + 1] - boxX : right;
            setChars(i, i + 1, (float) charLeft);
            paintColumns(charLeft, charRight, slices);
        }
    }

    /**
     * 把 [left, right) 横向等分成 n 列、每列再纵向切成 {@link #bands} 条，逐块用纯色画当前内容。
     * 最左 / 最右一列与最上 / 最下一条延伸到无穷远；颜色取各块在实际范围内的中心。
     */
    private void paintColumns(double left, double right, int n) {
        for (int c = 0; c < n; c++) {
            double a = left + (right - left) * c / n;
            double b = c + 1 == n ? right : left + (right - left) * (c + 1) / n;
            double centerX = (a + b) / 2;
            double clipLeft = c == 0 ? MINUS_INF : a;
            double clipRight = c + 1 == n ? PLUS_INF : b;
            for (int r = 0; r < bands; r++) {
                double top = bandTop + (bandBottom - bandTop) * r / bands;
                double bottom = r + 1 == bands ? bandBottom : bandTop + (bandBottom - bandTop) * (r + 1) / bands;
                cell(clipLeft, r == 0 ? MINUS_INF : top, clipRight, r + 1 == bands ? PLUS_INF : bottom,
                        centerX, (top + bottom) / 2);
            }
        }
    }

    /** 在盒子局部范围 [left, right) × [top, bottom) 内，用渐变在 (cx, cy) 处的颜色画当前内容 */
    private void cell(double left, double top, double right, double bottom, double cx, double cy) {
        int argb = CssGradient.colorAt(stops, CssGradient.positionAt(x0, y0, x1, y1, cx, cy));
        if (lastColor == null || argb != lastArgb) {
            lastArgb = argb;
            lastColor = new Color(argb, true);
        }
        if (left == MINUS_INF && right == PLUS_INF && top == MINUS_INF && bottom == PLUS_INF) {
            g.setColor(lastColor); // 不需要裁剪（调用方负责事后恢复画笔）
            drawContent(g);
            return;
        }
        int dx0 = deviceX(left);
        int dx1 = deviceX(right);
        int dy0 = deviceY(top);
        int dy1 = deviceY(bottom);
        if (dx1 <= dx0 || dy1 <= dy0) {
            return;
        }
        Graphics2D sub = (Graphics2D) g.create();
        try {
            // 在设备空间按整数像素裁剪：相邻块的边界取整结果相同，不重叠也不留缝
            sub.setTransform(IDENTITY);
            sub.clipRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
            sub.setTransform(user);
            sub.setColor(lastColor);
            drawContent(sub);
        } finally {
            sub.dispose();
        }
    }

    private int deviceX(double x) {
        return x == MINUS_INF ? -DEVICE_FAR : x == PLUS_INF ? DEVICE_FAR
                : (int) Math.floor(user.getScaleX() * x + user.getTranslateX() + 0.5);
    }

    private int deviceY(double y) {
        return y == MINUS_INF ? -DEVICE_FAR : y == PLUS_INF ? DEVICE_FAR
                : (int) Math.floor(user.getScaleY() * y + user.getTranslateY() + 0.5);
    }

    private void setChars(int from, int to, float x) {
        this.from = from;
        this.to = to;
        this.drawX = x;
    }

    private void drawContent(Graphics2D target) {
        if (vector != null) {
            target.drawGlyphVector(vector, drawX, drawY);
        } else {
            // 与编辑器的 SimpleTextFragment 相同：整数坐标走 drawChars，否则 drawString
            TextPieces.drawRun(target, font, chars, from, to, drawX, drawY);
        }
    }
}
