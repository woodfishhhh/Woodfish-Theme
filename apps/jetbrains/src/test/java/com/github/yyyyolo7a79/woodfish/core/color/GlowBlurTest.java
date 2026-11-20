package com.github.yyyyolo7a79.woodfish.core.color;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

class GlowBlurTest {

    private static final int OPAQUE_WHITE = 0xFFFFFFFF;

    @Test
    void sigmaBelowHalfLeavesPixelsUntouched() {
        int[] pixels = randomPremultiplied(32, 24, 3);
        for (double sigma : new double[] {0.49, 0, -1, Double.NaN}) {
            int[] copy = pixels.clone();
            GlowBlur.blurPremultiplied(copy, 32, 24, sigma);
            assertArrayEquals(pixels, copy, "sigma=" + sigma);
        }
    }

    @Test
    void fullyTransparentImageStaysTransparent() {
        int[] pixels = new int[40 * 30];
        GlowBlur.blurPremultiplied(pixels, 40, 30, 6);
        assertArrayEquals(new int[40 * 30], pixels);
    }

    @Test
    void conservesEnergyWhenPaddingCoversKernel() {
        int size = 60;
        int[] pixels = new int[size * size];
        fill(pixels, size, 25, 25, 10, 10, OPAQUE_WHITE);
        assertTrue(GlowBlur.kernelRadius(3) <= 25, "四周透明边距要盖住核半径");
        long before = channelSum(pixels, 24);

        GlowBlur.blurPremultiplied(pixels, size, size, 3);

        long after = channelSum(pixels, 24);
        assertEquals(before, after, before * 0.01, "alpha 总量");
        assertEquals(channelSum(pixels, 0), after, "白色预乘后各通道应与 alpha 一致");
    }

    @Test
    void singlePointBlursSymmetrically() {
        int size = 21;
        int center = size / 2;
        int[] pixels = new int[size * size];
        pixels[center * size + center] = OPAQUE_WHITE;
        GlowBlur.blurPremultiplied(pixels, size, size, 1.5);

        int peak = pixels[center * size + center] >>> 24;
        assertTrue(peak > 0, "单点模糊后中心不应被抹成透明");
        for (int y = 0; y < size; y++) {
            for (int x = 0; x < size; x++) {
                int value = pixels[y * size + x];
                // 左右、上下镜像逐位相同；转置只差舍入
                assertEquals(value, pixels[y * size + (size - 1 - x)], "左右镜像 (" + x + ", " + y + ")");
                assertEquals(value, pixels[(size - 1 - y) * size + x], "上下镜像 (" + x + ", " + y + ")");
                int transposed = pixels[x * size + y] >>> 24;
                assertTrue(Math.abs((value >>> 24) - transposed) <= 1, "转置 (" + x + ", " + y + ")");
                assertTrue((value >>> 24) <= peak, "中心最亮");
            }
        }
        // 沿轴向外单调不增
        for (int d = 1; d <= center; d++) {
            int inner = pixels[center * size + center + d - 1] >>> 24;
            int outer = pixels[center * size + center + d] >>> 24;
            assertTrue(outer <= inner, "距离 " + d);
        }
    }

    @Test
    void blursAllChannelsSoPremultipliedColorSurvives() {
        int size = 48;
        int[] pixels = new int[size * size];
        // 橙色 (255, 128, 0) × alpha 200 的预乘值
        fill(pixels, size, 20, 20, 8, 8, 200 << 24 | 200 << 16 | 100 << 8);
        GlowBlur.blurPremultiplied(pixels, size, size, 4);

        for (int p : pixels) {
            int a = p >>> 24;
            int r = (p >>> 16) & 0xFF;
            int g = (p >>> 8) & 0xFF;
            int b = p & 0xFF;
            assertTrue(r <= a && g <= a && b <= a, String.format("预乘不变式被破坏：%08X", p));
            assertEquals(0, b);
            if (a >= 40) {
                // 反预乘后颜色不变：发光边缘不发黑、不偏色
                assertEquals(255, Math.round(r * 255f / a), 3, String.format("%08X", p));
                assertEquals(128, Math.round(g * 255f / a), 4, String.format("%08X", p));
            }
        }
    }

    @Test
    void approximatesGaussianAcrossAnEdge() {
        int width = 300;
        int height = 101;
        double sigma = 5;
        int[] pixels = new int[width * height];
        fill(pixels, width, 100, 0, 100, height, OPAQUE_WHITE);
        GlowBlur.blurPremultiplied(pixels, width, height, sigma);

        // 第 50 行离上下边缘远，结果就是水平方向的一维模糊；边缘位于 99 与 100 之间
        int row = 50 * width;
        for (int x : new int[] {90, 94, 97, 99, 100, 102, 105, 109}) {
            double expected = 255 * normalCdf((x - 99.5) / sigma);
            assertEquals(expected, pixels[row + x] >>> 24, 6, "x=" + x);
        }
    }

    @Test
    void kernelRadiusBoundsTheGlow() {
        assertEquals(0, GlowBlur.kernelRadius(0.4));
        assertEquals(0, GlowBlur.kernelRadius(Double.NaN));
        assertEquals(4, GlowBlur.kernelRadius(2));
        assertEquals(13, GlowBlur.kernelRadius(5));
        assertEquals(28, GlowBlur.kernelRadius(10));

        for (double sigma : new double[] {0.8, 2, 3.7, 6}) {
            int radius = GlowBlur.kernelRadius(sigma);
            int size = 2 * radius + 21;
            int center = size / 2;
            int[] pixels = new int[size * size];
            fill(pixels, size, center - 2, center - 2, 5, 5, OPAQUE_WHITE);
            GlowBlur.blurPremultiplied(pixels, size, size, sigma);
            for (int y = 0; y < size; y++) {
                for (int x = 0; x < size; x++) {
                    int distance = Math.max(Math.abs(x - center), Math.abs(y - center)) - 2;
                    if (distance > radius) {
                        assertEquals(0, pixels[y * size + x], "sigma=" + sigma + " 的 (" + x + ", " + y + ")");
                    }
                }
            }
        }
    }

    @Test
    void rejectsArraysThatDoNotMatchTheSize() {
        assertThrows(IllegalArgumentException.class, () -> GlowBlur.blurPremultiplied(new int[10], 4, 3, 2));
        assertThrows(IllegalArgumentException.class, () -> GlowBlur.blurPremultiplied(new int[10], -1, 3, 2));
        assertThrows(NullPointerException.class, () -> GlowBlur.blurPremultiplied(null, 1, 1, 2));
        // 空图像什么都不做
        GlowBlur.blurPremultiplied(new int[0], 0, 5, 2);
    }

    @Test
    void hugeSigmaDoesNotOverflow() {
        int[] pixels = randomPremultiplied(16, 9, 5);
        GlowBlur.blurPremultiplied(pixels, 16, 9, 1e12);
        for (int p : pixels) {
            int a = p >>> 24;
            assertTrue(((p >>> 16) & 0xFF) <= a && ((p >>> 8) & 0xFF) <= a && (p & 0xFF) <= a);
        }
    }

    private static void fill(int[] pixels, int stride, int x0, int y0, int w, int h, int argb) {
        for (int y = y0; y < y0 + h; y++) {
            for (int x = x0; x < x0 + w; x++) {
                pixels[y * stride + x] = argb;
            }
        }
    }

    private static long channelSum(int[] pixels, int shift) {
        long sum = 0;
        for (int p : pixels) {
            sum += (p >>> shift) & 0xFF;
        }
        return sum;
    }

    /** 随机但合法的预乘像素：各颜色通道 ≤ alpha */
    private static int[] randomPremultiplied(int width, int height, long seed) {
        Random random = new Random(seed);
        int[] pixels = new int[width * height];
        for (int i = 0; i < pixels.length; i++) {
            int a = random.nextInt(256);
            pixels[i] = a << 24 | random.nextInt(a + 1) << 16 | random.nextInt(a + 1) << 8
                    | random.nextInt(a + 1);
        }
        return pixels;
    }

    /** 标准正态分布函数；erf 用 Abramowitz-Stegun 7.1.26，误差 < 1.5e-7 */
    private static double normalCdf(double z) {
        double x = Math.abs(z) / Math.sqrt(2);
        double t = 1 / (1 + 0.3275911 * x);
        double poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t
                + 0.254829592) * t;
        double erf = 1 - poly * Math.exp(-x * x);
        return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
    }
}
