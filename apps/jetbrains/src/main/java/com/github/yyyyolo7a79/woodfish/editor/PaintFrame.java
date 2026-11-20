package com.github.yyyyolo7a79.woodfish.editor;

import java.awt.Color;
import java.awt.Font;
import java.awt.Rectangle;
import java.util.Arrays;

/**
 * 一次绘制要处理的文字布局快照：视觉行 → token（同色同字形的一段，对应原版一个 span）→ piece
 * （实际绘制单元：不含空白、同一字体、中间没有 inlay 的一段文字）。
 *
 * <p>结构数组 + 复用缓冲，每帧不按 token 分配对象：光标每 500ms 闪烁一次就会触发小区域重绘，
 * 这里的开销会被反复支付。
 *
 * <p>同一次 EditorPainter 会话里，发光（文字之前）与渐变（文字之后）两个渲染器拿到的是同一个
 * Graphics 对象：{@link #session} 记下它，后到的渲染器直接复用本帧，不重复扫描。
 *
 * <p>只在 EDT 上使用；交给后台线程的数据必须先拷贝成不可变对象（见 {@link GlowSpec}）。
 */
final class PaintFrame {

    static final byte SELECTION_NONE = 0;
    static final byte SELECTION_PARTIAL = 1;
    static final byte SELECTION_FULL = 2;

    // ===== 会话 =====
    Object session;
    final Rectangle clip = new Rectangle();
    int padUser;
    boolean collectedSelection;

    // ===== 行级公共度量（用户空间像素） =====
    int lineHeight;
    int ascent;

    // ===== 文本：chars[i] 对应文档偏移 textBase + i =====
    int textBase;
    char[] chars = new char[4096];
    int charCount;
    /**
     * 编辑器画 chars[i] 的 x（内容区绝对坐标，用户空间），只对 piece 内的字符有效。按编辑器
     * SimpleTextFragment 的方式从 piece 起点累加 {@code FontInfo.charWidth2D}；字符网格模式下改按格宽累加，
     * 字宽与格宽不符的字再加上居中偏移（见 {@link EditorGrid}）
     */
    float[] charX = new float[4096];
    /** 字符网格模式下 chars[i] 占的格宽（只在 {@link #gridUnit} > 0 时有效） */
    float[] charCell = new float[4096];
    /** 本帧编辑器的字符网格单格宽；0 = 不在网格模式 */
    float gridUnit;

    // ===== 视觉行 =====
    int lineCount;
    int[] lineTop = new int[64];
    int[] lineStart = new int[64];
    int[] lineTokenFrom = new int[64];
    int[] lineTokenTo = new int[64];

    // ===== token =====
    int tokenCount;
    Color[] tokenColor = new Color[256];
    boolean[] tokenPunctuation = new boolean[256];
    /** 去掉首尾空白后的逻辑左右边界（不含原版 0.12em 的外扩） */
    float[] tokenX0 = new float[256];
    float[] tokenX1 = new float[256];
    /** 渐变盒子的上下边界：字体 ascent / descent 再外扩 0.08em（原版 padding-block） */
    float[] tokenTop = new float[256];
    float[] tokenBottom = new float[256];
    float[] tokenEm = new float[256];
    int[] tokenPieceFrom = new int[256];
    int[] tokenPieceTo = new int[256];

    // ===== piece =====
    int pieceCount;
    /** chars 下标 [from, to) */
    int[] pieceFrom = new int[512];
    int[] pieceTo = new int[512];
    float[] pieceX = new float[512];
    float[] pieceWidth = new float[512];
    int[] pieceFont = new int[512];
    byte[] pieceSelection = new byte[512];
    /** 含中日韩文字（由 {@link #addPiece} 计算） */
    boolean[] pieceCjk = new boolean[512];
    /**
     * 在编辑器的抗锯齿设置下不能用灰度字形缓存原样重画（见 {@link NativeGlyphs}）：渐变改用逐字纯色，
     * 发光改按 {@link #charX} 逐字定位。由 FrameScanner 设置，默认 false
     */
    boolean[] pieceNativeRisk = new boolean[512];
    /**
     * 字符网格模式下有字被挪进格子居中（不需要复杂排版的 piece）：编辑器逐字画在 {@link #charX}，
     * 整段 drawString 会按字形步进排字、与编辑器错开。由 FrameScanner 设置，默认 false
     */
    boolean[] pieceGridAligned = new boolean[512];

    // ===== 字体表（同一帧内按身份去重） =====
    Font[] fonts = new Font[8];
    int fontCount;

    // ===== 选区（仅当配色方案定义了选区前景色时收集；按起点升序、互不重叠） =====
    int selectionCount;
    int[] selectionStart = new int[8];
    int[] selectionEnd = new int[8];

    boolean isSession(Object graphics, Rectangle clipBounds, int requiredPad, boolean needSelection) {
        return session == graphics && clip.equals(clipBounds) && padUser >= requiredPad
                && (collectedSelection || !needSelection);
    }

    void begin(Object graphics, Rectangle clipBounds, int pad, boolean selection) {
        session = graphics;
        clip.setBounds(clipBounds);
        padUser = pad;
        collectedSelection = selection;
        lineCount = 0;
        Arrays.fill(tokenColor, 0, tokenCount, null);
        tokenCount = 0;
        pieceCount = 0;
        Arrays.fill(fonts, 0, fontCount, null);
        fontCount = 0;
        selectionCount = 0;
        charCount = 0;
        gridUnit = 0;
    }

    /** 帧用完后放开对 Graphics 与颜色、字体对象的引用（它们可能属于已切换的配色方案） */
    void end() {
        session = null;
    }

    void clearAll() {
        begin(null, new Rectangle(), 0, false);
        session = null;
    }

    void setText(int base, int length) {
        textBase = base;
        if (chars.length < length) {
            chars = new char[Math.max(length, chars.length * 2)];
            charX = new float[chars.length];
            charCell = new float[chars.length];
        }
        charCount = length;
    }

    /** 字符网格模式下逐字的格宽（下标同 chars）；不在网格模式时为 null */
    float[] gridCells() {
        return gridUnit > 0 ? charCell : null;
    }

    int addLine(int top, int startOffset) {
        if (lineCount == lineTop.length) {
            int n = lineCount * 2;
            lineTop = Arrays.copyOf(lineTop, n);
            lineStart = Arrays.copyOf(lineStart, n);
            lineTokenFrom = Arrays.copyOf(lineTokenFrom, n);
            lineTokenTo = Arrays.copyOf(lineTokenTo, n);
        }
        int line = lineCount++;
        lineTop[line] = top;
        lineStart[line] = startOffset;
        lineTokenFrom[line] = tokenCount;
        lineTokenTo[line] = tokenCount;
        return line;
    }

    void endLine(int line) {
        lineTokenTo[line] = tokenCount;
    }

    int addToken(Color color, boolean punctuation, float top, float bottom, float em) {
        if (tokenCount == tokenColor.length) {
            int n = tokenCount * 2;
            tokenColor = Arrays.copyOf(tokenColor, n);
            tokenPunctuation = Arrays.copyOf(tokenPunctuation, n);
            tokenX0 = Arrays.copyOf(tokenX0, n);
            tokenX1 = Arrays.copyOf(tokenX1, n);
            tokenTop = Arrays.copyOf(tokenTop, n);
            tokenBottom = Arrays.copyOf(tokenBottom, n);
            tokenEm = Arrays.copyOf(tokenEm, n);
            tokenPieceFrom = Arrays.copyOf(tokenPieceFrom, n);
            tokenPieceTo = Arrays.copyOf(tokenPieceTo, n);
        }
        int token = tokenCount++;
        tokenColor[token] = color;
        tokenPunctuation[token] = punctuation;
        tokenTop[token] = top;
        tokenBottom[token] = bottom;
        tokenEm[token] = em;
        tokenPieceFrom[token] = pieceCount;
        tokenPieceTo[token] = pieceCount;
        return token;
    }

    /** 收尾一个 token；没有任何 piece 时撤销它（只可能撤销最后一个） */
    void endToken(int token, float x0, float x1) {
        tokenPieceTo[token] = pieceCount;
        if (tokenPieceFrom[token] == pieceCount) {
            tokenColor[token] = null;
            tokenCount = token;
            return;
        }
        tokenX0[token] = x0;
        tokenX1[token] = x1;
    }

    /** 追加一个 piece 并返回其下标；pieceCjk 在这里算，pieceNativeRisk / pieceGridAligned 由调用方按需设置 */
    int addPiece(int from, int to, float x, float width, int font, byte selection) {
        if (pieceCount == pieceFrom.length) {
            int n = pieceCount * 2;
            pieceFrom = Arrays.copyOf(pieceFrom, n);
            pieceTo = Arrays.copyOf(pieceTo, n);
            pieceX = Arrays.copyOf(pieceX, n);
            pieceWidth = Arrays.copyOf(pieceWidth, n);
            pieceFont = Arrays.copyOf(pieceFont, n);
            pieceSelection = Arrays.copyOf(pieceSelection, n);
            pieceCjk = Arrays.copyOf(pieceCjk, n);
            pieceNativeRisk = Arrays.copyOf(pieceNativeRisk, n);
            pieceGridAligned = Arrays.copyOf(pieceGridAligned, n);
        }
        int piece = pieceCount++;
        pieceFrom[piece] = from;
        pieceTo[piece] = to;
        pieceX[piece] = x;
        pieceWidth[piece] = width;
        pieceFont[piece] = font;
        pieceSelection[piece] = selection;
        pieceCjk[piece] = TextPieces.containsCjk(chars, from, to);
        pieceNativeRisk[piece] = false;
        pieceGridAligned[piece] = false;
        return piece;
    }

    int fontIndex(Font font) {
        for (int i = 0; i < fontCount; i++) {
            if (fonts[i] == font) {
                return i;
            }
        }
        if (fontCount == fonts.length) {
            fonts = Arrays.copyOf(fonts, fontCount * 2);
        }
        fonts[fontCount] = font;
        return fontCount++;
    }

    void addSelection(int start, int end) {
        if (selectionCount == selectionStart.length) {
            selectionStart = Arrays.copyOf(selectionStart, selectionCount * 2);
            selectionEnd = Arrays.copyOf(selectionEnd, selectionCount * 2);
        }
        selectionStart[selectionCount] = start;
        selectionEnd[selectionCount] = end;
        selectionCount++;
    }

    /** 文档区间 [start, end) 与选区的关系（选区按起点升序、互不重叠） */
    byte selectionState(int start, int end) {
        if (selectionCount == 0) {
            return SELECTION_NONE;
        }
        // 第一个终点 > start 的选区
        int lo = 0;
        int hi = selectionCount;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (selectionEnd[mid] <= start) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        if (lo == selectionCount || selectionStart[lo] >= end) {
            return SELECTION_NONE;
        }
        return selectionStart[lo] <= start && selectionEnd[lo] >= end ? SELECTION_FULL : SELECTION_PARTIAL;
    }
}
