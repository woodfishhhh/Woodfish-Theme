package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.color.TextClassifier;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.FoldRegion;
import com.intellij.openapi.editor.Inlay;
import com.intellij.openapi.editor.VisualPosition;
import com.intellij.openapi.editor.colors.FontPreferences;
import com.intellij.openapi.editor.ex.EditorEx;
import com.intellij.openapi.editor.ex.FoldingModelEx;
import com.intellij.openapi.editor.impl.ComplementaryFontsRegistry;
import com.intellij.openapi.editor.impl.FontFallbackIterator;
import com.intellij.openapi.editor.impl.FontInfo;
import com.intellij.util.DocumentUtil;
import org.jetbrains.annotations.NotNull;

import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.awt.geom.Point2D;
import java.text.Bidi;
import java.util.Arrays;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;

/**
 * 把 clip 覆盖的视觉行扫描成 {@link PaintFrame}：每段文字的最终颜色、字体、x 坐标与跳过规则。
 *
 * <p>正确性要点（对照 243 的 EditorPainter / LineLayout / IterationState）：
 * <ul>
 *   <li>颜色：见 {@link TokenRunCollector} / {@link RunMerger}。高亮器的查询范围按平台为每个视觉行新建
 *       IterationState 的方式划分：软换行续行从前一个码点开始，折叠区之后从折叠终点开始</li>
 *   <li>字体：与 LineLayout 一样用 {@link FontFallbackIterator}（配色方案的字体偏好 + 字体样式 +
 *       绘制用的 FontRenderContext），CJK 等由回退字体显示的字符也拿到与编辑器相同的 FontInfo。
 *       每个 piece 另记 {@code pieceNativeRisk}：LCD 抗锯齿下回退字体与系统字体由原生光栅化，
 *       插件不能用灰度缓存重画它们（见 {@link NativeGlyphs}），渲染器据此改走逐字纯色 / 逐字定位</li>
 *   <li>x 坐标：一律取编辑器的 {@code offsetToPoint2D(offset, true, false)}，leanForward = true 落在
 *       同一偏移处 inline inlay 的右侧（即该字符真正的起点），beforeSoftWrap = false 落在软换行后的新行上；
 *       inlay 所在偏移处把 token 切开，片段内部的字形位置交给与编辑器相同的排版，保证逐像素重合。
 *       piece 内逐字的位置照 SimpleTextFragment 累加 {@code charWidth2D}，记在 {@code PaintFrame.charX}；
 *       字符网格模式（{@link EditorGrid}，如含中文的 Markdown 表格）下改按格宽累加，字宽与格宽不符的字在格子里居中</li>
 *   <li>y：行顶来自 {@code visualLineToY}（已计入上方的 block inlay），基线 = 行顶 + {@code getAscent()}，
 *       与 EditorPainter 画字用的 {@code y + myAscent} 相同</li>
 * </ul>
 *
 * <p>跳过而不是画错：折叠区与占位符、空白与 Tab、控制 / 格式字符、代理对（emoji 等）、需要双向排版的
 * 行（从右到左文字）。超长行只扫 clip 左右附近的一段，避免逐片段换算坐标的代价随行长平方增长。
 *
 * <p>只在 EDT 的绘制过程中使用。
 */
final class FrameScanner {

    /** 单帧最多处理的视觉行：截图类插件可能用超高 clip 绘制整篇文档 */
    static final int MAX_LINES = 400;
    /** 单帧最多的绘制单元，防止病态文件（超长压缩行）拖慢 EDT */
    static final int MAX_PIECES = 20_000;
    /** 超过这个长度的视觉行只扫描 clip 水平范围附近 */
    static final int LONG_LINE = 512;

    private final EditorEx editor;
    private final PaintFrame frame = new PaintFrame();
    private final TokenRunCollector collector = new TokenRunCollector();
    private final RunMerger.Runs runs = new RunMerger.Runs();
    private final FontFallbackIterator fallback = new FontFallbackIterator();
    private final FontInfo[] primaryFonts = new FontInfo[4];

    // ===== 每帧临时状态 =====
    private FontRenderContext frc;
    private Object textAntialiasing;
    private FontPreferences preferences;
    private int foldCount;
    private int[] foldStart = new int[16];
    private int[] foldEnd = new int[16];
    private int foldCursor;
    private int inlayCount;
    private int[] inlayOffsets = new int[16];

    // ===== 跨帧缓存：字体能否用灰度缓存原样重画（FRC 变化时作废） =====
    private static final int MAX_FONT_CHECKS = 256;
    private final Map<java.awt.Font, Boolean> grayscaleSafe = new IdentityHashMap<>();
    private FontRenderContext lastFrc;
    private FontRenderContext probeContext;

    // ===== 每行临时状态 =====
    private int lineTop;
    private int windowStart;
    private int windowEnd;
    private boolean longLine;

    FrameScanner(@NotNull EditorEx editor) {
        this.editor = editor;
    }

    /**
     * 扫描 clip 上下各外扩 {@code padUser} 的视觉行；同一绘制会话内重复调用直接返回上次的结果。
     *
     * @param selection 是否收集选区（只有配色方案定义了选区前景色时，渐变才需要跳过选中文字）
     */
    PaintFrame scan(@NotNull Graphics2D g, @NotNull Rectangle clip, int padUser, boolean selection) {
        if (frame.isSession(g, clip, padUser, selection)) {
            return frame;
        }
        frame.begin(g, clip, padUser, selection);
        try {
            fill(g, clip, padUser, selection);
        } catch (RuntimeException | Error e) {
            frame.end(); // 半成品不能留给同一会话里的另一个渲染器复用
            throw e;
        } finally {
            collector.release();
            Arrays.fill(primaryFonts, null);
            frc = null;
            textAntialiasing = null;
            preferences = null;
        }
        return frame;
    }

    /** 本次绘制会话结束：下一次调用 scan 必定重新扫描，也放开对 Graphics 的引用 */
    void endSession() {
        frame.end();
    }

    void dispose() {
        frame.clearAll();
        collector.release();
        grayscaleSafe.clear();
        lastFrc = null;
        probeContext = null;
    }

    private void fill(Graphics2D g, Rectangle clip, int padUser, boolean selection) {
        Document document = editor.getDocument();
        int length = document.getTextLength();
        frame.lineHeight = editor.getLineHeight();
        frame.ascent = editor.getAscent();
        if (length == 0) {
            return;
        }

        int yFrom = Math.max(0, clip.y - padUser);
        int yTo = clip.y + clip.height + padUser;
        int lastLine = editor.offsetToVisualLine(length, false);
        int first = editor.yToVisualLine(yFrom);
        int last = Math.min(lastLine, editor.yToVisualLine(Math.max(yFrom, yTo - 1)));
        if (first > last) {
            return;
        }
        last = Math.min(last, first + MAX_LINES - 1);

        int rangeStart = visualLineStart(first);
        int rangeEnd = last < lastLine ? visualLineStart(last + 1) : length;
        if (rangeEnd <= rangeStart) {
            return;
        }

        frc = g.getFontRenderContext();
        // 取 FRC 里已解析的值：Graphics 上的提示可能是 DEFAULT（随 KEY_ANTIALIASING），FRC 给出实际生效的模式
        textAntialiasing = frc.getAntiAliasingHint();
        updateProbeContext();
        preferences = editor.getColorsScheme().getFontPreferences();
        collectFolds(rangeStart, rangeEnd);
        if (selection) {
            collectSelection(rangeStart, rangeEnd);
        }

        collectLines(first, last, rangeStart, rangeEnd, clip, padUser);
    }

    private void collectLines(int first, int last, int rangeStart, int rangeEnd, Rectangle clip, int padUser) {
        int lineStart = rangeStart;
        for (int visualLine = first; visualLine <= last; visualLine++) {
            int lineEnd = visualLine < last ? visualLineStart(visualLine + 1) : rangeEnd;
            int top = editor.visualLineToY(visualLine);
            int line = frame.addLine(top, lineStart);
            if (lineEnd > lineStart && frame.pieceCount < MAX_PIECES) {
                scanLine(top, lineStart, lineEnd, clip, padUser);
            }
            frame.endLine(line);
            lineStart = lineEnd;
        }
    }

    private int visualLineStart(int visualLine) {
        return editor.visualPositionToOffset(new VisualPosition(visualLine, 0));
    }

    // ==================== 帧级输入 ====================

    private void collectFolds(int rangeStart, int rangeEnd) {
        foldCount = 0;
        foldCursor = 0;
        FoldingModelEx folding = editor.getFoldingModel();
        FoldRegion[] collapsed = folding.fetchTopLevel(); // 顶层折叠区，按偏移排序
        if (collapsed == null) {
            return;
        }
        int from = Math.max(0, folding.getLastCollapsedRegionBefore(rangeStart) + 1);
        for (int i = from; i < collapsed.length; i++) {
            FoldRegion region = collapsed[i];
            if (!region.isValid() || region.isExpanded()) {
                continue;
            }
            if (region.getStartOffset() >= rangeEnd) {
                break;
            }
            if (region.getEndOffset() <= rangeStart) {
                continue;
            }
            if (foldCount == foldStart.length) {
                foldStart = Arrays.copyOf(foldStart, foldCount * 2);
                foldEnd = Arrays.copyOf(foldEnd, foldCount * 2);
            }
            foldStart[foldCount] = region.getStartOffset();
            foldEnd[foldCount] = region.getEndOffset();
            foldCount++;
        }
    }

    private void collectInlays(int rangeStart, int rangeEnd) {
        inlayCount = 0;
        List<Inlay<?>> inlays = editor.getInlayModel().getInlineElementsInRange(rangeStart, rangeEnd);
        for (Inlay<?> inlay : inlays) {
            if (inlayCount == inlayOffsets.length) {
                inlayOffsets = Arrays.copyOf(inlayOffsets, inlayCount * 2);
            }
            inlayOffsets[inlayCount++] = inlay.getOffset();
        }
        Arrays.sort(inlayOffsets, 0, inlayCount);
    }

    private void collectSelection(int rangeStart, int rangeEnd) {
        int[] starts = editor.getSelectionModel().getBlockSelectionStarts();
        int[] ends = editor.getSelectionModel().getBlockSelectionEnds();
        int n = Math.min(starts.length, ends.length);
        long[] packed = new long[n];
        int count = 0;
        for (int i = 0; i < n; i++) {
            if (ends[i] > starts[i] && ends[i] > rangeStart && starts[i] < rangeEnd) {
                packed[count++] = (long) starts[i] << 32 | ends[i];
            }
        }
        Arrays.sort(packed, 0, count);
        for (int i = 0; i < count; i++) {
            frame.addSelection((int) (packed[i] >>> 32), (int) packed[i]);
        }
    }

    // ==================== 行 ====================

    private void scanLine(int top, int lineStart, int lineEnd, Rectangle clip, int padUser) {
        lineTop = top;
        windowStart = lineStart;
        windowEnd = lineEnd;
        longLine = lineEnd - lineStart > LONG_LINE;
        if (longLine) {
            windowStart = Math.max(lineStart, offsetAtX(clip.x - padUser, top) - 1);
            windowEnd = Math.min(lineEnd, offsetAtX(clip.x + clip.width + padUser, top) + 2);
        }

        // 平台为软换行续行新建 IterationState 时从前一个码点开始查询高亮器，这里保持一致
        boolean softWrapped = lineStart > 0 && editor.getSoftWrapModel().getSoftWrap(lineStart) != null;
        int queryStart = softWrapped ? DocumentUtil.getPreviousCodePointOffset(editor.getDocument(), lineStart) : lineStart;
        while (foldCursor < foldCount && foldEnd[foldCursor] <= lineStart) foldCursor++;
        visibleSpans(lineStart, lineEnd, queryStart, foldStart, foldEnd, foldCursor, foldCount, this::scanVisible);
    }

    interface Span { void accept(int start, int end, int queryStart); }

    static void visibleSpans(int start, int end, int queryStart, int[] starts, int[] ends, int fold, int count, Span visit) {
        while (fold < count && starts[fold] < end) {
            if (starts[fold] > start) visit.accept(start, starts[fold], queryStart);
            start = Math.max(start, ends[fold++]);
            queryStart = start;
        }
        if (start < end) visit.accept(start, end, queryStart);
    }

    private void scanVisible(int spanStart, int spanEnd, int queryStart) {
        int start = Math.max(windowStart, spanStart), stop = Math.min(windowEnd, spanEnd);
        if (start >= stop || frame.charCount == PaintFrame.MAX_CHARS) return;
        int end = frame.appendVisible(editor.getDocument().getImmutableCharSequence(), start, stop);
        if (Bidi.requiresBidi(frame.chars, start - frame.textBase, end - frame.textBase)) return;
        collector.collect(editor, queryStart, spanStart, spanEnd, start, end, longLine, runs);
        collectInlays(runs.start[0], runs.end[runs.count - 1]);
        for (int r = 0; r < runs.count && frame.pieceCount < MAX_PIECES; r++) {
            splitAtInlays(runs.start[r], runs.end[r], runs.foreground[r], runs.font[r]);
        }
    }

    private int offsetAtX(int x, int y) {
        return editor.visualPositionToOffset(editor.xyToVisualPosition(new Point2D.Double(Math.max(0, x), y)));
    }

    /** inline inlay 把 token 切开：原版里注入文字同样会把 span 一分为二 */
    private void splitAtInlays(int start, int end, java.awt.Color color, int fontType) {
        int i = Arrays.binarySearch(inlayOffsets, 0, inlayCount, start + 1);
        if (i < 0) {
            i = -i - 1;
        }
        int s = start;
        while (i < inlayCount && inlayOffsets[i] < end) {
            if (inlayOffsets[i] > s) {
                addToken(s, inlayOffsets[i], color, fontType);
                s = inlayOffsets[i];
            }
            i++;
        }
        addToken(s, end, color, fontType);
    }

    // ==================== token 与 piece ====================

    private void addToken(int start, int end, java.awt.Color color, int fontType) {
        int base = frame.textBase;
        char[] chars = frame.chars;
        int from = Math.max(start, windowStart);
        int to = Math.min(end, base + frame.charCount);
        while (from < to && !isDrawable(chars[from - base])) from++;
        while (to > from && !isDrawable(chars[to - 1 - base])) to--;
        if (from >= to) return;
        CharSequence document = editor.getDocument().getImmutableCharSequence();
        while (start < from && !isDrawable(document.charAt(start))) start++;
        while (end > to && !isDrawable(document.charAt(end - 1))) end--;

        FontInfo primary = primaryFont(fontType);
        FontMetrics metrics = primary.fontMetrics();
        float em = primary.getSize2D();
        float baseline = lineTop + frame.ascent;
        boolean punctuation = TextClassifier.isPunctuationOnly(document, start, end);
        int token = frame.addToken(color, punctuation,
                baseline - metrics.getAscent() - 0.08f * em, baseline + metrics.getDescent() + 0.08f * em, em);

        int i = from;
        while (i < to && frame.pieceCount < MAX_PIECES) {
            while (i < to && !isDrawable(chars[i - base])) {
                i += Character.isHighSurrogate(chars[i - base]) ? 2 : 1;
            }
            int word = i;
            while (i < to && isDrawable(chars[i - base])) {
                i++;
            }
            if (i > word) {
                addWord(word, Math.min(i, to), fontType, primary);
            }
        }

        int firstPiece = frame.tokenPieceFrom[token];
        if (firstPiece == frame.pieceCount) {
            frame.endToken(token, 0, 0);
            return;
        }
        int lastPiece = frame.pieceCount - 1;
        // 被水平窗口截断的 token 用编辑器换算真实边界，渐变几何才不会随横向滚动漂移
        float x0 = start < from ? xOf(start, true) : frame.pieceX[firstPiece];
        float x1 = end > to ? xOf(end, false) : frame.pieceX[lastPiece] + frame.pieceWidth[lastPiece];
        frame.endToken(token, x0, x1);
    }

    private void addWord(int start, int end, int fontType, FontInfo primary) {
        int base = frame.textBase;
        char[] chars = frame.chars;
        boolean ascii = true;
        for (int i = start; i < end; i++) {
            if (chars[i - base] >= 0x80) {
                ascii = false;
                break;
            }
        }
        if (ascii) {
            // 码点 < 128 时 ComplementaryFontsRegistry 总是返回首选字体，省去逐字符查询
            addPiece(start, end, primary);
            return;
        }
        fallback.setPreferredFonts(preferences).setFontStyle(fontType).setFontRenderContext(frc);
        fallback.start(chars, start - base, end - base);
        while (!fallback.atEnd()) {
            addPiece(base + fallback.getStart(), base + fallback.getEnd(), fallback.getFontInfo());
            fallback.advance();
        }
    }

    private void addPiece(int start, int end, FontInfo font) {
        Point2D first = editor.offsetToPoint2D(start, true, false);
        Point2D last = editor.offsetToPoint2D(end, false, true);
        if ((int) first.getY() != lineTop || (int) last.getY() != lineTop) return;
        float x = (float) first.getX();
        float actualWidth = (float) last.getX() - x;
        if (actualWidth <= 0) return;
        int base = frame.textBase;
        int from = start - base, to = end - base;
        for (int i = from; i < to; i++) frame.charCell[i] = font.charWidth2D(frame.chars[i]);
        int fit = EditorGrid.fit(from, to, x, frame.charX, frame.charCell, index -> xOf(base + index, false));
        if (fit < 0) return;
        boolean adjusted = fit > 0;
        int piece = frame.addPiece(from, to, x, actualWidth, frame.fontIndex(font.getFont()), frame.selectionState(start, end));
        frame.pieceNativeRisk[piece] = nativeRisk(frame.pieceCjk[piece], font.getFont());
        frame.pieceGridAligned[piece] = adjusted;
        frame.hasMeasuredCells |= adjusted;
    }

    /**
     * 这个 piece 在编辑器的抗锯齿设置下能否用灰度字形缓存原样重画（见 {@link NativeGlyphs}）。
     * 编辑器本身就用灰度时恒为安全；中日韩恒有风险；其余按字体判定一次后缓存到 FRC 变化为止。
     */
    private boolean nativeRisk(boolean cjk, java.awt.Font font) {
        if (NativeGlyphs.isGrayscale(textAntialiasing)) {
            return false;
        }
        if (cjk || probeContext == null) {
            return true;
        }
        Boolean safe = grayscaleSafe.get(font);
        if (safe == null) {
            if (grayscaleSafe.size() >= MAX_FONT_CHECKS) {
                grayscaleSafe.clear();
            }
            safe = NativeGlyphs.grayscaleMatches(font, probeContext);
            grayscaleSafe.put(font, safe);
        }
        return !safe;
    }

    /**
     * 本帧用于判定字体的 FRC：画字 FRC 去掉平移（编辑器滚动后带平移，步进与平移无关）。
     * 只在画字 FRC 变化时重建，并作废按字体缓存的判定结果。
     */
    private void updateProbeContext() {
        if (frc.equals(lastFrc)) {
            return;
        }
        lastFrc = frc;
        grayscaleSafe.clear();
        AffineTransform t = frc.getTransform();
        try {
            probeContext = new FontRenderContext(new AffineTransform(t.getScaleX(), t.getShearY(),
                    t.getShearX(), t.getScaleY(), 0, 0), textAntialiasing, frc.getFractionalMetricsHint());
        } catch (IllegalArgumentException e) {
            probeContext = null; // 非标准的抗锯齿提示：一律按有风险处理
        }
    }

    private float xOf(int offset, boolean leanForward) {
        return (float) editor.offsetToPoint2D(offset, leanForward, !leanForward).getX();
    }

    private FontInfo primaryFont(int fontType) {
        int style = fontType & 3;
        FontInfo info = primaryFonts[style];
        if (info == null) {
            info = ComplementaryFontsRegistry.getFontAbleToDisplay('a', style, preferences, frc);
            primaryFonts[style] = info;
        }
        return info;
    }

    /**
     * 我们会重画的字符：排除空白、控制字符、格式字符（零宽空格、BOM、ZWJ……编辑器可能把它们画成
     * 特殊符号）与代理对（emoji 等多为彩色字形，叠渐变没有意义）。
     */
    static boolean isDrawable(char c) {
        if (c <= ' ' || c == '\u007F') {
            return false;
        }
        if (c < 0x80) {
            return true;
        }
        if (c <= '\u009F' || Character.isSurrogate(c) || Character.isSpaceChar(c)) {
            return false;
        }
        return Character.getType(c) != Character.FORMAT;
    }

}
