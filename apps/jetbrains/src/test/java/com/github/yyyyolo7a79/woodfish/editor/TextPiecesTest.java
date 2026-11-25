package com.github.yyyyolo7a79.woodfish.editor;

import org.junit.jupiter.api.Test;

import java.awt.Font;
import java.awt.font.FontRenderContext;
import java.awt.font.GlyphVector;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** 字符网格模式下照 ComplexTextFragment 调整字形位置（{@link TextPieces#alignToGrid}） */
class TextPiecesTest {

    private static final Font FONT = new Font(Font.MONOSPACED, Font.PLAIN, 20);
    private static final FontRenderContext FRC = new FontRenderContext(null, true, true);
    private static final double EPS = 1e-4;

    @Test
    void cellsWithinToleranceKeepGlyphPositions() {
        char[] text = "abc".toCharArray();
        GlyphVector plain = TextPieces.layout(FONT, FRC, text, 0, 3, null);
        // 与字宽相差不到 0.001 视为相同：与编辑器一样不挪
        float[] cells = {advance(plain, 0), advance(plain, 1) + 0.0005f, advance(plain, 2)};

        GlyphVector grid = TextPieces.layout(FONT, FRC, text, 0, 3, cells);

        for (int i = 0; i <= 3; i++) {
            assertEquals(plain.getGlyphPosition(i).getX(), grid.getGlyphPosition(i).getX(), EPS);
        }
    }

    @Test
    void widerCellCentersTheGlyphAndPushesTheRest() {
        char[] text = "abc".toCharArray();
        GlyphVector plain = TextPieces.layout(FONT, FRC, text, 0, 3, null);
        float a0 = advance(plain, 0);
        float a1 = advance(plain, 1);
        float a2 = advance(plain, 2);

        GlyphVector grid = TextPieces.layout(FONT, FRC, text, 0, 3, new float[]{a0, 3 * a1, a2});

        assertEquals(0, grid.getGlyphPosition(0).getX(), EPS);
        // 第二个字的格子是 [a0, a0 + 3·a1)、字宽 a1：居中后起点在 a0 + a1
        assertEquals(a0 + a1, grid.getGlyphPosition(1).getX(), EPS);
        assertEquals(a0 + 3 * a1, grid.getGlyphPosition(2).getX(), EPS);
        assertEquals(a0 + 3 * a1 + a2, grid.getGlyphPosition(3).getX(), EPS);
    }

    @Test
    void narrowerCellMovesFollowingGlyphsWithoutCentering() {
        char[] text = "abc".toCharArray();
        GlyphVector plain = TextPieces.layout(FONT, FRC, text, 0, 3, null);
        float a0 = advance(plain, 0);
        float a1 = advance(plain, 1);
        float a2 = advance(plain, 2);

        GlyphVector grid = TextPieces.layout(FONT, FRC, text, 0, 3, new float[]{a0, a1 / 2, a2});

        // 步进变窄的字不居中（与 ComplexTextFragment 一致），后面的字跟着前移
        assertEquals(a0, grid.getGlyphPosition(1).getX(), EPS);
        assertEquals(a0 + a1 / 2, grid.getGlyphPosition(2).getX(), EPS);
        assertEquals(a0 + a1 / 2 + a2, grid.getGlyphPosition(3).getX(), EPS);
    }

    @Test
    void cellsAreIndexedFromTheStartOfTheRange() {
        char[] text = "xxabc".toCharArray();
        GlyphVector plain = TextPieces.layout(FONT, FRC, text, 2, 5, null);
        float a0 = advance(plain, 0);
        float a1 = advance(plain, 1);
        // 前两格属于别的 piece，不能被读到
        float[] cells = {99, 99, a0, 3 * a1, advance(plain, 2)};

        GlyphVector grid = TextPieces.layout(FONT, FRC, text, 2, 5, cells);

        assertEquals(a0 + a1, grid.getGlyphPosition(1).getX(), EPS);
        assertEquals(a0 + 3 * a1, grid.getGlyphPosition(2).getX(), EPS);
    }

    @Test void oneGlyphMayCoverTwoMeasuredCharacters() {
        var glyph = FONT.createGlyphVector(FRC, "f");
        double width = advance(glyph, 0);
        TextPieces.alignToGrid(glyph, new float[]{5, 25}, 0, 2);
        assertEquals(30, glyph.getGlyphPosition(1).getX(), EPS);
        assertEquals((30 - width) / 2, glyph.getGlyphPosition(0).getX(), EPS);
    }

    @Test void equalTextWithDifferentMeasuredCellsKeepsItsOwnGeometry() {
        var cache = new TextPieces.GlyphCache();
        char[] text = "ab".toCharArray();
        var narrow = cache.get(FONT, FRC, text, 0, 2, new float[]{8, 8});
        var wide = cache.get(FONT, FRC, text, 0, 2, new float[]{16, 8});
        assertEquals(16, narrow.getGlyphPosition(2).getX(), EPS);
        assertEquals(24, wide.getGlyphPosition(2).getX(), EPS);
    }

    @Test void publicBoundariesCenterCjkGlyphsAndRejectVisualDiscontinuities() {
        float[] origins = new float[3], widths = {0, 12, 12};
        double[] edges = {0, 10, 26, 42};
        assertEquals(1, EditorGrid.fit(1, 3, 10, origins, widths, i -> edges[i]));
        org.junit.jupiter.api.Assertions.assertArrayEquals(new float[]{0, 12, 28}, origins);
        org.junit.jupiter.api.Assertions.assertArrayEquals(new float[]{0, 16, 16}, widths);
        assertEquals(-1, EditorGrid.fit(1, 3, 10, origins, widths, i -> 0));
    }

    private static float advance(GlyphVector vector, int glyph) {
        return (float) (vector.getGlyphPosition(glyph + 1).getX() - vector.getGlyphPosition(glyph).getX());
    }

    @Test void classicBoldPreservesSemanticRedItalicOverLexicalBlue() {
        var merger = new RunMerger(100);
        merger.addLexeme(0, 3, java.awt.Color.BLUE, Font.PLAIN);
        merger.addHighlighter(0, 3, 0, 3, 3, 200, java.awt.Color.RED, Font.ITALIC, false, false, false);
        merger.addHighlighter(0, 3, 0, 3, 3, 0, null, Font.BOLD, false, false, true);
        merger.finishGathering(); var runs = new RunMerger.Runs();
        merger.merge(0, 3, 0, 3, java.awt.Color.BLACK, Font.PLAIN, runs);
        assertEquals(java.awt.Color.RED, runs.foreground[0]); assertEquals(Font.BOLD | Font.ITALIC, runs.font[0]);
    }

    @Test void equalTotalWidthsStillAlignInteriorCells() {
        float[] origins = new float[2], widths = {7, 9};
        assertEquals(1, EditorGrid.fit(0, 2, 0, origins, widths, i -> i * 8));
        assertEquals(.5, origins[0]); assertEquals(7.5, origins[1]);
    }

    @Test void clippedLongLineAndFoldUsePackedVisibleBuffer() {
        var frame = new PaintFrame(); String document = "hidden-left-ab" + "x".repeat(4_000_000) + "cd-hidden-right";
        int left = document.indexOf("ab"), foldEnd = document.indexOf("cd");
        FrameScanner.visibleSpans(left, foldEnd + 2, left, new int[]{left + 2}, new int[]{foldEnd}, 0, 1,
                (start, end, queryStart) -> frame.appendVisible(document, start, end));
        assertEquals("abcd", new String(frame.chars, 0, frame.charCount));
        assertEquals(foldEnd + 1, frame.textBase + 3);
        frame.appendVisible(document, 2, document.length());
        assertEquals(PaintFrame.MAX_CHARS, frame.chars.length); assertEquals(frame.chars.length, frame.charCount);
    }

    @Test void subscribesBeforeAppearanceEvenWhenAppearanceFails() {
        var startup = new WoodfishEditorManager.Startup(); var calls = new java.util.ArrayList<String>();
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> startup.start(
                () -> calls.add("subscribed"), () -> { calls.add("appearance"); throw new IllegalStateException(); }));
        startup.start(() -> calls.add("duplicate"), () -> calls.add("unexpected"));
        assertEquals(java.util.List.of("subscribed", "appearance"), calls);
    }

    @Test void classicBoldAddsToInheritedItalicAfterSemanticForeground() {
        var merger = new RunMerger(100);
        merger.addLexeme(0, 3, java.awt.Color.BLUE, Font.PLAIN);
        merger.addHighlighter(0, 3, 0, 3, 3, 120, java.awt.Color.RED, Font.PLAIN, false, false, false);
        merger.addHighlighter(0, 3, 0, 3, 3, 80, null, Font.BOLD, false, false, true);
        merger.finishGathering();
        var runs = new RunMerger.Runs();
        merger.merge(0, 3, 0, 3, java.awt.Color.BLACK, Font.ITALIC, runs);
        assertEquals(java.awt.Color.RED, runs.foreground[0]);
        assertEquals(Font.BOLD | Font.ITALIC, runs.font[0]);
    }

    @Test void warmedHighlighterSortReusesCapacityAcrossShorterLines() {
        var merger = new RunMerger(100);
        var runs = new RunMerger.Runs();
        var bean = (com.sun.management.ThreadMXBean) java.lang.management.ManagementFactory.getThreadMXBean();
        for (int n : new int[]{96, 72, 4, 1, 0, 4}) {
            merger.reset();
            runs.clear();
            for (int i = n; i > 0; i--) merger.addHighlighter(i, i + 1, i, i + 1, 1, 150,
                    (i & 1) == 0 ? java.awt.Color.RED : java.awt.Color.BLUE, Font.PLAIN, false, false, false);
            long before = bean.getCurrentThreadAllocatedBytes();
            merger.finishGathering();
            long allocated = bean.getCurrentThreadAllocatedBytes() - before;
            if (n == 4) assertEquals(0, allocated);
            merger.merge(0, n + 1, 0, n + 1, java.awt.Color.BLACK, Font.PLAIN, runs);
            assertEquals(n + 1, runs.count);
            assertEquals(java.awt.Color.BLACK, runs.foreground[0]);
            for (int i = 1; i <= n; i++) assertEquals((i & 1) == 0 ? java.awt.Color.RED : java.awt.Color.BLUE, runs.foreground[i]);
        }
    }
}
