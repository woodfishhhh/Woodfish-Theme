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
    private static final String TEXT = "a".repeat(1000);

    @Test void clippedRepaintKeepsLineHighlighterAtOtherEndOfLine() throws Exception {
        var frame = scan(true, 4720, 4960);
        assertEquals(1, frame.tokenCount);
        assertEquals(Color.RED, frame.tokenColor[0]);
        assertEquals(Font.ITALIC, frame.fonts[frame.pieceFont[0]].getStyle());
        assertEquals(33, frame.charCount);
    }

    @Test void longTokenKeepsFullGradientEndpointsAcrossRepaints() throws Exception {
        for (int[] clip : List.of(new int[]{0, 8000}, new int[]{4712, 4976})) {
            var frame = scan(false, clip[0], clip[1]);
            assertEquals(1, frame.tokenCount);
            assertEquals(0, frame.tokenX0[0]);
            assertEquals(8000, frame.tokenX1[0]);
            assertEquals(clip[0] == 0 ? 1000 : 36, frame.charCount);
        }
    }

    private static PaintFrame scan(boolean highlight, int left, int right) throws Exception {
        var editor = editor(highlight);
        var scanner = new FrameScanner(editor);
        var g = new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB).createGraphics();
        // Supply the fonts normally resolved by the running IDE's application-level registry.
        var field = FrameScanner.class.getDeclaredField("primaryFonts");
        field.setAccessible(true);
        var fonts = (FontInfo[]) field.get(scanner);
        for (int style = 0; style < fonts.length; style++)
            fonts[style] = new FontInfo(new Font(Font.MONOSPACED, style, 13), 13, false, g.getFontRenderContext());
        try { return scanner.scan(g, new Rectangle(left, 0, right - left, 16), 0, false); }
        finally { g.dispose(); }
    }

    private static EditorEx editor(boolean highlight) {
        var scheme = stub(EditorColorsScheme.class, (m, a) -> switch (m) {
            case "getDefaultForeground" -> Color.BLACK;
            case "getFontPreferences", "getAttributes" -> null;
            default -> throw new AssertionError(m);
        });
        var doc = stub(DocumentEx.class, (m, a) -> switch (m) {
            case "getTextLength" -> TEXT.length();
            case "getCharsSequence", "getImmutableCharSequence" -> TEXT;
            default -> throw new AssertionError(m);
        });
        var markup = markup(highlight);
        return stub(EditorEx.class, (m, a) -> switch (m) {
            case "getDocument" -> doc;
            case "getColorsScheme" -> scheme;
            case "getFilteredDocumentMarkupModel" -> markup;
            case "getMarkupModel" -> markup(false);
            case "getHighlighter" -> stub(EditorHighlighter.class, (method, args) -> lexer());
            case "getFoldingModel" -> stub(FoldingModelEx.class, (method, args) -> null);
            case "getInlayModel" -> stub(InlayModel.class, (method, args) -> List.of());
            case "getLineHeight" -> 16;
            case "getAscent" -> 12;
            case "offsetToVisualLine", "yToVisualLine", "visualLineToY" -> 0;
            case "visualPositionToOffset" -> ((VisualPosition) a[0]).column;
            case "xyToVisualPosition" -> new VisualPosition(0, (int) ((Point2D) a[0]).getX() / 8);
            case "offsetToPoint2D" -> new Point2D.Double((int) a[0] * 8, 0);
            default -> throw new AssertionError(m);
        });
    }

    private static HighlighterIterator lexer() {
        boolean[] end = {false};
        return stub(HighlighterIterator.class, (m, a) -> switch (m) {
            case "atEnd" -> end[0];
            case "getStart" -> 0;
            case "getEnd" -> TEXT.length();
            case "getTextAttributes" -> new TextAttributes(Color.BLUE, null, null, null, Font.PLAIN);
            case "advance" -> end[0] = true;
            default -> throw new AssertionError(m);
        });
    }

    @SuppressWarnings("unchecked")
    private static MarkupModelEx markup(boolean highlight) {
        return stub(MarkupModelEx.class, (m, a) -> {
            if (!m.equals("processRangeHighlightersOverlappingWith")) throw new AssertionError(m);
            if (highlight && (int) a[0] <= 4) ((Processor<RangeHighlighterEx>) a[2]).process(stub(RangeHighlighterEx.class, (name, args) -> switch (name) {
                case "getStartOffset", "getAffectedAreaStartOffset" -> 0;
                case "getEndOffset" -> 4;
                case "getAffectedAreaEndOffset" -> TEXT.length();
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
