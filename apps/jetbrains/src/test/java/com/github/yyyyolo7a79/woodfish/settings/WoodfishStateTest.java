package com.github.yyyyolo7a79.woodfish.settings;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WoodfishStateTest {

    @Test
    void 默认值与原版一致() {
        WoodfishState s = new WoodfishState();
        assertTrue(s.overlayEnabled);
        assertEquals(32, s.hueShift);
        assertEquals(0.12, s.lightnessDelta);
        assertEquals(0.075, s.neutralChroma);
        assertEquals(45, s.angle);
        assertTrue(s.syntaxGradientEnabled);
        assertTrue(s.cjkGradientEnabled, "1.0.7 起中日韩逐字纯色重画，默认参与效果");
        assertTrue(s.glowEnabled);
        assertEquals(1.0, s.glowIntensity);
        assertEquals(s, s.copy().normalize(), "默认值本身必须是合法值");
    }

    @Test
    void 迁移不再改动中日韩效果开关() {
        WoodfishState legacy = new WoodfishState(); // 旧配置没写这一项：随新默认开启
        legacy.migrateLegacySettings();
        assertTrue(legacy.cjkGradientEnabled);
        assertEquals(WoodfishState.CURRENT_MIGRATION_VERSION, legacy.migrationVersion);

        WoodfishState explicit = new WoodfishState();
        explicit.cjkGradientEnabled = false; // 用户显式关闭的选择必须保留
        explicit.migrationVersion = 1;
        explicit.migrateLegacySettings();
        assertFalse(explicit.cjkGradientEnabled);
        assertEquals(WoodfishState.CURRENT_MIGRATION_VERSION, explicit.migrationVersion);
    }

    @Test
    void 越界与非法数值被收回范围() {
        WoodfishState s = new WoodfishState();
        s.hueShift = 999;
        s.lightnessDelta = -1;
        s.neutralChroma = Double.NaN;
        s.angle = Double.POSITIVE_INFINITY;
        s.glowIntensity = 0;
        s.normalize();
        assertEquals(WoodfishState.HUE_SHIFT_MAX, s.hueShift);
        assertEquals(WoodfishState.LIGHTNESS_DELTA_MIN, s.lightnessDelta);
        assertEquals(WoodfishState.DEFAULT_NEUTRAL_CHROMA, s.neutralChroma, "NaN 回到默认值");
        assertEquals(WoodfishState.DEFAULT_ANGLE, s.angle, "无穷大回到默认值");
        assertEquals(WoodfishState.GLOW_INTENSITY_MIN, s.glowIntensity);
    }

    @Test
    void 预设去掉空名与重名并限制数量() {
        WoodfishState s = new WoodfishState();
        s.customPresets = new ArrayList<>();
        s.customPresets.add(null);
        s.customPresets.add(preset("  "));
        s.customPresets.add(preset(" 我的 "));
        s.customPresets.add(preset("我的"));
        for (int i = 0; i < WoodfishState.MAX_CUSTOM_PRESETS + 5; i++) {
            s.customPresets.add(preset("p" + i));
        }
        s.normalize();
        assertEquals(WoodfishState.MAX_CUSTOM_PRESETS, s.customPresets.size());
        assertEquals("我的", s.customPresets.get(0).name, "名称去首尾空白，重名保留先出现的");
        assertEquals("p0", s.customPresets.get(1).name);
    }

    @Test
    void 预设参数同样被规范化() {
        WoodfishState s = new WoodfishState();
        WoodfishState.CustomPreset p = preset("x");
        p.hueShift = -10;
        p.glowIntensity = 99;
        s.customPresets = new ArrayList<>(List.of(p));
        s.normalize();
        assertEquals(0, s.customPresets.get(0).hueShift);
        assertEquals(WoodfishState.GLOW_INTENSITY_MAX, s.customPresets.get(0).glowIntensity);
    }

    @Test
    void 深拷贝互不影响() {
        WoodfishState s = new WoodfishState();
        s.customPresets.add(preset("a"));
        WoodfishState c = s.copy();
        assertEquals(s, c);
        assertNotSame(s.customPresets, c.customPresets);
        assertNotSame(s.customPresets.get(0), c.customPresets.get(0));
        c.customPresets.get(0).hueShift = 1;
        c.cjkGradientEnabled = false;
        c.glowEnabled = false;
        assertNotEquals(s, c);
        assertEquals(24, s.customPresets.get(0).hueShift);
        assertTrue(s.glowEnabled);
    }

    @Test
    void 预设截取与应用往返一致() {
        WoodfishState s = new WoodfishState();
        s.hueShift = 36;
        s.lightnessDelta = 0.09;
        s.glowIntensity = 1.6;
        s.syntaxGradientEnabled = false;
        s.cjkGradientEnabled = false;
        WoodfishState.CustomPreset p = WoodfishState.CustomPreset.capture("霓虹", s);

        WoodfishState target = new WoodfishState();
        target.overlayEnabled = false;
        p.applyTo(target);
        assertEquals(36, target.hueShift);
        assertEquals(0.09, target.lightnessDelta);
        assertEquals(1.6, target.glowIntensity);
        assertFalse(target.syntaxGradientEnabled);
        assertFalse(target.cjkGradientEnabled);
        assertFalse(target.overlayEnabled, "预设不改总开关");
        assertEquals(p, p.copy());
    }

    @Test
    void 恢复默认只动效果参数() {
        WoodfishState s = new WoodfishState();
        s.overlayEnabled = false;
        s.welcomeShown = true;
        s.customPresets.add(preset("keep"));
        s.hueShift = 100;
        s.glowEnabled = false;
        s.cjkGradientEnabled = false;
        s.resetEffects();
        assertEquals(32, s.hueShift);
        assertTrue(s.cjkGradientEnabled);
        assertTrue(s.glowEnabled);
        assertFalse(s.overlayEnabled);
        assertTrue(s.welcomeShown);
        assertEquals(1, s.customPresets.size());
    }

    @Test
    void 快照的生效判断() {
        WoodfishState s = new WoodfishState();
        assertTrue(EffectSettings.from(s, 1).anyActive());
        assertTrue(EffectSettings.from(s, 1).cjkGradientEnabled());
        s.cjkGradientEnabled = false;
        assertFalse(EffectSettings.from(s, 1).cjkGradientEnabled());
        s.overlayEnabled = false;
        EffectSettings off = EffectSettings.from(s, 2);
        assertFalse(off.gradientActive());
        assertFalse(off.glowActive());
        assertFalse(off.anyActive());
        s.overlayEnabled = true;
        s.syntaxGradientEnabled = false;
        EffectSettings glowOnly = EffectSettings.from(s, 3);
        assertFalse(glowOnly.gradientActive());
        assertTrue(glowOnly.glowActive());
    }

    private static WoodfishState.CustomPreset preset(String name) {
        WoodfishState.CustomPreset p = new WoodfishState.CustomPreset();
        p.name = name;
        return p;
    }

    @Test void legacyXmlRetainsOmittedDefaultsAndModernOptions() {
        var xml = new org.jdom.Element("CustomPreset");
        xml.addContent(new org.jdom.Element("option").setAttribute("name", "name").setAttribute("value", "Old"));
        var preset = com.intellij.util.xmlb.XmlSerializer.deserialize(xml, WoodfishState.CustomPreset.class);
        var state = new WoodfishState();
        state.options.put("background.enabled", "true"); state.options.put("caretTrail.enabled", "true");
        preset.copy().applyTo(state);
        assertEquals(24, state.hueShift); assertEquals(.06, state.lightnessDelta);
        assertEquals(.06, state.neutralChroma); assertEquals(90, state.angle);
        assertEquals(2, state.options.size());
        var saved = WoodfishState.CustomPreset.capture("New", new WoodfishState());
        assertEquals(1, saved.copy().schemaVersion); saved.applyTo(state); assertTrue(state.options.isEmpty());
    }
}
