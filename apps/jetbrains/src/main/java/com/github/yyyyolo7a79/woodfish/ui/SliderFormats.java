package com.github.yyyyolo7a79.woodfish.ui;

import java.util.Locale;

/**
 * 设置页滑块旁的数值文本（刻度 → 文本，纯逻辑，便于单测）。
 *
 * <p>色相与明度写成 ±，与 VS Code 版 README 的「色相 ±24°、明度 ΔL ±0.060」一致：
 * 参数描述的是渐变两端相对原色的偏移量。
 */
final class SliderFormats {

    /** 明度变化、低色度补色：每格 0.001 */
    static final int THOUSANDTHS = 1000;

    /** 发光强度：每格 0.01 */
    static final int HUNDREDTHS = 100;

    private static final String[] ARROWS = {"↑", "↗", "→", "↘", "↓", "↙", "←", "↖"};

    private SliderFormats() {
    }

    /** 色相偏移，刻度为整度 */
    static String hueShift(int degrees) {
        return "±" + degrees + "°";
    }

    /** 明度变化 */
    static String lightness(int tick) {
        return String.format(Locale.ROOT, "±%.3f", tick / (double) THOUSANDTHS);
    }

    /** 低色度补色（最小色度，不是偏移量，因此不带 ±） */
    static String chroma(int tick) {
        return String.format(Locale.ROOT, "%.3f", tick / (double) THOUSANDTHS);
    }

    /** 渐变方向，附一个箭头帮助理解 CSS 角度 */
    static String angle(int degrees) {
        return degrees + "° " + arrow(degrees);
    }

    /** 发光强度倍率 */
    static String glow(int tick) {
        return String.format(Locale.ROOT, "%.2f×", tick / (double) HUNDREDTHS);
    }

    /** CSS 角度 → 箭头：0 自下而上（↑），90 从左到右（→），按 45° 取最近的方向 */
    static String arrow(int degrees) {
        int normalized = ((degrees % 360) + 360) % 360;
        return ARROWS[(int) Math.round(normalized / 45.0) % ARROWS.length];
    }
}
