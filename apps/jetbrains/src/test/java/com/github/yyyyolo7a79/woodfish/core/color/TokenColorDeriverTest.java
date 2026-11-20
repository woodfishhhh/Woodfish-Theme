package com.github.yyyyolo7a79.woodfish.core.color;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Color;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class TokenColorDeriverTest {

    @Test
    void matchesOriginalDeriveTokenColors() {
        double[][] settings = OriginalReferenceData.DERIVE_SETTINGS;
        TokenColorDeriver[] derivers = new TokenColorDeriver[settings.length];
        for (int i = 0; i < settings.length; i++) {
            derivers[i] = new TokenColorDeriver(settings[i][0], settings[i][1], settings[i][2],
                    settings[i][3]);
        }
        for (int[] row : OriginalReferenceData.DERIVE) {
            int argb = row[1];
            boolean punctuation = row[2] == 1;
            TokenColors colors = derivers[row[0]].derive(new Color(argb, true), punctuation);
            String where = String.format("参数组 %d、#%08X、标点 %b", row[0], argb, punctuation);

            assertChannelsWithinOne(row[3], row[4], row[5], colors.light(), where + " 的 light");
            assertEquals(argb, colors.base().getRGB(), where + " 的 base 应是原色");
            assertEquals(row[6], colors.base().getRed(), where);
            assertEquals(row[7], colors.base().getGreen(), where);
            assertEquals(row[8], colors.base().getBlue(), where);
            assertChannelsWithinOne(row[9], row[10], row[11], colors.dark(), where + " 的 dark");

            assertEquals(row[12], colors.light().getAlpha(), where + " 的 light alpha");
            assertEquals(row[12], colors.base().getAlpha(), where + " 的 base alpha");
            assertEquals(row[12], colors.dark().getAlpha(), where + " 的 dark alpha");
            assertEquals(row[13], colors.glowNear().getAlpha(), where + " 的 glowNear alpha");
            assertEquals(row[14], colors.glowMid().getAlpha(), where + " 的 glowMid alpha");
            assertEquals(row[15], colors.glowFar().getAlpha(), where + " 的 glowFar alpha");
            // 发光用的是原色 RGB
            int rgb = argb & 0xFFFFFF;
            assertEquals(rgb, colors.glowNear().getRGB() & 0xFFFFFF, where);
            assertEquals(rgb, colors.glowMid().getRGB() & 0xFFFFFF, where);
            assertEquals(rgb, colors.glowFar().getRGB() & 0xFFFFFF, where);

            assertEquals(row[16] == 1, colors.neutral(), where + " 的 neutral");
            assertEquals(punctuation, colors.punctuation(), where);
        }
    }

    private static void assertChannelsWithinOne(int red, int green, int blue, Color actual,
                                                String where) {
        boolean close = Math.abs(red - actual.getRed()) <= 1
                && Math.abs(green - actual.getGreen()) <= 1
                && Math.abs(blue - actual.getBlue()) <= 1;
        assertTrue(close, where + "：期望 (" + red + ", " + green + ", " + blue + ")，实际 ("
                + actual.getRed() + ", " + actual.getGreen() + ", " + actual.getBlue() + ")");
    }

    @Test
    void cacheHitReturnsSameInstance() {
        TokenColorDeriver deriver = new TokenColorDeriver(24, 0.06, 0.06, 300);
        TokenColors first = deriver.derive(new Color(0xFF79C6), false);
        assertSame(first, deriver.derive(new Color(0xFF79C6), false));
        assertSame(first, deriver.derive(new Color(0xFFFF79C6, true), false));
    }

    @Test
    void cacheKeyIncludesPunctuationAndAlpha() {
        TokenColorDeriver deriver = new TokenColorDeriver(24, 0.06, 0.06, 300);
        TokenColors token = deriver.derive(new Color(0x50FA7B), false);
        TokenColors punctuation = deriver.derive(new Color(0x50FA7B), true);
        TokenColors translucent = deriver.derive(new Color(0x8050FA7B, true), false);

        assertTrue(punctuation.punctuation());
        assertNotEquals(token.glowNear(), punctuation.glowNear());
        assertEquals(token.light(), punctuation.light(), "标点只影响发光，不影响渐变");
        assertEquals(0x80, translucent.base().getAlpha());
        assertEquals(0x80, translucent.light().getAlpha());
        assertEquals(255, token.light().getAlpha());
    }

    @Test
    void snapshotsDynamicColorsAndReadsThemOnce() {
        // 模拟 JBColor：每次 getRGB 都可能变
        int[] calls = {0};
        Color dynamic = new Color(0) {
            @Override
            public int getRGB() {
                return calls[0]++ == 0 ? 0xFFFF79C6 : 0xFF000000;
            }
        };
        TokenColors colors = new TokenColorDeriver(24, 0.06, 0.06, 300).derive(dynamic, false);
        assertEquals(1, calls[0]);
        assertEquals(Color.class, colors.base().getClass());
        assertEquals(0xFFFF79C6, colors.base().getRGB());
    }

    @Test
    void neutralColorsBorrowAnchorHue() {
        Color white = new Color(0xF8F8F2);
        TokenColors purple = new TokenColorDeriver(24, 0.06, 0.06, 300).derive(white, false);
        TokenColors green = new TokenColorDeriver(24, 0.06, 0.06, 140).derive(white, false);
        assertTrue(purple.neutral());
        assertNotEquals(purple.light(), green.light());
        assertEquals(purple.base(), green.base());

        // 彩色不受锚点影响
        Color pink = new Color(0xFF79C6);
        assertEquals(new TokenColorDeriver(24, 0.06, 0.06, 300).derive(pink, false),
                new TokenColorDeriver(24, 0.06, 0.06, 140).derive(pink, false));
    }

    @Test
    void zeroSettingsKeepGradientEqualToBase() {
        TokenColorDeriver deriver = new TokenColorDeriver(0, 0, 0, 300);
        for (int argb : new int[] {0xFFFF79C6, 0xFF8BE9FD, 0xFF808080, 0xFFFFFFFF, 0xFF000000}) {
            TokenColors colors = deriver.derive(new Color(argb, true), false);
            Color base = colors.base();
            assertChannelsWithinOne(base.getRed(), base.getGreen(), base.getBlue(), colors.light(),
                    String.format("#%08X 的 light", argb));
            assertChannelsWithinOne(base.getRed(), base.getGreen(), base.getBlue(), colors.dark(),
                    String.format("#%08X 的 dark", argb));
        }
    }

    @Test
    void exposesConstantsAndAnchorHue() {
        assertEquals(0.045, TokenColorDeriver.NEUTRAL_CHROMA_THRESHOLD);
        assertEquals(151.79, new TokenColorDeriver(24, 0.06, 0.06, 151.79).anchorHue());
    }

    @Test
    void rejectsNonFiniteParameters() {
        assertThrows(IllegalArgumentException.class,
                () -> new TokenColorDeriver(Double.NaN, 0.06, 0.06, 300));
        assertThrows(IllegalArgumentException.class,
                () -> new TokenColorDeriver(24, Double.POSITIVE_INFINITY, 0.06, 300));
        assertThrows(IllegalArgumentException.class,
                () -> new TokenColorDeriver(24, 0.06, Double.NaN, 300));
        assertThrows(IllegalArgumentException.class,
                () -> new TokenColorDeriver(24, 0.06, 0.06, Double.NEGATIVE_INFINITY));
    }

    @Test
    void staysCorrectAfterEvictingBeyondCapacity() {
        TokenColorDeriver cached = new TokenColorDeriver(24, 0.06, 0.06, 300);
        List<Color> colors = randomColors(12_000, 7);
        for (Color color : colors) {
            cached.derive(color, false);
        }
        // 容量只有 4096 条，前面的大多已被挤掉；重新派生必须与全新实例的结果一致
        for (Color color : colors.subList(0, 500)) {
            TokenColorDeriver fresh = new TokenColorDeriver(24, 0.06, 0.06, 300);
            assertEquals(fresh.derive(color, false), cached.derive(color, false));
        }
    }

    @Test
    void concurrentDeriveMatchesSingleThreadedResults() throws Exception {
        List<Color> palette = randomColors(3_000, 11);
        TokenColorDeriver reference = new TokenColorDeriver(30, 0.08, 0.05, 210);
        List<TokenColors> expected = new ArrayList<>();
        for (Color color : palette) {
            expected.add(reference.derive(color, false));
            expected.add(reference.derive(color, true));
        }

        TokenColorDeriver shared = new TokenColorDeriver(30, 0.08, 0.05, 210);
        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int t = 0; t < threads; t++) {
                long seed = t;
                futures.add(pool.submit(() -> {
                    List<Integer> order = new ArrayList<>();
                    for (int i = 0; i < palette.size(); i++) {
                        order.add(i);
                    }
                    Collections.shuffle(order, new Random(seed));
                    start.await();
                    for (int round = 0; round < 3; round++) {
                        for (int i : order) {
                            assertEquals(expected.get(2 * i), shared.derive(palette.get(i), false));
                            assertEquals(expected.get(2 * i + 1), shared.derive(palette.get(i), true));
                        }
                    }
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> future : futures) {
                future.get(60, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }
    }

    private static List<Color> randomColors(int count, long seed) {
        Random random = new Random(seed);
        List<Color> colors = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            colors.add(new Color(random.nextInt(), true));
        }
        return colors;
    }
}
