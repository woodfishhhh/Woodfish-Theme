package com.github.yyyyolo7a79.woodfish.editor;

import com.intellij.openapi.editor.*;
import com.intellij.openapi.editor.colors.EditorColorsScheme;
import com.intellij.openapi.editor.impl.FontInfo;
import com.intellij.openapi.editor.ex.*;
import com.intellij.openapi.editor.highlighter.*;
import com.intellij.openapi.editor.markup.*;
import com.intellij.util.Processor;
import org.junit.jupiter.api.Test;

import java.awt.*;
import java.awt.geom.Point2D;
import java.awt.image.BufferedImage;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.function.BiFunction;
import static org.junit.jupiter.api.Assertions.*;

/** Real scanner, a single visual line with deterministic editor coordinates. */
class FrameScannerTest {
    private CharSequence text = "a".repeat(1000);
    private int split;
    private int highlightStart = -1;
    private boolean folded;
    private long stamp;

    @Test void clippedRepaintKeepsLineHighlighterAtOtherEndOfLine() throws Exception {
        highlightStart = 0;
        var frame = scan(new FrameScanner(editor()), 4720, 4960);
        assertEquals(1, frame.tokenCount);
        assertEquals(Color.RED, frame.tokenColor[0]);
        assertEquals(Font.ITALIC, frame.fonts[frame.pieceFont[0]].getStyle());
        assertEquals(33, frame.charCount);
    }

    @Test void longTokenKeepsFullGradientEndpointsAcrossRepaints() throws Exception {
        for (int[] clip : List.of(new int[]{0, 8000}, new int[]{4712, 4976})) {
            var frame = scan(new FrameScanner(editor()), clip[0], clip[1]);
            assertEquals(1, frame.tokenCount);
            assertEquals(0, frame.tokenX0[0]);
            assertEquals(8000, frame.tokenX1[0]);
            assertEquals(clip[0] == 0 ? 1000 : 36, frame.charCount);
        }
    }

    @Test void foldedLineUsesHighlighterAfterFoldOnBothSides() throws Exception {
        folded = true;
        highlightStart = 800;
        var scanner = new FrameScanner(editor());
        var full = scan(scanner, 0, 4824);
        assertEquals(600, full.charCount);
        assertEquals(2, full.tokenCount);
        assertEquals(2, full.pieceCount);
        assertEquals(0, full.pieceX[0]);
        assertEquals(303 * 8, full.pieceX[1]);
        assertRedItalic(full);
        var narrow = scan(scanner, 400, 480);
        assertEquals(13, narrow.charCount);
        assertEquals(1, narrow.tokenCount);
        assertRedItalic(narrow);
    }

    private static void assertRedItalic(PaintFrame frame) {
        for (int i = 0; i < frame.tokenCount; i++) assertEquals(Color.RED, frame.tokenColor[i]);
        for (int i = 0; i < frame.pieceCount; i++) assertEquals(Font.ITALIC, frame.fonts[frame.pieceFont[i]].getStyle());
    }

    @Test void adjacentLexemesKeepMergedGradientAcrossClipsAndLineLengths() throws Exception {
        split = 250;
        for (int length : new int[]{512, 513, 1000}) {
            text = "a".repeat(length);
            var scanner = new FrameScanner(editor());
            assertGradient(scan(scanner, 0, length * 8), length, length * 8);
            if (length == 1000) assertGradient(scan(scanner, 4720, 4960), 33, 8000);
        }
    }

    private static void assertGradient(PaintFrame frame, int copied, int right) {
        assertEquals(copied, frame.charCount);
        assertEquals(1, frame.tokenCount);
        assertEquals(0, frame.tokenX0[0]);
        assertEquals(right, frame.tokenX1[0]);
    }

    @Test void longPunctuationClassificationIsReusedUntilDocumentChanges(org.junit.jupiter.api.TestReporter report) throws Exception {
        var counted = new CharSequence() {
            int reads;
            char last = '-';
            public int length() { return 4_000_000; }
            public char charAt(int i) { reads++; return i == length() - 1 ? last : '-'; }
            public CharSequence subSequence(int start, int end) { throw new AssertionError("unexpected copy"); }
        };
        text = counted;
        var scanner = new FrameScanner(editor());
        assertTrue(scan(scanner, 4720, 4960).tokenPunctuation[0]);
        int cold = counted.reads;
        assertTrue(cold >= text.length());
        counted.reads = 0;
        var warm = scan(scanner, 4720, 4960);
        assertTrue(warm.tokenPunctuation[0]);
        assertEquals(33, warm.charCount);
        int cached = counted.reads;
        assertTrue(cached <= 2 * warm.charCount, () -> "cached charAt calls: " + cached);
        counted.last = 'a';
        stamp++;
        counted.reads = 0;
        assertFalse(scan(scanner, 4720, 4960).tokenPunctuation[0]);
        assertTrue(counted.reads >= text.length());
        report.publishEntry("charAt (cold / cached / edited)", cold + " / " + cached + " / " + counted.reads);
    }

    private static PaintFrame scan(FrameScanner scanner, int left, int right) throws Exception {
        var g = new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB).createGraphics();
        // Supply the fonts normally resolved by the running IDE's application-level registry.
        var field = FrameScanner.class.getDeclaredField("primaryFonts");
        field.setAccessible(true);
        var fonts = (FontInfo[]) field.get(scanner);
        for (int style = 0; style < fonts.length; style++)
            fonts[style] = new FontInfo(new Font(Font.MONOSPACED, style, 13), 13, false, g.getFontRenderContext());
        try { return scanner.scan(g, new Rectangle(left, 0, right - left, 16), 0, false); }
        finally { scanner.endSession(); g.dispose(); }
    }

    private EditorEx editor() {
        var scheme = stub(EditorColorsScheme.class, (m, a) -> switch (m) {
            case "getDefaultForeground" -> Color.BLACK;
            case "getFontPreferences", "getAttributes" -> null;
            default -> throw new AssertionError(m);
        });
        var doc = stub(DocumentEx.class, (m, a) -> switch (m) {
            case "getTextLength" -> text.length();
            case "getCharsSequence", "getImmutableCharSequence" -> text;
            case "getModificationStamp" -> stamp;
            default -> throw new AssertionError(m);
        });
        var markup = markup(highlightStart);
        return stub(EditorEx.class, (m, a) -> switch (m) {
            case "getDocument" -> doc;
            case "getColorsScheme" -> scheme;
            case "getFilteredDocumentMarkupModel" -> markup;
            case "getMarkupModel" -> markup(-1);
            case "getHighlighter" -> stub(EditorHighlighter.class, (method, args) -> lexer((int) args[0]));
            case "getFoldingModel" -> stub(FoldingModelEx.class, (method, args) -> switch (method) {
                case "fetchTopLevel" -> folded ? new FoldRegion[]{fold()} : null;
                case "getLastCollapsedRegionBefore" -> -1;
                default -> throw new AssertionError(method);
            });
            case "getInlayModel" -> stub(InlayModel.class, (method, args) -> List.of());
            case "getLineHeight" -> 16;
            case "getAscent" -> 12;
            case "offsetToVisualLine", "yToVisualLine", "visualLineToY" -> 0;
            case "visualPositionToOffset" -> {
                int column = ((VisualPosition) a[0]).column;
                yield folded && column >= 303 ? column + 397 : column;
            }
            case "xyToVisualPosition" -> new VisualPosition(0, (int) ((Point2D) a[0]).getX() / 8);
            case "offsetToPoint2D" -> new Point2D.Double(((int) a[0] - (folded && (int) a[0] >= 700 ? 397 : 0)) * 8, 0);
            default -> throw new AssertionError(m);
        });
    }

    private static FoldRegion fold() {
        return stub(FoldRegion.class, (m, a) -> switch (m) {
            case "isValid" -> true;
            case "isExpanded" -> false;
            case "getStartOffset" -> 300;
            case "getEndOffset" -> 700;
            default -> throw new AssertionError(m);
        });
    }

    private HighlighterIterator lexer(int offset) {
        int[] start = {offset < split ? 0 : split};
        return stub(HighlighterIterator.class, (m, a) -> switch (m) {
            case "atEnd" -> start[0] >= text.length();
            case "getStart" -> start[0];
            case "getEnd" -> start[0] < split ? split : text.length();
            case "getTextAttributes" -> new TextAttributes(Color.BLUE, null, null, null, Font.PLAIN);
            case "advance" -> start[0] = start[0] < split ? split : text.length();
            default -> throw new AssertionError(m);
        });
    }

    @SuppressWarnings("unchecked")
    private MarkupModelEx markup(int at) {
        return stub(MarkupModelEx.class, (m, a) -> {
            if (!m.equals("processRangeHighlightersOverlappingWith")) throw new AssertionError(m);
            if (at >= 0 && (int) a[0] <= at + 4 && (int) a[1] >= at) ((Processor<RangeHighlighterEx>) a[2]).process(stub(RangeHighlighterEx.class, (name, args) -> switch (name) {
                case "getStartOffset" -> at;
                case "getEndOffset" -> at + 4;
                case "getAffectedAreaStartOffset" -> 0;
                case "getAffectedAreaEndOffset" -> text.length();
                case "getLayer" -> HighlighterLayer.ADDITIONAL_SYNTAX;
                case "getTargetArea" -> HighlighterTargetArea.LINES_IN_RANGE;
                case "getTextAttributes" -> new TextAttributes(Color.RED, null, null, null, Font.ITALIC);
                case "isValid" -> true;
                case "isAfterEndOfLine" -> false;
                case "getCustomRenderer" -> null;
                default -> throw new AssertionError(name);
            }));
            return true;
        });
    }

    private static <T> T stub(Class<T> type, BiFunction<String, Object[], Object> handler) {
        return type.cast(Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type},
                (proxy, method, args) -> handler.apply(method.getName(), args)));
    }
}
