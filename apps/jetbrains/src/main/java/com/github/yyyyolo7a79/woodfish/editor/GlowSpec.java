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

    private GlowSpec(PaintFrame frame, int line, GlowParams params, TokenColorDeriver deriver,
                     boolean includeCjk, int pieces, int chars) {
        this.params = params;
        lineHeight = frame.lineHeight;
        ascent = frame.ascent;
        text = new char[chars];
        glyphX = new float[chars];
        pieceEnd = new int[pieces];
        x = new float[pieces];
        width = new float[pieces];
        font = new int[pieces];
        near = new int[pieces];
        mid = new int[pieces];
        far = new int[pieces];
        punctuation = new boolean[pieces];
        nativeRisk = new boolean[pieces];
        gridAligned = new boolean[pieces];
        cells = frame.gridCells() == null ? null : new float[chars];
        fonts = copyTokens(frame, line, deriver, includeCjk);
        float lo = Float.POSITIVE_INFINITY;
        float hi = Float.NEGATIVE_INFINITY;
        for (int i = 0; i < x.length; i++) {
            lo = Math.min(lo, x[i]);
            hi = Math.max(hi, x[i] + width[i]);
        }
        minX = lo;
        maxX = hi;
        hash = computeHash();
    }

    static GlowSpec create(PaintFrame f, int line, GlowParams params, TokenColorDeriver deriver, boolean includeCjk) {
        int start = f.lineTokenFrom[line], end = f.lineTokenTo[line];
        if (start == end) return null;
        int pieces = 0, chars = 0;
        for (int p = f.tokenPieceFrom[start]; p < f.tokenPieceTo[end - 1]; p++) {
            if (!includeCjk && f.pieceCjk[p]) continue;
            pieces++;
            chars += f.pieceTo[p] - f.pieceFrom[p];
        }
        return pieces == 0 ? null : new GlowSpec(f, line, params, deriver, includeCjk, pieces, chars);
    }

    private Font[] copyTokens(PaintFrame f, int line, TokenColorDeriver deriver, boolean includeCjk) {
        Font[] table = new Font[Math.min(f.fontCount, pieceEnd.length)];
        int used = 0, i = 0;
        for (int t = f.lineTokenFrom[line]; t < f.lineTokenTo[line]; t++) {
            TokenColors colors = deriver.derive(f.tokenColor[t], f.tokenPunctuation[t]);
            int outer = params.classic() && !params.light() ? colors.base().getRGB() : colors.glowFar().getRGB();
            for (int p = f.tokenPieceFrom[t]; p < f.tokenPieceTo[t]; p++) {
                if (!includeCjk && f.pieceCjk[p]) continue;
                Font typeface = f.fonts[f.pieceFont[p]];
                int slot = 0;
                while (slot < used && table[slot] != typeface) slot++;
                if (slot == used) table[used++] = typeface;
                font[i] = slot;
                near[i] = colors.glowNear().getRGB();
                mid[i] = colors.glowMid().getRGB();
                far[i] = outer;
                punctuation[i] = f.tokenPunctuation[t];
                copyPiece(f, p, i++);
            }
        }
        return Arrays.copyOf(table, used);
    }

    private void copyPiece(PaintFrame f, int p, int i) {
        int cursor = i == 0 ? 0 : pieceEnd[i - 1];
        int from = f.pieceFrom[p], length = f.pieceTo[p] - from;
        System.arraycopy(f.chars, from, text, cursor, length);
        System.arraycopy(f.charX, from, glyphX, cursor, length);
        if (cells != null) System.arraycopy(f.charCell, from, cells, cursor, length);
        pieceEnd[i] = cursor + length;
        x[i] = f.pieceX[p];
        width[i] = f.pieceWidth[p];
        nativeRisk[i] = f.pieceNativeRisk[p];
        gridAligned[i] = f.pieceGridAligned[p];
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
