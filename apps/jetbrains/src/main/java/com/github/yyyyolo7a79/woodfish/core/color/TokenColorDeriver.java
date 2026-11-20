package com.github.yyyyolo7a79.woodfish.core.color;

import java.awt.Color;
import java.util.concurrent.atomic.AtomicReferenceArray;

/**
 * 按一组效果参数为 token 颜色派生渐变与发光颜色，逐项对应原版 deriveTokenColors。
 *
 * <p>参数在构造时固定；效果参数或锚点色相变化时新建实例，旧缓存随旧实例一起丢弃。
 * {@link #derive} 线程安全，EDT 绘制与后台发光线程可以同时调用。
 */
public final class TokenColorDeriver {

    /** 色度低于此值视为中性色（白、灰），与原版相同 */
    public static final double NEUTRAL_CHROMA_THRESHOLD = 0.045;

    // 缓存：4 路组相联，共 4096 条。不用 ConcurrentHashMap<Long, …>：Long 键装箱会让每次命中都分配对象。
    // 条目不可变，经 AtomicReferenceArray 的 release / acquire 发布，读到的条目总是完整的；
    // 同一组并发插入时可能挤掉某条，只会让它下次重新计算。
    private static final int WAYS = 4;
    private static final int SETS = 1024;

    private final double hueShift;
    private final double lightnessDelta;
    private final double neutralChroma;
    private final double anchorHue;
    private final AtomicReferenceArray<Entry> cache = new AtomicReferenceArray<>(SETS * WAYS);

    /**
     * 用一组效果参数（取值范围由设置层规范化）与锚点色相构造。
     *
     * @param hueShift       渐变两端的色相偏移（度）
     * @param lightnessDelta 渐变两端的 OKLCH 明度变化
     * @param neutralChroma  给中性色补的色度
     * @param anchorHue      中性色借用的色相，通常来自 {@link AnchorHue#resolve}
     * @throws IllegalArgumentException 任一参数不是有限值
     */
    public TokenColorDeriver(double hueShift, double lightnessDelta, double neutralChroma,
                             double anchorHue) {
        this.hueShift = requireFinite(hueShift, "hueShift");
        this.lightnessDelta = requireFinite(lightnessDelta, "lightnessDelta");
        this.neutralChroma = requireFinite(neutralChroma, "neutralChroma");
        this.anchorHue = requireFinite(anchorHue, "anchorHue");
    }

    /** 构造时给定的锚点色相：调用方可据此判断锚点变化后是否需要换新实例 */
    public double anchorHue() {
        return anchorHue;
    }

    /**
     * 派生 {@code source} 的渐变与发光颜色。
     *
     * <p>缓存键是 {@code source.getRGB()}（含 alpha）与 {@code punctuation}，命中时不分配对象。
     * {@code source} 可以是 JBColor 这类随主题变化的颜色：每次调用只读一次 {@code getRGB()}，
     * 返回的都是普通 {@link Color} 快照。
     *
     * @param punctuation token 文本是否只由标点组成（见 {@link TextClassifier#isPunctuationOnly}）
     */
    public TokenColors derive(Color source, boolean punctuation) {
        int argb = source.getRGB();
        int first = setIndex(argb, punctuation) * WAYS;
        for (int i = first; i < first + WAYS; i++) {
            Entry entry = cache.getAcquire(i);
            if (entry != null && entry.argb == argb && entry.punctuation == punctuation) {
                return entry.colors;
            }
        }
        TokenColors colors = compute(argb, punctuation);
        // 新条目放在组首，其余依次后移，挤掉最旧的一条
        for (int i = first + WAYS - 1; i > first; i--) {
            cache.setRelease(i, cache.getAcquire(i - 1));
        }
        cache.setRelease(first, new Entry(argb, punctuation, colors));
        return colors;
    }

    private TokenColors compute(int argb, boolean punctuation) {
        int red = (argb >> 16) & 0xFF;
        int green = (argb >> 8) & 0xFF;
        int blue = argb & 0xFF;
        double alpha = (argb >>> 24) / 255.0;
        Oklch base = ColorMath.rgbToOklch(red, green, blue);
        boolean neutral = base.c() < NEUTRAL_CHROMA_THRESHOLD;
        double hue = neutral ? anchorHue : base.h();
        double chroma = neutral ? Math.max(base.c(), neutralChroma) : base.c();
        double[] light = ColorMath.gamutMap(new Oklch(
                ColorMath.offsetLightness(base.l(), lightnessDelta), chroma, hue - hueShift));
        double[] dark = ColorMath.gamutMap(new Oklch(
                ColorMath.offsetLightness(base.l(), -lightnessDelta), chroma, hue + hueShift));
        // 发光 alpha 系数（乘在原 alpha 上）：标点最淡，中性色次之
        double nearOpacity = punctuation ? 0.28 : neutral ? 0.58 : 0.72;
        double midOpacity = punctuation ? 0.12 : neutral ? 0.28 : 0.42;
        double farOpacity = neutral ? 0.12 : 0.2;
        double[] rgb = {red, green, blue};
        return new TokenColors(
                ColorMath.toColor(light, alpha),
                new Color(argb, true),
                ColorMath.toColor(dark, alpha),
                ColorMath.toColor(rgb, alpha * nearOpacity),
                ColorMath.toColor(rgb, alpha * midOpacity),
                ColorMath.toColor(rgb, alpha * farOpacity),
                neutral,
                punctuation);
    }

    /** murmur3 的 fmix32：让相近的颜色（同一主题的色板往往只差几个通道值）散到不同的组 */
    private static int setIndex(int argb, boolean punctuation) {
        int h = punctuation ? argb ^ 0x9E3779B9 : argb;
        h ^= h >>> 16;
        h *= 0x85EBCA6B;
        h ^= h >>> 13;
        h *= 0xC2B2AE35;
        h ^= h >>> 16;
        return h & (SETS - 1);
    }

    private static double requireFinite(double value, String name) {
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException(name + " 必须是有限值：" + value);
        }
        return value;
    }

    private record Entry(int argb, boolean punctuation, TokenColors colors) {
    }
}
