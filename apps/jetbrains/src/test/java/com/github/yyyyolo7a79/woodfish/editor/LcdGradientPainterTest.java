package com.github.yyyyolo7a79.woodfish.editor;

import org.junit.jupiter.api.Test;

import java.awt.Font;
import java.awt.RenderingHints;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LcdGradientPainterTest {

    @Test
    void divisionsKeepEveryStepBelowTheLimit() {
        assertEquals(1, LcdGradientPainter.divisions(0, 3));
        assertEquals(1, LcdGradientPainter.divisions(LcdGradientPainter.MAX_STEP, 3), "恰好一步不用切");
        assertEquals(2, LcdGradientPainter.divisions(LcdGradientPainter.MAX_STEP * 1.5, 3));
        assertEquals(3, LcdGradientPainter.divisions(1, 3), "超过上限时封顶");
        assertEquals(7, LcdGradientPainter.divisions(0.55, LcdGradientPainter.MAX_TILES), "0.55 ÷ 1/12 = 6.6，向上取整");
        assertEquals(1, LcdGradientPainter.divisions(Double.NaN, 3), "非法跨度按不切处理");
    }

    @Test
    void grayscaleEditorNeverNeedsTheSolidPath() {
        assertTrue(NativeGlyphs.isGrayscale(RenderingHints.VALUE_TEXT_ANTIALIAS_ON));
        assertFalse(NativeGlyphs.isGrayscale(RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB));
        assertFalse(NativeGlyphs.isGrayscale(RenderingHints.VALUE_TEXT_ANTIALIAS_OFF));
        assertFalse(NativeGlyphs.isGrayscale(null));

        Font logical = new Font(Font.MONOSPACED, Font.PLAIN, 13);
        FontRenderContext gray = new FontRenderContext(AffineTransform.getScaleInstance(1.5, 1.5),
                RenderingHints.VALUE_TEXT_ANTIALIAS_ON, RenderingHints.VALUE_FRACTIONALMETRICS_OFF);
        FontRenderContext lcd = new FontRenderContext(AffineTransform.getScaleInstance(1.5, 1.5),
                RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB, RenderingHints.VALUE_FRACTIONALMETRICS_OFF);
        assertTrue(NativeGlyphs.grayscaleMatches(logical, gray), "编辑器本身就用灰度缓存：任何字体都安全");
        // 逻辑字体由系统字体组合而成，从来不是 JBR 自带的字族
        assertFalse(NativeGlyphs.isBundledFamily(logical));
        assertFalse(NativeGlyphs.grayscaleMatches(logical, lcd));
    }
}
