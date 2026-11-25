package com.github.yyyyolo7a79.woodfish.settings;

/**
 * 渲染层使用的不可变设置快照。
 *
 * <p>由 {@link WoodfishSettings} 在每次设置变化时重新生成并经
 * {@link WoodfishSettingsListener#TOPIC} 广播；渲染代码只读它，不直接碰可变的
 * {@link WoodfishState}，因此可以安全地在绘制线程之外（如发光缓存的后台线程）传递。
 *
 * @param version 单调递增的版本号：缓存可以用它判断派生颜色是否过期
 */
public record EffectSettings(
        boolean overlayEnabled,
        double hueShift,
        double lightnessDelta,
        double neutralChroma,
        double angle,
        boolean syntaxGradient,
        boolean cjkGradientEnabled,
        boolean glow,
        double glowIntensity,
        long version, java.util.Map<String, String> options) {

    public String value(String key) { return NativeOptions.get(options, key); }
    public boolean on(String key) { return Boolean.parseBoolean(value(key)); }
    public double number(String key) { return Double.parseDouble(value(key)); }

    public EffectSettings forScheme(String name) {
        var scoped = new java.util.HashMap<>(options);
        String prefix = "theme." + name.replaceFirst("^_@user_", "").replace(' ', '_') + ".";
        for (String key : NativeOptions.KEYS) {
            String themed = NativeOptions.schema(prefix + key);
            if (themed != null) scoped.putIfAbsent(key, themed);
        }
        return new EffectSettings(overlayEnabled, hueShift, lightnessDelta, neutralChroma, angle, syntaxGradient,
                cjkGradientEnabled, glow, glowIntensity, version, java.util.Map.copyOf(scoped));
    }

    /** 由（已规范化的）状态生成快照 */
    public static EffectSettings from(WoodfishState s, long version) {
        return new EffectSettings(
                s.overlayEnabled,
                s.hueShift,
                s.lightnessDelta,
                s.neutralChroma,
                s.angle,
                s.syntaxGradientEnabled,
                s.cjkGradientEnabled,
                s.glowEnabled,
                s.glowIntensity,
                version, java.util.Map.copyOf(s.options));
    }

    /** A：渐变语法是否实际生效（总开关 && 分项开关） */
    public boolean gradientActive() {
        return overlayEnabled && syntaxGradient;
    }

    /** G：文字发光是否实际生效 */
    public boolean glowActive() {
        return overlayEnabled && glow;
    }

    /** 是否有任何效果层在工作；全关时渲染器应直接返回、不做任何计算 */
    public boolean anyActive() {
        return gradientActive() || glowActive();
    }
}
