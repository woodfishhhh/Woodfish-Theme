package com.github.yyyyolo7a79.woodfish.core.color;

import java.awt.Color;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 解析中性色（白、灰文字）借用的锚点色相，对应原版 resolveAnchorHue + fallbackAccentHue。
 *
 * <p>原版统计编辑器里可见 token 颜色的出现次数，取「次数 × 色度」最高的彩色作为锚点，
 * 让白色文字的渐变带上主题的主色调；没有合适的语法色时退回界面强调色，再没有就用
 * {@link #FALLBACK_HUE}。
 */
public final class AnchorHue {

    /** 没有任何可用颜色时的锚点色相（紫），与原版相同 */
    public static final double FALLBACK_HUE = 300;

    // 语法色候选的门槛：太灰或太暗的颜色当不了主色调
    private static final double MIN_CANDIDATE_CHROMA = 0.075;
    private static final double MIN_CANDIDATE_LIGHTNESS = 0.4;

    /**
     * 一个语法色候选及其权重（原版是该颜色可见 token 的出现次数）。
     *
     * @param color  候选颜色，alpha 不参与计算；为 null 时忽略
     * @param weight 权重；不是正数（含 NaN）时忽略，对应原版里没出现过的颜色
     */
    public record WeightedColor(Color color, double weight) {
    }

    private AnchorHue() {
    }

    /**
     * 在候选中取 {@code weight × chroma} 最大的颜色（只考虑 chroma ≥ 0.075 且 L ≥ 0.4），
     * 返回其色相；没有合格候选时，在 {@code accents} 中取 chroma ≥ 0.045 且 chroma 最高者的色相；
     * 都没有时返回 {@link #FALLBACK_HUE}。
     *
     * <p>同一颜色（{@code getRGB()} 相同，含 alpha）出现多次时权重相加，与原版按颜色计数一致；
     * 得分相同时先出现者胜出（原版用的是稳定排序）。
     *
     * @param candidates 语法色候选；调用方应像原版一样排除空白与纯标点 token
     * @param accents    界面强调色，按优先顺序排列；null 元素被忽略
     * @return 色相（度，atan2 的结果，-180..180），或 {@link #FALLBACK_HUE}
     */
    public static double resolve(List<WeightedColor> candidates, List<Color> accents) {
        // LinkedHashMap 保留首次出现的顺序，同分时据此取先出现者
        Map<Integer, double[]> totals = new LinkedHashMap<>();
        for (WeightedColor candidate : candidates) {
            if (candidate != null && candidate.color() != null && candidate.weight() > 0) {
                totals.computeIfAbsent(candidate.color().getRGB(), key -> new double[1])[0] +=
                        candidate.weight();
            }
        }

        Oklch best = null;
        double bestScore = 0;
        for (Map.Entry<Integer, double[]> entry : totals.entrySet()) {
            int argb = entry.getKey();
            Oklch color = ColorMath.rgbToOklch((argb >> 16) & 0xFF, (argb >> 8) & 0xFF, argb & 0xFF);
            if (color.c() < MIN_CANDIDATE_CHROMA || color.l() < MIN_CANDIDATE_LIGHTNESS) {
                continue;
            }
            double score = entry.getValue()[0] * color.c();
            if (best == null || score > bestScore) {
                best = color;
                bestScore = score;
            }
        }
        return best != null ? best.h() : fallbackAccentHue(accents);
    }

    private static double fallbackAccentHue(List<Color> accents) {
        Oklch best = null;
        for (Color accent : accents) {
            if (accent == null) {
                continue;
            }
            Oklch color = ColorMath.fromColor(accent);
            if (color.c() >= TokenColorDeriver.NEUTRAL_CHROMA_THRESHOLD
                    && (best == null || color.c() > best.c())) {
                best = color;
            }
        }
        return best != null ? best.h() : FALLBACK_HUE;
    }
}
