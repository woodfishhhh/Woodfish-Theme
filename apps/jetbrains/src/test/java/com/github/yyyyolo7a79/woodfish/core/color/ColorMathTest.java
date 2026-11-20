package com.github.yyyyolo7a79.woodfish.core.color;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Color;
import org.junit.jupiter.api.Test;

class ColorMathTest {

    /** 中间浮点值与原版的容差 */
    private static final double EPS = 1e-9;

    @Test
    void rgbToOklchMatchesOriginal() {
        for (double[] row : OriginalReferenceData.RGB_TO_OKLCH) {
            Oklch actual = ColorMath.rgbToOklch(row[0], row[1], row[2]);
            String where = "rgb(" + row[0] + ", " + row[1] + ", " + row[2] + ")";
            assertEquals(row[3], actual.l(), EPS, where + " 的 l");
            assertEquals(row[4], actual.c(), EPS, where + " 的 c");
            // 白、灰的色度只有 1e-8 量级，色相是数值噪声：libm 一个 ulp 的差异会被放大 1/c 倍。
            // 中性色派生时色相会被锚点色相替换，所以这里按条件数放宽，彩色仍是 1e-9
            double hueTolerance = Math.max(EPS, 1e-13 / row[4]);
            assertEquals(row[5], actual.h(), hueTolerance, where + " 的 h");
        }
    }

    @Test
    void fromColorIgnoresAlpha() {
        Oklch expected = ColorMath.rgbToOklch(255, 121, 198);
        assertEquals(expected, ColorMath.fromColor(new Color(0xFF79C6)));
        assertEquals(expected, ColorMath.fromColor(new Color(0x40FF79C6, true)));
        assertEquals(expected, ColorMath.fromColor(new Color(0x00FF79C6, true)));
    }

    @Test
    void oklchToRgbMatchesOriginalWithoutClipping() {
        boolean sawOutOfRange = false;
        for (double[] row : OriginalReferenceData.OKLCH_TO_RGB) {
            double[] actual = ColorMath.oklchToRgb(new Oklch(row[0], row[1], row[2]));
            assertArrayEquals(new double[] {row[3], row[4], row[5]}, actual, EPS,
                    "oklch(" + row[0] + ", " + row[1] + ", " + row[2] + ")");
            for (double channel : actual) {
                sawOutOfRange |= channel < 0 || channel > 255;
            }
        }
        assertTrue(sawOutOfRange, "参考数据里应有越出 0..255 的结果，证明没有被裁剪");
    }

    @Test
    void isInSrgbGamutMatchesOriginalIncludingNaN() {
        for (double[] row : OriginalReferenceData.IN_GAMUT) {
            double[] rgb = {row[0], row[1], row[2]};
            assertEquals(row[3] == 1, ColorMath.isInSrgbGamut(rgb),
                    "{" + row[0] + ", " + row[1] + ", " + row[2] + "}");
        }
    }

    @Test
    void gamutMapMatchesOriginal() {
        for (double[] row : OriginalReferenceData.GAMUT_MAP) {
            Oklch color = new Oklch(row[0], row[1], row[2]);
            double[] actual = ColorMath.gamutMap(color);
            String where = "oklch(" + row[0] + ", " + row[1] + ", " + row[2] + ")";
            assertArrayEquals(new double[] {row[3], row[4], row[5]}, actual, EPS, where);
            if (row[6] == 1) {
                // 本来就在色域内：与直接换算的结果逐位相同
                assertArrayEquals(ColorMath.oklchToRgb(color), actual, 0, where);
            }
        }
    }

    @Test
    void gamutMapAlwaysLandsInGamutForValidLightness() {
        for (double l = 0.02; l < 1; l += 0.07) {
            for (double h = -180; h < 180; h += 15) {
                double[] rgb = ColorMath.gamutMap(new Oklch(l, 0.37, h));
                assertTrue(ColorMath.isInSrgbGamut(rgb), "l=" + l + ", h=" + h);
            }
        }
    }

    @Test
    void offsetLightnessMatchesOriginalAndReversesAtBounds() {
        for (double[] row : OriginalReferenceData.OFFSET_LIGHTNESS) {
            // 只有加减与比较，必须逐位相同
            assertEquals(row[2], ColorMath.offsetLightness(row[0], row[1]),
                    "offsetLightness(" + row[0] + ", " + row[1] + ")");
        }
        assertEquals(0.91, ColorMath.offsetLightness(0.97, 0.06), 1e-12, "调亮越过 1 时改为调暗");
        assertEquals(0.09, ColorMath.offsetLightness(0.03, -0.06), 1e-12, "调暗越过 0 时改为调亮");
        assertEquals(0, ColorMath.offsetLightness(0.1, 1.5), "反向后仍越界则裁剪");
    }

    @Test
    void toColorClipsAndRoundsChannels() {
        Color color = ColorMath.toColor(new double[] {-5, 255.6, 127.5}, 1);
        assertEquals(new Color(0, 255, 128, 255), color);
        assertEquals(new Color(127, 0, 1, 255), ColorMath.toColor(new double[] {127.49, 0.49, 0.5}, 1));
    }

    @Test
    void toColorRoundsAndClipsAlpha() {
        double[] rgb = {10, 20, 30};
        assertEquals(128, ColorMath.toColor(rgb, 0.5).getAlpha(), "0.5 × 255 = 127.5 进位");
        assertEquals(255, ColorMath.toColor(rgb, 1.7).getAlpha());
        assertEquals(0, ColorMath.toColor(rgb, -0.2).getAlpha());
        assertEquals(1, ColorMath.toColor(rgb, 1 / 255.0).getAlpha());
    }

    @Test
    void toColorTreatsNaNAsZero() {
        Color color = ColorMath.toColor(new double[] {Double.NaN, 10, 20}, Double.NaN);
        assertEquals(new Color(0, 10, 20, 0), color);
    }

    @Test
    void rejectsArraysThatAreNotRgb() {
        assertThrows(IllegalArgumentException.class, () -> ColorMath.toColor(new double[2], 1));
        assertThrows(IllegalArgumentException.class, () -> ColorMath.isInSrgbGamut(new double[4]));
    }

    @Test
    void roundTripPreservesSrgbColors() {
        for (int r = 0; r <= 255; r += 51) {
            for (int g = 0; g <= 255; g += 51) {
                for (int b = 0; b <= 255; b += 17) {
                    // 原版两组矩阵系数只保留 10 位小数，互逆误差约 1e-5（0..255 尺度）
                    double[] back = ColorMath.oklchToRgb(ColorMath.rgbToOklch(r, g, b));
                    assertArrayEquals(new double[] {r, g, b}, back, 1e-3, "rgb(" + r + ", " + g + ", " + b + ")");
                }
            }
        }
    }
}
