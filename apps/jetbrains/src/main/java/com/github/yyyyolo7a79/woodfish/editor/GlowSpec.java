package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.color.TokenColorDeriver;
import com.github.yyyyolo7a79.woodfish.core.color.TokenColors;

import java.awt.Font;
import java.util.Arrays;

/**
 * 一个视觉行发光的完整输入：不可变快照，既是缓存键也是交给后台栅格化的任务描述。
 *
 * <p>键只描述「画出来长什么样」：文字、位置（用户空间、内容区绝对 x，行内相对 y）、字体、各层颜色
 * 与全局参数，不含行号与 y 坐标。于是插入 / 删除行后内容没变的行仍能命中缓存，只是换个位置画；
 * Diff 左右两侧、多个分屏里相同的行也共享同一张图。
 *
 * <p>选区不进键：发光始终按 token 原色绘制，否则拖选文字时每帧都要重算发光。
 */
final class GlowSpec {

    final GlowParams params;
    final int lineHeight;
    final int ascent;
    /** 所有 piece 的文字首尾相接 */
    final char[] text;
    /** 第 i 个 piece 是 text[pieceEnd[i - 1], pieceEnd[i])（i = 0 时从 0 开始） */
    final int[] pieceEnd;
    final float[] x;
    final float[] width;
    final Font[] fonts;
    final int[] font;
    /** 各 piece 的三层发光颜色（ARGB，非预乘）；标点只用 near / mid 两层 */
    final int[] near;
    final int[] mid;
    final int[] far;
    final boolean[] punctuation;
    /** text[i] 的左边界 x（与 {@link #x} 同一坐标系，即编辑器画这个字的位置） */
    final float[] glyphX;
    /** 第 i 个 piece 不能用灰度字形缓存原样画（见 {@code PaintFrame.pieceNativeRisk}）：改为逐字定位 */
    final boolean[] nativeRisk;
    /** 字符网格模式下 text[i] 的格宽（复杂排版的 piece 照编辑器调整字形位置）；不在网格模式时为 null */
    final float[] cells;
    /** 第 i 个 piece 在字符网格里有字被挪进格子居中（见 {@code PaintFrame.pieceGridAligned}）：逐字画在 glyphX */
    final boolean[] gridAligned;
    final float minX;
    final float maxX;
    private final int hash;

    private GlowSpec(GlowParams params, int lineHeight, int ascent, char[] text, int[] pieceEnd,
                     float[] x, float[] width, Font[] fonts, int[] font,
                     int[] near, int[] mid, int[] far, boolean[] punctuation, float[] glyphX, boolean[] nativeRisk,
                     float[] cells, boolean[] gridAligned) {
        this.params = params;
        this.lineHeight = lineHeight;
        this.ascent = ascent;
        this.text = text;
        this.pieceEnd = pieceEnd;
        this.x = x;
        this.width = width;
        this.fonts = fonts;
        this.font = font;
        this.near = near;
        this.mid = mid;
        this.far = far;
        this.punctuation = punctuation;
        this.glyphX = glyphX;
        this.nativeRisk = nativeRisk;
        this.cells = cells;
        this.gridAligned = gridAligned;
        float lo = Float.POSITIVE_INFINITY;
        float hi = Float.NEGATIVE_INFINITY;
        for (int i = 0; i < x.length; i++) {
            lo = Math.min(lo, x[i]);
            hi = Math.max(hi, x[i] + width[i]);
        }
        this.minX = lo;
        this.maxX = hi;
        this.hash = computeHash();
    }

    /**
     * 从帧里截取第 {@code line} 个视觉行的快照；该行没有任何 piece 时返回 null。
     *
     * <p>颜色经 {@code deriver.derive} 取得（命中缓存时不分配），与渐变用的是同一份派生规则。
     *
     * @param includeCjk 是否给中日韩 piece 发光（用户可在设置页关闭中日韩效果）
     */
    static GlowSpec create(PaintFrame f, int line, GlowParams params, TokenColorDeriver deriver, boolean includeCjk) {
        int tokenFrom = f.lineTokenFrom[line];
        int tokenTo = f.lineTokenTo[line];
        if (tokenFrom >= tokenTo) {
            return null;
        }
        int pieceFrom = f.tokenPieceFrom[tokenFrom];
        int pieceTo = f.tokenPieceTo[tokenTo - 1];
        int pieces = 0;
        int chars = 0;
        for (int p = pieceFrom; p < pieceTo; p++) {
            if (includeCjk || !f.pieceCjk[p]) {
                pieces++;
                chars += f.pieceTo[p] - f.pieceFrom[p];
            }
        }
        if (pieces <= 0) {
            return null;
        }

        char[] text = new char[chars];
        float[] glyphX = new float[chars];
        int[] pieceEnd = new int[pieces];
        float[] x = new float[pieces];
        float[] width = new float[pieces];
        int[] font = new int[pieces];
        int[] near = new int[pieces];
        int[] mid = new int[pieces];
        int[] far = new int[pieces];
        boolean[] punctuation = new boolean[pieces];
        boolean[] nativeRisk = new boolean[pieces];
        float[] frameCells = f.gridCells();
        float[] cells = frameCells != null ? new float[chars] : null;
        boolean[] gridAligned = new boolean[pieces];
        Font[] fonts = new Font[Math.min(f.fontCount, 8)];
        int fontCount = 0;

        int cursor = 0;
        int i = 0;
        for (int t = tokenFrom; t < tokenTo; t++) {
            TokenColors colors = deriver.derive(f.tokenColor[t], f.tokenPunctuation[t]);
            int n = colors.glowNear().getRGB();
            int m = colors.glowMid().getRGB();
            int r = colors.glowFar().getRGB();
            for (int p = f.tokenPieceFrom[t]; p < f.tokenPieceTo[t]; p++) {
                if (!includeCjk && f.pieceCjk[p]) {
                    continue;
                }
                int length = f.pieceTo[p] - f.pieceFrom[p];
                System.arraycopy(f.chars, f.pieceFrom[p], text, cursor, length);
                System.arraycopy(f.charX, f.pieceFrom[p], glyphX, cursor, length);
                if (cells != null) {
                    System.arraycopy(frameCells, f.pieceFrom[p], cells, cursor, length);
                }
                cursor += length;
                pieceEnd[i] = cursor;
                x[i] = f.pieceX[p];
                width[i] = f.pieceWidth[p];
                Font pieceFont = f.fonts[f.pieceFont[p]];
                int index = 0;
                while (index < fontCount && fonts[index] != pieceFont) {
                    index++;
                }
                if (index == fontCount) {
                    if (fontCount == fonts.length) {
                        fonts = Arrays.copyOf(fonts, fontCount * 2);
                    }
                    fonts[fontCount++] = pieceFont;
                }
                font[i] = index;
                near[i] = n;
                mid[i] = m;
                far[i] = r;
                punctuation[i] = f.tokenPunctuation[t];
                nativeRisk[i] = f.pieceNativeRisk[p];
                gridAligned[i] = f.pieceGridAligned[p];
                i++;
            }
        }
        return new GlowSpec(params, f.lineHeight, f.ascent, text, pieceEnd, x, width,
                Arrays.copyOf(fonts, fontCount), font, near, mid, far, punctuation, glyphX, nativeRisk,
                cells, gridAligned);
    }

    int pieceCount() {
        return pieceEnd.length;
    }

    int pieceStart(int piece) {
        return piece == 0 ? 0 : pieceEnd[piece - 1];
    }

    /** 粗略的堆占用（缓存限额时与像素一起计入，避免大量空发光条目把键撑满内存） */
    long approximateBytes() {
        return 160L + text.length * (cells != null ? 10L : 6L) + pieceEnd.length * 35L + fonts.length * 8L;
    }

    private int computeHash() {
        int h = params.hashCode();
        h = 31 * h + lineHeight;
        h = 31 * h + ascent;
        h = 31 * h + Arrays.hashCode(text);
        h = 31 * h + Arrays.hashCode(pieceEnd);
        h = 31 * h + Arrays.hashCode(x);
        h = 31 * h + Arrays.hashCode(width);
        for (int f : font) {
            h = 31 * h + fonts[f].hashCode();
        }
        h = 31 * h + Arrays.hashCode(near);
        h = 31 * h + Arrays.hashCode(mid);
        h = 31 * h + Arrays.hashCode(far);
        h = 31 * h + Arrays.hashCode(punctuation);
        h = 31 * h + Arrays.hashCode(glyphX);
        h = 31 * h + Arrays.hashCode(nativeRisk);
        h = 31 * h + Arrays.hashCode(cells);
        h = 31 * h + Arrays.hashCode(gridAligned);
        return h;
    }

    @Override
    public int hashCode() {
        return hash;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof GlowSpec other) || hash != other.hash) {
            return false;
        }
        if (lineHeight != other.lineHeight || ascent != other.ascent || !params.equals(other.params)
                || !Arrays.equals(text, other.text) || !Arrays.equals(pieceEnd, other.pieceEnd)
                || !Arrays.equals(x, other.x) || !Arrays.equals(width, other.width)
                || !Arrays.equals(near, other.near) || !Arrays.equals(mid, other.mid)
                || !Arrays.equals(far, other.far) || !Arrays.equals(punctuation, other.punctuation)
                || !Arrays.equals(glyphX, other.glyphX) || !Arrays.equals(nativeRisk, other.nativeRisk)
                || !Arrays.equals(cells, other.cells) || !Arrays.equals(gridAligned, other.gridAligned)) {
            return false;
        }
        for (int i = 0; i < font.length; i++) {
            if (!fonts[font[i]].equals(other.fonts[other.font[i]])) {
                return false;
            }
        }
        return true;
    }
}
