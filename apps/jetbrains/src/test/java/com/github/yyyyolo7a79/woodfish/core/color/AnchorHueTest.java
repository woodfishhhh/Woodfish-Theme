package com.github.yyyyolo7a79.woodfish.core.color;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.github.yyyyolo7a79.woodfish.core.color.AnchorHue.WeightedColor;
import java.awt.Color;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class AnchorHueTest {

    private static final Color PINK = new Color(0xFF79C6);
    private static final Color GREEN = new Color(0x50FA7B);
    private static final Color CYAN = new Color(0x8BE9FD);

    @Test
    void matchesOriginal() {
        for (OriginalReferenceData.AnchorCase c : OriginalReferenceData.ANCHOR) {
            List<WeightedColor> candidates = new ArrayList<>();
            for (int i = 0; i < c.candidates().length; i++) {
                candidates.add(new WeightedColor(new Color(c.candidates()[i], true), c.weights()[i]));
            }
            List<Color> accents = new ArrayList<>();
            for (int argb : c.accents()) {
                accents.add(new Color(argb, true));
            }
            assertEquals(c.expectedHue(), AnchorHue.resolve(candidates, accents), 1e-9,
                    "候选 " + Arrays.toString(c.candidates()) + "，强调色 " + Arrays.toString(c.accents()));
        }
    }

    @Test
    void returnsFallbackWhenNothingQualifies() {
        assertEquals(300, AnchorHue.FALLBACK_HUE);
        assertEquals(AnchorHue.FALLBACK_HUE, AnchorHue.resolve(List.of(), List.of()));
        // 深蓝太暗、灰太淡：都不能当锚点；强调色也全是灰
        List<WeightedColor> candidates = List.of(
                new WeightedColor(new Color(0x0000AA), 100),
                new WeightedColor(new Color(0xA0A0B0), 100));
        assertEquals(AnchorHue.FALLBACK_HUE,
                AnchorHue.resolve(candidates, List.of(Color.WHITE, Color.GRAY)));
    }

    @Test
    void weightCanOutrankHigherChroma() {
        List<WeightedColor> candidates = List.of(
                new WeightedColor(Color.RED, 1),
                new WeightedColor(CYAN, 10));
        assertEquals(ColorMath.fromColor(CYAN).h(), AnchorHue.resolve(candidates, List.of()));
    }

    @Test
    void sameColorWeightsAreSummedLikeOriginalCounts() {
        // 合并后粉色 8 × 0.183 > 绿色 6 × 0.220 > 单条粉色 4 × 0.183
        List<WeightedColor> candidates = List.of(
                new WeightedColor(PINK, 4),
                new WeightedColor(GREEN, 6),
                new WeightedColor(new Color(0xFF79C6), 4));
        assertEquals(ColorMath.fromColor(PINK).h(), AnchorHue.resolve(candidates, List.of()));
    }

    @Test
    void tieKeepsFirstCandidate() {
        double pinkChroma = ColorMath.fromColor(PINK).c();
        double greenChroma = ColorMath.fromColor(GREEN).c();
        // 权重互换色度，两者得分逐位相等
        WeightedColor pink = new WeightedColor(PINK, greenChroma);
        WeightedColor green = new WeightedColor(GREEN, pinkChroma);
        assertEquals(ColorMath.fromColor(PINK).h(), AnchorHue.resolve(List.of(pink, green), List.of()));
        assertEquals(ColorMath.fromColor(GREEN).h(), AnchorHue.resolve(List.of(green, pink), List.of()));
    }

    @Test
    void ignoresNullsAndNonPositiveWeights() {
        List<WeightedColor> candidates = Arrays.asList(
                null,
                new WeightedColor(null, 5),
                new WeightedColor(PINK, 0),
                new WeightedColor(GREEN, -3),
                new WeightedColor(CYAN, Double.NaN));
        List<Color> accents = Arrays.asList(null, new Color(0x007ACC));
        assertEquals(ColorMath.fromColor(new Color(0x007ACC)).h(),
                AnchorHue.resolve(candidates, accents));
    }

    @Test
    void accentFallbackPicksHighestChromaAboveThreshold() {
        Color muted = new Color(0x8196B5);
        Color vivid = new Color(0xFF5555);
        assertTrue(ColorMath.fromColor(muted).c() >= TokenColorDeriver.NEUTRAL_CHROMA_THRESHOLD);
        assertEquals(ColorMath.fromColor(vivid).h(),
                AnchorHue.resolve(List.of(), List.of(muted, vivid, Color.WHITE)));
        assertEquals(ColorMath.fromColor(muted).h(),
                AnchorHue.resolve(List.of(), List.of(Color.LIGHT_GRAY, muted)));
    }

    @Test
    void alphaDoesNotAffectChromaOrHue() {
        List<WeightedColor> candidates = List.of(new WeightedColor(new Color(0x20FF79C6, true), 1));
        assertEquals(ColorMath.fromColor(PINK).h(), AnchorHue.resolve(candidates, List.of()));
    }
}
