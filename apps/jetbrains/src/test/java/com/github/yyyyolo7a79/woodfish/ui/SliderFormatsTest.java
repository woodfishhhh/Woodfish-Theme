package com.github.yyyyolo7a79.woodfish.ui;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class SliderFormatsTest {

    @Test
    void formatsUseFixedPrecision() {
        assertEquals("±24°", SliderFormats.hueShift(24));
        assertEquals("±0.060", SliderFormats.lightness(60));
        assertEquals("0.060", SliderFormats.chroma(60));
        assertEquals("1.00×", SliderFormats.glow(100));
        assertEquals("0.10×", SliderFormats.glow(10));
        assertEquals("90° →", SliderFormats.angle(90));
    }

    @Test
    void arrowFollowsCssAngle() {
        assertEquals("↑", SliderFormats.arrow(0));
        assertEquals("→", SliderFormats.arrow(90));
        assertEquals("↓", SliderFormats.arrow(180));
        assertEquals("←", SliderFormats.arrow(270));
        assertEquals("↑", SliderFormats.arrow(360));
        // 取最近的 45° 方向
        assertEquals("↗", SliderFormats.arrow(40));
        assertEquals("→", SliderFormats.arrow(100));
        assertEquals("↖", SliderFormats.arrow(-45));
    }
}
