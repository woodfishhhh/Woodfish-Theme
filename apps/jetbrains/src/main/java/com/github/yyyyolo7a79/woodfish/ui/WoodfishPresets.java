package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState.CustomPreset;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import com.github.yyyyolo7a79.woodfish.settings.NativeOptions;

/**
 * 效果预设：内置预设的定义，以及自定义预设的命名、保存与删除规则。
 *
 * <p>纯逻辑、不依赖 IDE 运行时：设置页和「保存为预设」动作共用这里的规则，
 * 两边对重名、上限、非法名称的判断才不会各说各话。
 *
 * <p>预设只携带渐变与发光参数，<b>从不改总开关</b>（与 VS Code 版一致：
 * 预设描述的是「看起来什么样」，开不开叠层是另一回事）。
 */
public final class WoodfishPresets {

    /** 预设名的最大长度（按 Unicode 码点计），再长在下拉框和弹窗里放不下 */
    public static final int MAX_NAME_LENGTH = 40;

    /**
     * 一个可以应用的预设。
     *
     * @param description 内置预设的一句话说明；自定义预设为空串
     */
    public record Preset(@NotNull String name, @NotNull String description, boolean builtIn,
                         @NotNull CustomPreset values, String id) {
        public Preset(String name, String description, boolean builtIn, CustomPreset values) {
            this(name, description, builtIn, values, null);
        }

        /** 把预设参数写进状态（不动总开关、预设列表和引导标记） */
        public void applyTo(@NotNull WoodfishState state) {
            var previous = state.options;
            values.applyTo(state);
            if (builtIn) previous.forEach((key, value) -> {
                if (!NativeOptions.PRESET_KEYS.contains(key)) state.options.put(key, value);
            });
        }
    }

    private static final List<Preset> BUILT_IN = readBuiltIns();

    private static List<Preset> readBuiltIns() {
        try (var reader = new java.io.InputStreamReader(java.util.Objects.requireNonNull(
                WoodfishPresets.class.getResourceAsStream("/woodfish/presets.json")), java.nio.charset.StandardCharsets.UTF_8)) {
            var result = new ArrayList<Preset>();
            for (var element : com.google.gson.JsonParser.parseReader(reader).getAsJsonArray()) {
                var preset = element.getAsJsonObject();
                String name = preset.get("label").getAsString();
                var values = CustomPreset.capture(name, new WoodfishState());
                preset.getAsJsonObject("values").entrySet().forEach(entry -> {
                    if (!entry.getValue().isJsonNull()) setValue(values, entry.getKey(), entry.getValue().getAsString());
                });
                result.add(new Preset(name, preset.get("description").getAsString(), true, values, preset.get("id").getAsString()));
            }
            return List.copyOf(result);
        } catch (java.io.IOException e) { throw new ExceptionInInitializerError(e); }
    }

    private static void setValue(CustomPreset p, String key, String value) {
        switch (key) {
            case "overlay.hueShift" -> p.hueShift = Double.parseDouble(value);
            case "overlay.lightnessDelta" -> p.lightnessDelta = Double.parseDouble(value);
            case "overlay.neutralChroma" -> p.neutralChroma = Double.parseDouble(value);
            case "overlay.angle" -> p.angle = Double.parseDouble(value);
            case "glow.intensity" -> p.glowIntensity = Double.parseDouble(value);
            case "syntaxGradient.enabled" -> p.syntaxGradientEnabled = Boolean.parseBoolean(value);
            case "glow.enabled" -> p.glowEnabled = Boolean.parseBoolean(value);
            default -> { if (NativeOptions.KEYS.contains(key)) NativeOptions.set(p.options, key, value); }
        }
    }

    static String displayName(Preset p) { return p.builtIn() ? WoodfishBundle.text("preset." + p.id()) : p.name(); }

    static String displayDescription(Preset p) {
        return p.builtIn() ? WoodfishBundle.text("preset." + p.id() + ".description") : WoodfishBundle.text("preset.custom");
    }

    private WoodfishPresets() { }

    // ==================== 查询 ====================

    /** 全部内置预设（顺序即展示顺序） */
    public static @NotNull List<Preset> builtIns() {
        return BUILT_IN;
    }

    /** 状态里保存的自定义预设（保持保存顺序） */
    public static @NotNull List<Preset> customs(@NotNull WoodfishState state) {
        List<Preset> result = new ArrayList<>();
        if (state.customPresets != null) {
            for (CustomPreset p : state.customPresets) {
                if (p != null && p.name != null && !p.name.isBlank()) {
                    result.add(new Preset(p.name, "", false, p.copy()));
                }
            }
        }
        return result;
    }

    /** 内置在前、自定义在后 */
    public static @NotNull List<Preset> all(@NotNull WoodfishState state) {
        List<Preset> result = new ArrayList<>(BUILT_IN);
        result.addAll(customs(state));
        return result;
    }

    /** 与当前效果参数完全一致的第一个预设（内置优先）；都不一致时返回 null */
    public static @Nullable Preset matching(@NotNull WoodfishState state) {
        for (Preset p : all(state)) {
            if (sameEffects(p.values(), state, p.builtIn())) {
                return p;
            }
        }
        return null;
    }

    /** 只比较效果参数，不比较名称和总开关 */
    public static boolean sameEffects(@NotNull CustomPreset p, @NotNull WoodfishState s) {
        return sameEffects(p, s, false);
    }

    private static boolean sameEffects(CustomPreset p, WoodfishState s, boolean builtIn) {
        boolean sameOptions = builtIn ? NativeOptions.PRESET_KEYS.stream().allMatch(key ->
                java.util.Objects.equals(p.options.get(key), s.options.get(key))) : p.options.equals(s.options);
        return sameOptions && Double.compare(p.hueShift, s.hueShift) == 0
                && Double.compare(p.lightnessDelta, s.lightnessDelta) == 0
                && Double.compare(p.neutralChroma, s.neutralChroma) == 0
                && Double.compare(p.angle, s.angle) == 0
                && p.syntaxGradientEnabled == s.syntaxGradientEnabled
                && p.cjkGradientEnabled == s.cjkGradientEnabled
                && p.glowEnabled == s.glowEnabled
                && Double.compare(p.glowIntensity, s.glowIntensity) == 0;
    }

    public static boolean isBuiltInName(@NotNull String name) {
        String stripped = name.strip();
        return BUILT_IN.stream().anyMatch(p -> p.name().equals(stripped) || displayName(p).equals(stripped));
    }

    /** 按名称找自定义预设（名称先去掉首尾空白，与 WoodfishState.normalize 的规则一致） */
    public static @Nullable CustomPreset findCustom(@NotNull WoodfishState state, @NotNull String name) {
        String stripped = name.strip();
        if (state.customPresets != null) {
            for (CustomPreset p : state.customPresets) {
                if (p != null && stripped.equals(p.name)) {
                    return p;
                }
            }
        }
        return null;
    }

    /** 一句话概括预设参数，自定义预设没有说明时用它代替 */
    public static @NotNull String summary(@NotNull CustomPreset p) {
        List<String> parts = new ArrayList<>();
        if (p.syntaxGradientEnabled) {
            parts.add(WoodfishBundle.text("state.gradient", number(p.hueShift)));
        } else {
            parts.add(WoodfishBundle.text("state.gradient.off"));
        }
        if (!p.cjkGradientEnabled && (p.syntaxGradientEnabled || p.glowEnabled)) {
            parts.add(WoodfishBundle.text("state.cjk.native"));
        }
        parts.add(p.glowEnabled ? WoodfishBundle.text("state.glow", String.format(Locale.ROOT, "%.2f×", p.glowIntensity)) : WoodfishBundle.text("state.glow.off"));
        return String.join(" · ", parts);
    }

    // ==================== 命名规则 ====================

    /** 「另存为」对话框的默认名：我的预设 1、我的预设 2 …… 取第一个没被占用的 */
    public static @NotNull String suggestName(@NotNull WoodfishState state) {
        for (int i = 1; ; i++) {
            String candidate = WoodfishBundle.text("preset.unnamed", Integer.toString(i));
            if (findCustom(state, candidate) == null) {
                return candidate;
            }
        }
    }

    /**
     * 校验预设名。与已有自定义预设重名<b>不算错误</b>（调用方应询问是否覆盖）。
     *
     * @return 错误提示；名称可用时返回 null
     */
    public static @Nullable String validateName(@Nullable String raw, @NotNull WoodfishState state) {
        String name = raw == null ? "" : raw.strip();
        if (name.isEmpty()) {
            return WoodfishBundle.text("preset.name.empty");
        }
        if (name.codePointCount(0, name.length()) > MAX_NAME_LENGTH) {
            return WoodfishBundle.text("preset.name.long", MAX_NAME_LENGTH);
        }
        if (isBuiltInName(name)) {
            return WoodfishBundle.text("preset.name.reserved");
        }
        if (findCustom(state, name) == null && customCount(state) >= WoodfishState.MAX_CUSTOM_PRESETS) {
            return WoodfishBundle.text("preset.name.limit", WoodfishState.MAX_CUSTOM_PRESETS);
        }
        return null;
    }

    // ==================== 修改（就地改传入的状态） ====================

    /**
     * 把状态当前的效果参数保存为预设：同名则原位覆盖（保留列表顺序），否则追加到末尾。
     * 调用方应先用 {@link #validateName} 校验。
     */
    public static void saveCurrent(@NotNull WoodfishState state, @NotNull String name) {
        String stripped = name.strip();
        CustomPreset captured = CustomPreset.capture(stripped, state);
        if (state.customPresets == null) {
            state.customPresets = new ArrayList<>();
        }
        for (int i = 0; i < state.customPresets.size(); i++) {
            CustomPreset existing = state.customPresets.get(i);
            if (existing != null && stripped.equals(existing.name)) {
                state.customPresets.set(i, captured);
                return;
            }
        }
        state.customPresets.add(captured);
    }

    /** @return 是否真的删掉了 */
    public static boolean remove(@NotNull WoodfishState state, @NotNull String name) {
        String stripped = name.strip();
        return state.customPresets != null
                && state.customPresets.removeIf(p -> p != null && stripped.equals(p.name));
    }

    private static int customCount(WoodfishState state) {
        return state.customPresets == null ? 0 : (int) state.customPresets.stream()
                .filter(p -> p != null && p.name != null && !p.name.isBlank())
                .count();
    }

    /** 去掉多余的 0：24.0 → 24，0.060 → 0.06 */
    static String number(double value) {
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }
}
