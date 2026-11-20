package com.github.yyyyolo7a79.woodfish.core.color;

/**
 * 不可变的 OKLCH 颜色，对应原版的 {@code {l, c, h}} 对象。
 *
 * <p>不做任何规范化：色相直接保留 {@code atan2} 的结果（-180..180 度），派生时加减偏移后也不取模。
 * cos / sin 本身是周期函数，取模只会引入与原版不同的舍入。
 *
 * @param l 感知明度，sRGB 色域内为 0..1
 * @param c 色度，≥ 0
 * @param h 色相（度）
 */
public record Oklch(double l, double c, double h) {
}
