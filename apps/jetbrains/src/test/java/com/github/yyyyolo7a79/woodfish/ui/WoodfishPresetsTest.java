package com.github.yyyyolo7a79.woodfish.ui;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState.CustomPreset;
import com.github.yyyyolo7a79.woodfish.ui.WoodfishPresets.Preset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class WoodfishPresetsTest {

    private static Preset builtIn(String name) {
        return WoodfishPresets.builtIns().stream()
                .filter(p -> p.name().equals(name))
                .findFirst()
                .orElseThrow(() -> new AssertionError("缺少内置预设：" + name));
    }

    @Test
    void builtInsFollowOriginalMinusCursorAndGlass() {
        List<String> names = WoodfishPresets.builtIns().stream().map(Preset::name).toList();
        assertEquals(List.of("Woodfish 默认", "柔和护眼", "霓虹全开", "怀旧（5.x）", "毛玻璃", "专注模式", "性能优先"), names);
        for (Preset p : WoodfishPresets.builtIns()) {
            assertTrue(p.builtIn());
            assertFalse(p.description().isBlank(), p.name() + " 缺少说明");
        }
    }

    @Test
    void builtInValuesMatchPresetsTs() {
        WoodfishState defaults = new WoodfishState();
        assertTrue(WoodfishPresets.sameEffects(builtIn("Woodfish 默认").values(), defaults));

        CustomPreset soft = builtIn("柔和护眼").values();
        assertEquals(12, soft.hueShift);
        assertEquals(0.04, soft.lightnessDelta);
        assertEquals(0.55, soft.glowIntensity);
        assertEquals(WoodfishState.DEFAULT_NEUTRAL_CHROMA, soft.neutralChroma);
        assertEquals(WoodfishState.DEFAULT_ANGLE, soft.angle);
        assertTrue(soft.syntaxGradientEnabled && soft.glowEnabled);

        CustomPreset neon = builtIn("霓虹全开").values();
        assertEquals(36, neon.hueShift);
        assertEquals(0.09, neon.lightnessDelta);
        assertEquals(1.6, neon.glowIntensity);

        CustomPreset focus = builtIn("专注模式").values();
        assertFalse(focus.syntaxGradientEnabled);
        assertFalse(focus.glowEnabled);
        assertEquals(WoodfishState.DEFAULT_HUE_SHIFT, focus.hueShift);

        CustomPreset performance = builtIn("性能优先").values();
        assertTrue(performance.syntaxGradientEnabled);
        assertFalse(performance.glowEnabled);
    }

    @Test
    void builtInValuesAreWithinRanges() {
        for (Preset p : WoodfishPresets.builtIns()) {
            WoodfishState s = new WoodfishState();
            p.applyTo(s);
            WoodfishState normalized = s.copy().normalize();
            assertEquals(normalized, s, p.name() + " 的参数越界，会被 normalize 改写");
        }
    }

    @Test
    void applyingPresetNeverTouchesMasterSwitchOrPresetList() {
        WoodfishState s = new WoodfishState();
        s.overlayEnabled = false;
        s.welcomeShown = true;
        WoodfishPresets.saveCurrent(s, "mine");
        builtIn("霓虹全开").applyTo(s);
        assertFalse(s.overlayEnabled);
        assertTrue(s.welcomeShown);
        assertEquals(1, s.customPresets.size());
        assertEquals(36, s.hueShift);
    }

    @Test
    void matchingPrefersBuiltInAndIgnoresMasterSwitch() {
        WoodfishState s = new WoodfishState();
        s.overlayEnabled = false;
        assertEquals("Woodfish 默认", WoodfishPresets.matching(s).name());

        builtIn("专注模式").applyTo(s);
        assertEquals("专注模式", WoodfishPresets.matching(s).name());

        s.hueShift = 77;
        assertNull(WoodfishPresets.matching(s));
        WoodfishPresets.saveCurrent(s, "七十七度");
        Preset match = WoodfishPresets.matching(s);
        assertNotNull(match);
        assertFalse(match.builtIn());
        assertEquals("七十七度", match.name());
    }

    @Test
    void validateNameRules() {
        WoodfishState s = new WoodfishState();
        assertEquals(UiLanguage.expected("名称不能为空", "Enter a name."), WoodfishPresets.validateName("   ", s));
        assertEquals(UiLanguage.expected("名称不能为空", "Enter a name."), WoodfishPresets.validateName(null, s));
        assertEquals(UiLanguage.expected("与内置预设重名，请换一个名字", "Choose a name different from the built-in presets."), WoodfishPresets.validateName(" 柔和护眼 ", s));
        assertNull(WoodfishPresets.validateName("夜间", s));

        String longest = "字".repeat(WoodfishPresets.MAX_NAME_LENGTH);
        assertNull(WoodfishPresets.validateName(longest, s));
        assertNotNull(WoodfishPresets.validateName(longest + "字", s));
        // 按码点计长度：一个 emoji 算一个字符
        assertNull(WoodfishPresets.validateName("🐟".repeat(WoodfishPresets.MAX_NAME_LENGTH), s));
    }

    @Test
    void limitBlocksNewNamesButAllowsOverwrite() {
        WoodfishState s = new WoodfishState();
        for (int i = 0; i < WoodfishState.MAX_CUSTOM_PRESETS; i++) {
            WoodfishPresets.saveCurrent(s, "p" + i);
        }
        assertNotNull(WoodfishPresets.validateName("新的", s));
        assertNull(WoodfishPresets.validateName("p3", s), "重名不算错误，由调用方确认覆盖");
    }

    @Test
    void saveOverwritesInPlaceAndRemoveDeletes() {
        WoodfishState s = new WoodfishState();
        WoodfishPresets.saveCurrent(s, "a");
        WoodfishPresets.saveCurrent(s, "b");
        s.hueShift = 99;
        WoodfishPresets.saveCurrent(s, " a ");
        assertEquals(2, s.customPresets.size());
        assertEquals("a", s.customPresets.get(0).name);
        assertEquals(99, s.customPresets.get(0).hueShift);
        assertEquals(WoodfishState.DEFAULT_HUE_SHIFT, s.customPresets.get(1).hueShift);

        assertTrue(WoodfishPresets.remove(s, "a"));
        assertFalse(WoodfishPresets.remove(s, "a"));
        assertEquals(List.of("b"), WoodfishPresets.customs(s).stream().map(Preset::name).toList());
    }

    @Test
    void savedPresetsSurviveNormalize() {
        WoodfishState s = new WoodfishState();
        WoodfishPresets.saveCurrent(s, "  带空格  ");
        WoodfishState normalized = s.copy().normalize();
        assertEquals(s, normalized, "保存时已去掉首尾空白，normalize 不应再改动");
        assertNotNull(WoodfishPresets.findCustom(normalized, "带空格"));
    }

    @Test
    void suggestNameSkipsTakenNumbers() {
        WoodfishState s = new WoodfishState();
        assertEquals(UiLanguage.expected("我的预设 1", "My preset 1"), WoodfishPresets.suggestName(s));
        WoodfishPresets.saveCurrent(s, UiLanguage.expected("我的预设 1", "My preset 1"));
        WoodfishPresets.saveCurrent(s, UiLanguage.expected("我的预设 2", "My preset 2"));
        assertEquals(UiLanguage.expected("我的预设 3", "My preset 3"), WoodfishPresets.suggestName(s));
        assertNull(WoodfishPresets.validateName(WoodfishPresets.suggestName(s), s));
    }

    @Test
    void allListsBuiltInsFirstWithUniqueNames() {
        WoodfishState s = new WoodfishState();
        WoodfishPresets.saveCurrent(s, "x");
        List<Preset> all = WoodfishPresets.all(s);
        assertEquals(WoodfishPresets.builtIns().size() + 1, all.size());
        assertTrue(all.get(0).builtIn());
        assertFalse(all.get(all.size() - 1).builtIn());
        Set<String> names = new HashSet<>();
        for (Preset p : all) {
            assertTrue(names.add(p.name()), "重名：" + p.name());
        }
    }

    @Test
    void summaryDescribesLayers() {
        CustomPreset p = CustomPreset.capture("p", new WoodfishState());
        assertEquals(UiLanguage.expected("渐变 ±32° · 发光 1.00×", "Gradient ±32° · Glow 1.00×"), WoodfishPresets.summary(p));
        p.cjkGradientEnabled = false;
        assertEquals(UiLanguage.expected("渐变 ±32° · 中日韩原生绘制 · 发光 1.00×", "Gradient ±32° · Native CJK glyphs · Glow 1.00×"), WoodfishPresets.summary(p));
        p.syntaxGradientEnabled = false;
        p.glowEnabled = false;
        assertEquals(UiLanguage.expected("渐变关 · 发光关", "Gradient off · Glow off"), WoodfishPresets.summary(p));
    }

    @Test
    void numberDropsTrailingZeros() {
        assertEquals("24", WoodfishPresets.number(24.0));
        assertEquals("0.06", WoodfishPresets.number(0.06));
        assertEquals("0", WoodfishPresets.number(0));
        assertEquals("1.6", WoodfishPresets.number(1.6));
    }

    @Test void backgroundSurvivesDefaultPresetAndStillMatches() {
        var s = new WoodfishState(); s.options.put("background.enabled", "true");
        var preset = WoodfishPresets.builtIns().getFirst(); preset.applyTo(s);
        assertEquals("true", s.options.get("background.enabled")); assertEquals(preset, WoodfishPresets.matching(s));
    }

    @Test void invalidVisibleColorBlocksSavingPreviousDraft() {
        var state = new WoodfishState(); var form = new NativeSettingsForm(() -> state, () -> {});
        var field = (javax.swing.JTextField) form.addField("typingParticles.color");
        field.setText("#ff0000"); field.setText("not a color");
        var errors = new java.util.ArrayList<String>();
        form.saveWhenValid(() -> WoodfishPresets.saveCurrent(state, "test"), error -> errors.add(error.getMessage()));
        assertEquals(1, errors.size()); assertTrue(state.customPresets.isEmpty());
        field.setText("#0000ff"); form.saveWhenValid(() -> WoodfishPresets.saveCurrent(state, "test"), e -> errors.add(e.getMessage()));
        assertEquals("#0000ff", state.customPresets.getFirst().options.get("typingParticles.color"));
    }
}
