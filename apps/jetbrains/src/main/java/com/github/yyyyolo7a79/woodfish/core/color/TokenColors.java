package com.github.yyyyolo7a79.woodfish.core.color;

import java.awt.Color;

/**
 * 一个 token 派生出的全部颜色（不可变），由 {@link TokenColorDeriver#derive} 生成。
 *
 * <p>渐变沿 CSS 角度从 {@code light}（0%）经 {@code base}（50%）到 {@code dark}（100%），三者
 * alpha 相同。发光三层都是原色 RGB，只有 alpha 不同，分别对应原版 4 / 10 / 20 px 的
 * text-shadow（半径再乘发光强度）。
 *
 * <p>标点 token 在原版只画两层（2 / 6 px）：此时 {@code glowNear} / {@code glowMid}
 * 恰好就是原版的 punctuationNear / punctuationFar，{@code glowFar} 不使用。
 * 浅色主题下原版对所有 token 只画一层 2 px 的 {@code glowMid}。
 *
 * @param light       渐变起点：明度 +lightnessDelta、色相 −hueShift，已映射回 sRGB 色域
 * @param base        原色（保留原 alpha）
 * @param dark        渐变终点：明度 −lightnessDelta、色相 +hueShift，已映射回 sRGB 色域
 * @param glowNear    最内层发光
 * @param glowMid     中间层发光
 * @param glowFar     最外层发光
 * @param neutral     原色色度低于 {@link TokenColorDeriver#NEUTRAL_CHROMA_THRESHOLD}：
 *                    渐变借用锚点色相并补足色度，发光也更淡
 * @param punctuation 是否按纯标点派生
 */
public record TokenColors(Color light, Color base, Color dark,
                          Color glowNear, Color glowMid, Color glowFar,
                          boolean neutral, boolean punctuation) {
}
