package com.github.yyyyolo7a79.woodfish.core.color;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class CssGradientTest {

    // 矩形 (10, 20, 100, 40)：中心 (60, 40)
    private static final double X = 10;
    private static final double Y = 20;
    private static final double W = 100;
    private static final double H = 40;

    @Test
    void zeroDegreesRunsBottomToTop() {
        assertArrayEquals(new double[] {60, 60, 60, 20}, CssGradient.endpoints(X, Y, W, H, 0));
    }

    @Test
    void ninetyDegreesRunsLeftToRightExactly() {
        // 90 度的整数倍用精确的 sin / cos，两端点的 y 必须逐位相等
        assertArrayEquals(new double[] {10, 40, 110, 40}, CssGradient.endpoints(X, Y, W, H, 90));
    }

    @Test
    void oneEightyDegreesRunsTopToBottom() {
        assertArrayEquals(new double[] {60, 20, 60, 60}, CssGradient.endpoints(X, Y, W, H, 180));
    }

    @Test
    void twoSeventyDegreesRunsRightToLeft() {
        assertArrayEquals(new double[] {110, 40, 10, 40}, CssGradient.endpoints(X, Y, W, H, 270));
    }

    @Test
    void fortyFiveDegreesHitsOppositeCorners() {
        // 渐变线长 (w + h)·√2/2，端点沿 (√2/2, -√2/2) 方向离中心 (w + h)/4
        assertArrayEquals(new double[] {25, 75, 95, 5}, CssGradient.endpoints(X, Y, W, H, 45), 1e-9);
    }

    @Test
    void normalizesAnglesOutsideZeroToThreeSixty() {
        assertArrayEquals(CssGradient.endpoints(X, Y, W, H, 0), CssGradient.endpoints(X, Y, W, H, 360));
        assertArrayEquals(CssGradient.endpoints(X, Y, W, H, 270), CssGradient.endpoints(X, Y, W, H, -90));
        assertArrayEquals(CssGradient.endpoints(X, Y, W, H, 90), CssGradient.endpoints(X, Y, W, H, 450));
        assertArrayEquals(CssGradient.endpoints(X, Y, W, H, 0), CssGradient.endpoints(X, Y, W, H, -1e-20));
    }

    @Test
    void cornersLieOnTheZeroAndHundredPercentLines() {
        double[][] corners = {{X, Y}, {X + W, Y}, {X, Y + H}, {X + W, Y + H}};
        for (double angle : new double[] {30, 123.4, 200, 315.7}) {
            double[] e = CssGradient.endpoints(X, Y, W, H, angle);
            double dx = e[2] - e[0];
            double dy = e[3] - e[1];
            double length = Math.hypot(dx, dy);
            double min = Double.POSITIVE_INFINITY;
            double max = Double.NEGATIVE_INFINITY;
            for (double[] corner : corners) {
                // 角点在渐变线上的位置（0 = 0%，1 = 100%）
                double t = ((corner[0] - e[0]) * dx + (corner[1] - e[1]) * dy) / (length * length);
                min = Math.min(min, t);
                max = Math.max(max, t);
            }
            assertEquals(0, min, 1e-12, angle + "deg 时最靠前的角点应在 0%");
            assertEquals(1, max, 1e-12, angle + "deg 时最靠后的角点应在 100%");
        }
    }

    @Test
    void emptyRectangleCollapsesToItsCenter() {
        assertArrayEquals(new double[] {5, 7, 5, 7}, CssGradient.endpoints(5, 7, 0, 0, 33));
    }

    @Test
    void positionAtProjectsOntoTheLineAndClamps() {
        // 水平渐变 (10, 40) → (110, 40)：只看 x，y 不影响
        assertEquals(0, CssGradient.positionAt(10, 40, 110, 40, 10, 99));
        assertEquals(0.25, CssGradient.positionAt(10, 40, 110, 40, 35, -5), 1e-12);
        assertEquals(1, CssGradient.positionAt(10, 40, 110, 40, 110, 40));
        assertEquals(0, CssGradient.positionAt(10, 40, 110, 40, -50, 40), "线外按 NO_CYCLE 取端色");
        assertEquals(1, CssGradient.positionAt(10, 40, 110, 40, 500, 40));
        assertEquals(0.5, CssGradient.positionAt(5, 5, 5, 5, 9, 9), "端点重合时取中点");
    }

    @Test
    void colorAtInterpolatesThroughTheMiddleStop() {
        int light = 0xFF000000;
        int base = 0xFF808080;
        int dark = 0xFFFFFFFF;
        assertEquals(light, CssGradient.colorAt(light, base, dark, 0));
        assertEquals(base, CssGradient.colorAt(light, base, dark, 0.5));
        assertEquals(dark, CssGradient.colorAt(light, base, dark, 1));
        assertEquals(0xFF404040, CssGradient.colorAt(light, base, dark, 0.25));
        assertEquals(0xFFC0C0C0, CssGradient.colorAt(light, base, dark, 0.75));
        assertEquals(light, CssGradient.colorAt(light, base, dark, Double.NaN));
        assertEquals(0x40FF0000, CssGradient.colorAt(0x00FF0000, 0x80FF0000, 0xFFFF0000, 0.25), "alpha 同样插值");
    }
}
