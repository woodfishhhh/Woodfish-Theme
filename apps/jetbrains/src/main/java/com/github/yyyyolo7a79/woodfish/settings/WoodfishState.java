package com.github.yyyyolo7a79.woodfish.settings;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Woodfish 的持久化状态（由 {@link WoodfishSettings} 读写 {@code woodfish-theme.xml}）。
 *
 * <p>字段必须是 public 且带默认值：IntelliJ 的 XmlSerializer 只序列化 public 字段，
 * 并且只写出与默认值不同的项。参数语义与取值范围和 VS Code 版的
 * {@code woodfishTheme.overlay.*} / {@code glow.*} 保持一致，便于对照迁移。
 *
 * <p>彩色光标暂不移植（会与 Neovide Cursor 插件抢原生光标），这里不放任何光标字段。
 */
public final class WoodfishState {

    public static final int CURRENT_MIGRATION_VERSION = 2;

    // ===== 范围常量：与 VS Code 版 normalizeRuntimeSettings 的上下限一致 =====
    public static final double HUE_SHIFT_MIN = SharedDefaults.number("overlay.hueShift.min"),
            HUE_SHIFT_MAX = SharedDefaults.number("overlay.hueShift.max");
    public static final double LIGHTNESS_DELTA_MIN = SharedDefaults.number("overlay.lightnessDelta.min"),
            LIGHTNESS_DELTA_MAX = SharedDefaults.number("overlay.lightnessDelta.max");
    public static final double NEUTRAL_CHROMA_MIN = SharedDefaults.number("overlay.neutralChroma.min"),
            NEUTRAL_CHROMA_MAX = SharedDefaults.number("overlay.neutralChroma.max");
    public static final double ANGLE_MIN = SharedDefaults.number("overlay.angle.min"),
            ANGLE_MAX = SharedDefaults.number("overlay.angle.max");
    public static final double GLOW_INTENSITY_MIN = SharedDefaults.number("glow.intensity.min"),
            GLOW_INTENSITY_MAX = SharedDefaults.number("glow.intensity.max");

    // ===== 默认值 =====
    public static final double DEFAULT_HUE_SHIFT = 24;
    public static final double DEFAULT_LIGHTNESS_DELTA = 0.06;
    public static final double DEFAULT_NEUTRAL_CHROMA = 0.06;
    public static final double DEFAULT_ANGLE = 90;
    public static final double DEFAULT_GLOW_INTENSITY = 1.0;

    /** 自定义预设数量上限，防止配置文件无限膨胀 */
    public static final int MAX_CUSTOM_PRESETS = 32;

    /** 叠层总开关：关闭后保留其余参数 */
    public boolean overlayEnabled = true;

    /** 渐变两端的色相偏移（度） */
    public double hueShift = DEFAULT_HUE_SHIFT;

    /** 渐变两端的 OKLCH 明度变化 */
    public double lightnessDelta = DEFAULT_LIGHTNESS_DELTA;

    /** 给白色、灰色等低色度文字补的色度 */
    public double neutralChroma = DEFAULT_NEUTRAL_CHROMA;

    /** 渐变方向（CSS 角度：0 = 自下而上，90 = 从左到右） */
    public double angle = DEFAULT_ANGLE;

    /** A：渐变语法 */
    public boolean syntaxGradientEnabled = true;

    /**
     * 中日韩文字是否参与渐变与发光；关闭时只保留 IDE 原生的单次绘制。
     *
     * <p>1.0.4 ~ 1.0.6 叠加渐变会产生重影（原生光栅化的字被退成灰度重画，见 editor.NativeGlyphs），
     * 1.0.6 因此默认关闭；1.0.7 改为逐字纯色重画、发光按编辑器位置排字，默认重新开启。
     */
    public boolean cjkGradientEnabled = true;

    /** 持久化设置迁移版本（2 起不再强制关闭中日韩效果） */
    public int migrationVersion = 0;

    /** G：文字发光 */
    public boolean glowEnabled = true;

    /** 发光强度倍率 */
    public double glowIntensity = DEFAULT_GLOW_INTENSITY;

    /** 用户保存的预设（名称唯一） */
    public List<CustomPreset> customPresets = new ArrayList<>();

    /** 首次安装引导通知是否已经弹过 */
    public boolean welcomeShown = false;

    /**
     * 一套可保存、可应用的效果参数。
     *
     * <p>同样要求 public 字段 + 无参构造，供 XmlSerializer 使用。
     */
    public static final class CustomPreset {
        public String name = "";
        public double hueShift = DEFAULT_HUE_SHIFT;
        public double lightnessDelta = DEFAULT_LIGHTNESS_DELTA;
        public double neutralChroma = DEFAULT_NEUTRAL_CHROMA;
        public double angle = DEFAULT_ANGLE;
        public boolean syntaxGradientEnabled = true;
        public boolean cjkGradientEnabled = true;
        public boolean glowEnabled = true;
        public double glowIntensity = DEFAULT_GLOW_INTENSITY;

        public CustomPreset() {
        }

        /** 从当前状态截取一份预设 */
        public static CustomPreset capture(String name, WoodfishState s) {
            CustomPreset p = new CustomPreset();
            p.name = name;
            p.hueShift = s.hueShift;
            p.lightnessDelta = s.lightnessDelta;
            p.neutralChroma = s.neutralChroma;
            p.angle = s.angle;
            p.syntaxGradientEnabled = s.syntaxGradientEnabled;
            p.cjkGradientEnabled = s.cjkGradientEnabled;
            p.glowEnabled = s.glowEnabled;
            p.glowIntensity = s.glowIntensity;
            return p;
        }

        /** 把预设写回状态（不动总开关和预设列表本身） */
        public void applyTo(WoodfishState s) {
            s.hueShift = hueShift;
            s.lightnessDelta = lightnessDelta;
            s.neutralChroma = neutralChroma;
            s.angle = angle;
            s.syntaxGradientEnabled = syntaxGradientEnabled;
            s.cjkGradientEnabled = cjkGradientEnabled;
            s.glowEnabled = glowEnabled;
            s.glowIntensity = glowIntensity;
        }

        public CustomPreset copy() {
            CustomPreset p = new CustomPreset();
            p.name = name;
            p.hueShift = hueShift;
            p.lightnessDelta = lightnessDelta;
            p.neutralChroma = neutralChroma;
            p.angle = angle;
            p.syntaxGradientEnabled = syntaxGradientEnabled;
            p.cjkGradientEnabled = cjkGradientEnabled;
            p.glowEnabled = glowEnabled;
            p.glowIntensity = glowIntensity;
            return p;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof CustomPreset p)) {
                return false;
            }
            return Objects.equals(name, p.name)
                    && Double.compare(hueShift, p.hueShift) == 0
                    && Double.compare(lightnessDelta, p.lightnessDelta) == 0
                    && Double.compare(neutralChroma, p.neutralChroma) == 0
                    && Double.compare(angle, p.angle) == 0
                    && syntaxGradientEnabled == p.syntaxGradientEnabled
                    && cjkGradientEnabled == p.cjkGradientEnabled
                    && glowEnabled == p.glowEnabled
                    && Double.compare(glowIntensity, p.glowIntensity) == 0;
        }

        @Override
        public int hashCode() {
            return Objects.hash(name, hueShift, lightnessDelta, neutralChroma, angle,
                    syntaxGradientEnabled, cjkGradientEnabled, glowEnabled, glowIntensity);
        }
    }

    /** 深拷贝：设置页编辑副本、持久化快照都用它，避免共享可变列表 */
    public WoodfishState copy() {
        WoodfishState s = new WoodfishState();
        s.overlayEnabled = overlayEnabled;
        s.hueShift = hueShift;
        s.lightnessDelta = lightnessDelta;
        s.neutralChroma = neutralChroma;
        s.angle = angle;
        s.syntaxGradientEnabled = syntaxGradientEnabled;
        s.cjkGradientEnabled = cjkGradientEnabled;
        s.migrationVersion = migrationVersion;
        s.glowEnabled = glowEnabled;
        s.glowIntensity = glowIntensity;
        s.welcomeShown = welcomeShown;
        s.customPresets = new ArrayList<>();
        if (customPresets != null) {
            for (CustomPreset p : customPresets) {
                if (p != null) {
                    s.customPresets.add(p.copy());
                }
            }
        }
        return s;
    }

    /**
     * 升级旧配置的迁移标记。版本 1（1.0.6）曾把中日韩效果强制关闭以规避重影；1.0.7 修好了重影，
     * 不再改动该选项：未写入配置的旧值随新默认开启，用户显式保存的选择原样保留。
     */
    WoodfishState migrateLegacySettings() {
        if (migrationVersion < CURRENT_MIGRATION_VERSION) {
            migrationVersion = CURRENT_MIGRATION_VERSION;
        }
        return this;
    }

    /**
     * 把所有字段收回合法范围（就地修改并返回自身）。
     *
     * <p>配置文件可能被手改、被旧版本写入，或经设置同步带来非法值；
     * NaN / 越界一律回到默认值或边界，与 VS Code 版 sanitizeNumber 的语义一致。
     */
    public WoodfishState normalize() {
        hueShift = clamp(hueShift, HUE_SHIFT_MIN, HUE_SHIFT_MAX, DEFAULT_HUE_SHIFT);
        lightnessDelta = clamp(lightnessDelta, LIGHTNESS_DELTA_MIN, LIGHTNESS_DELTA_MAX,
                DEFAULT_LIGHTNESS_DELTA);
        neutralChroma = clamp(neutralChroma, NEUTRAL_CHROMA_MIN, NEUTRAL_CHROMA_MAX,
                DEFAULT_NEUTRAL_CHROMA);
        angle = clamp(angle, ANGLE_MIN, ANGLE_MAX, DEFAULT_ANGLE);
        glowIntensity = clamp(glowIntensity, GLOW_INTENSITY_MIN, GLOW_INTENSITY_MAX,
                DEFAULT_GLOW_INTENSITY);

        // 预设：丢弃空名与重名（保留先出现的），并限制数量
        List<CustomPreset> cleaned = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        if (customPresets != null) {
            for (CustomPreset p : customPresets) {
                if (p == null || p.name == null || p.name.isBlank()) {
                    continue;
                }
                p.name = p.name.strip();
                if (!seen.add(p.name) || cleaned.size() >= MAX_CUSTOM_PRESETS) {
                    continue;
                }
                p.hueShift = clamp(p.hueShift, HUE_SHIFT_MIN, HUE_SHIFT_MAX, DEFAULT_HUE_SHIFT);
                p.lightnessDelta = clamp(p.lightnessDelta, LIGHTNESS_DELTA_MIN,
                        LIGHTNESS_DELTA_MAX, DEFAULT_LIGHTNESS_DELTA);
                p.neutralChroma = clamp(p.neutralChroma, NEUTRAL_CHROMA_MIN,
                        NEUTRAL_CHROMA_MAX, DEFAULT_NEUTRAL_CHROMA);
                p.angle = clamp(p.angle, ANGLE_MIN, ANGLE_MAX, DEFAULT_ANGLE);
                p.glowIntensity = clamp(p.glowIntensity, GLOW_INTENSITY_MIN,
                        GLOW_INTENSITY_MAX, DEFAULT_GLOW_INTENSITY);
                cleaned.add(p);
            }
        }
        customPresets = cleaned;
        return this;
    }

    /** 把效果参数恢复默认（不动总开关、预设列表和引导标记），对应「Woodfish 默认」预设 */
    public void resetEffects() {
        WoodfishState d = new WoodfishState();
        hueShift = d.hueShift;
        lightnessDelta = d.lightnessDelta;
        neutralChroma = d.neutralChroma;
        angle = d.angle;
        syntaxGradientEnabled = d.syntaxGradientEnabled;
        cjkGradientEnabled = d.cjkGradientEnabled;
        glowEnabled = d.glowEnabled;
        glowIntensity = d.glowIntensity;
    }

    private static double clamp(double value, double min, double max, double fallback) {
        if (!Double.isFinite(value)) {
            return fallback;
        }
        return Math.max(min, Math.min(max, value));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof WoodfishState s)) {
            return false;
        }
        return overlayEnabled == s.overlayEnabled
                && Double.compare(hueShift, s.hueShift) == 0
                && Double.compare(lightnessDelta, s.lightnessDelta) == 0
                && Double.compare(neutralChroma, s.neutralChroma) == 0
                && Double.compare(angle, s.angle) == 0
                && syntaxGradientEnabled == s.syntaxGradientEnabled
                && cjkGradientEnabled == s.cjkGradientEnabled
                && migrationVersion == s.migrationVersion
                && glowEnabled == s.glowEnabled
                && Double.compare(glowIntensity, s.glowIntensity) == 0
                && welcomeShown == s.welcomeShown
                && Objects.equals(customPresets, s.customPresets);
    }

    @Override
    public int hashCode() {
        return Objects.hash(overlayEnabled, hueShift, lightnessDelta, neutralChroma, angle,
                syntaxGradientEnabled, cjkGradientEnabled, migrationVersion, glowEnabled, glowIntensity,
                welcomeShown, customPresets);
    }
}
