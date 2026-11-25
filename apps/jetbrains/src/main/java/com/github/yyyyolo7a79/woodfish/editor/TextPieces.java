package com.github.yyyyolo7a79.woodfish.editor;

import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.font.FontRenderContext;
import java.awt.font.GlyphVector;
import java.awt.geom.Point2D;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 按编辑器自己的方式画一段文字（纯 Java2D，EDT 与后台发光线程共用）。
 *
 * <p>平台的两种文字片段（{@code com.intellij.openapi.editor.impl.view}，243 / 252 / 262 一致）：
 * <ul>
 *   <li>{@code SimpleTextFragment}：坐标是整数时 {@code drawChars}，否则 {@code drawString}，
 *       字形位置由当前 Graphics 的 FontRenderContext 决定</li>
 *   <li>{@code ComplexTextFragment}：字体带布局属性（开了连字）、或文字需要复杂排版时，
 *       用 {@code Font.layoutGlyphVector} 排好再 {@code drawGlyphVector}</li>
 * </ul>
 * 判定条件照抄 {@code TextFragmentFactory}，于是同一个字体、同一个 FontRenderContext 下我们重画的
 * 字形与编辑器画的逐像素重合，渐变才能严丝合缝地盖住原色文字。
 *
 * <p>字符网格模式（{@link EditorGrid}，252 / 262）下两种片段都把字宽与格宽不符的字挪进格子居中：
 * SimpleTextFragment 逐字画在 {@code PaintFrame.charX}（见 {@link #drawEach}），ComplexTextFragment 改写
 * GlyphVector 的字形位置（见 {@link #alignToGrid}）。
 *
 * <p>注意 {@code drawString} 遇到带布局属性的字体会改走 TextLayout，而编辑器对这种字体从不调用
 * {@code drawString}：连字字体必须走 GlyphVector 分支，否则字形会与编辑器不一致。
 */
final class TextPieces {

    /** 字宽与格宽之差小于它就不挪（{@code TextFragment.isTooClose} 与 ComplexTextFragment 的居中判定都用 0.001） */
    static final double GRID_TOLERANCE = 0.001;

    /**
     * 不读取片段外的上下文。编辑器排版时以整个 chunk 为上下文，对从左到右的书写系统，HarfBuzz
     * 只在连写字母（阿拉伯语等从右到左文字，本插件整行跳过）里使用上下文；这里传入的缓冲拼接了
     * 多行文字，关掉上下文才不会被相邻行影响。
     */
    private static final int LAYOUT_FLAGS =
            Font.LAYOUT_LEFT_TO_RIGHT | Font.LAYOUT_NO_START_CONTEXT | Font.LAYOUT_NO_LIMIT_CONTEXT;

    private TextPieces() {
    }

    /** 与 TextFragmentFactory 相同的「需要复杂排版」判定（调用方已排除代理对与从右到左文字） */
    static boolean needsLayout(Font font, char[] chars, int from, int to) {
        return font.hasLayoutAttributes() || Font.textRequiresLayout(chars, from, to);
    }

    /** 检查片段是否包含中日韩文字或全角标点：这些字总由系统回退字体显示（见 {@link NativeGlyphs}）。 */
    static boolean containsCjk(char[] chars, int from, int to) {
        for (int i = from; i < to; ) {
            int codePoint = Character.codePointAt(chars, i, to);
            Character.UnicodeScript script = Character.UnicodeScript.of(codePoint);
            if (script == Character.UnicodeScript.HAN
                    || script == Character.UnicodeScript.HIRAGANA
                    || script == Character.UnicodeScript.KATAKANA
                    || script == Character.UnicodeScript.HANGUL
                    || script == Character.UnicodeScript.BOPOMOFO
                    || Character.UnicodeBlock.of(codePoint) == Character.UnicodeBlock.CJK_SYMBOLS_AND_PUNCTUATION
                    || Character.UnicodeBlock.of(codePoint) == Character.UnicodeBlock.HALFWIDTH_AND_FULLWIDTH_FORMS) {
                return true;
            }
            i += Character.charCount(codePoint);
        }
        return false;
    }

    /**
     * 在 (x, baseline) 把 chars[from, to) 当作一段不需要复杂排版的文字画出来（SimpleTextFragment 的画法）。
     * 颜色 / Paint 由调用方事先设置在 g 上；需要复杂排版的文字用 {@link #layout} 或 {@link GlyphCache}。
     */
    static void drawRun(Graphics2D g, Font font, char[] chars, int from, int to, float x, float baseline) {
        g.setFont(font);
        int xi = (int) x;
        int yi = (int) baseline;
        if (xi == x && yi == baseline) {
            // 与 SimpleTextFragment 相同：整数坐标走 drawChars，避免创建字符串
            g.drawChars(chars, from, to - from, xi, yi);
        } else {
            g.drawString(new String(chars, from, to - from), x, baseline);
        }
    }

    /**
     * 像 ComplexTextFragment 那样排版 chars[from, to)：字形从 (0, 0) 排起，用 {@code drawGlyphVector} 画在片段起点。
     *
     * @param frc   排版用的 FontRenderContext（编辑器 Graphics 的 FRC，不含平移）
     * @param cells 字符网格模式下逐字的格宽（下标同 chars），见 {@link #alignToGrid}；null = 不在网格模式
     */
    static GlyphVector layout(Font font, FontRenderContext frc, char[] chars, int from, int to, float[] cells) {
        GlyphVector vector = font.layoutGlyphVector(frc, chars, from, to, LAYOUT_FLAGS);
        if (cells != null) {
            alignToGrid(vector, cells, from, to);
        }
        return vector;
    }

    /** Keep glyph clusters intact: one ligature can cover several measured character cells. */
    static void alignToGrid(GlyphVector vector, float[] cells, int from, int to) {
        int count = vector.getNumGlyphs();
        int[] indices = vector.getGlyphCharIndices(0, count, null);
        for (int i = 1; i < count; i++) if (indices[i] < indices[i - 1]) return;
        float[] xy = vector.getGlyphPositions(0, count + 1, null);
        double x = xy[0];
        for (int i = 0; i < count;) {
            int next = i + 1;
            while (next < count && indices[next] == indices[i]) next++;
            int charEnd = next == count ? to : from + indices[next];
            double measured = 0;
            for (int c = from + indices[i]; c < charEnd; c++) measured += cells[c];
            double natural = xy[2 * next] - xy[2 * i];
            double advance = Math.abs(measured - natural) < GRID_TOLERANCE ? natural : measured;
            double shift = x - xy[2 * i] + Math.max(0, (advance - natural) / 2);
            for (int k = i; k < next; k++) {
                vector.setGlyphPosition(k, new Point2D.Double(xy[2 * k] + shift, xy[2 * k + 1]));
            }
            x += advance;
            i = next;
        }
        vector.setGlyphPosition(count, new Point2D.Double(x, xy[2 * count + 1]));
    }

    /**
     * 逐字画 chars[from, to)，第 i 个字画在 {@code charX[i] + dx}（编辑器画这个字的位置）。用于两种情况：
     * <ul>
     *   <li>当前画法用的字形缓存与编辑器不同（LCD 编辑器上的灰度 / 渐变绘制，见 {@link NativeGlyphs}）：
     *       整段 {@code drawString} 会按自己的步进排字、越画越偏，逐字放在编辑器的位置上就不会累积误差</li>
     *   <li>字符网格模式下有字被挪进格子居中（{@code PaintFrame.pieceGridAligned}）：编辑器自己也是逐字画的</li>
     * </ul>
     * 只用于不需要复杂排版的文字：每个字独立成形，与编辑器的 SimpleTextFragment 一致。
     */
    static void drawEach(Graphics2D g, Font font, char[] chars, float[] charX, int from, int to,
                         float dx, float baseline) {
        g.setFont(font);
        for (int i = from; i < to; i++) {
            g.drawString(String.valueOf(chars[i]), charX[i] + dx, baseline);
        }
    }

    /** Cache natural shaping; measured runs use this frame's public editor coordinates. */
    static final class GlyphCache {
        private static final int CAPACITY = 2048;

        private record Key(Font font, FontRenderContext frc, String text) {
        }

        private final Map<Key, GlyphVector> map = new LinkedHashMap<>(256, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<Key, GlyphVector> eldest) {
                return size() > CAPACITY;
            }
        };

        GlyphVector get(Font font, FontRenderContext frc, char[] chars, int from, int to, float[] cells) {
            // Measured positions belong to this editor run and can differ even for identical text.
            if (cells != null) return layout(font, frc, chars, from, to, cells);
            Key key = new Key(font, frc, new String(chars, from, to - from));
            GlyphVector vector = map.get(key);
            if (vector == null) {
                vector = layout(font, frc, chars, from, to, null);
                map.put(key, vector);
            }
            return vector;
        }

        void clear() {
            map.clear();
        }
    }
}
