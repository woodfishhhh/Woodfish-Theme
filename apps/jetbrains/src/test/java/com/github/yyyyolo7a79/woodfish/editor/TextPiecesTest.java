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
        org.junit.jupiter.api.Assertions.assertTrue(EditorGrid.fit(1, 3, 10, origins, widths, i -> edges[i]));
        org.junit.jupiter.api.Assertions.assertArrayEquals(new float[]{0, 12, 28}, origins);
        org.junit.jupiter.api.Assertions.assertArrayEquals(new float[]{0, 16, 16}, widths);
        org.junit.jupiter.api.Assertions.assertFalse(EditorGrid.fit(1, 3, 10, origins, widths, i -> 0));
    }

    private static float advance(GlyphVector vector, int glyph) {
        return (float) (vector.getGlyphPosition(glyph + 1).getX() - vector.getGlyphPosition(glyph).getX());
    }
}
