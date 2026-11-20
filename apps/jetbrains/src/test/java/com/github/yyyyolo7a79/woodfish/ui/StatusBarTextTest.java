package com.github.yyyyolo7a79.woodfish.ui;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import org.junit.jupiter.api.Test;

class StatusBarTextTest {

    private static EffectSettings settings(boolean overlay, boolean gradient, boolean glow) {
        return new EffectSettings(overlay, 24, 0.06, 0.06, 90, gradient, false, glow, 1.0, 1);
    }

    @Test
    void lettersListOnlyActiveLayers() {
        assertEquals("Woodfish on · AG", StatusBarText.text(settings(true, true, true)));
        assertEquals("Woodfish on · A", StatusBarText.text(settings(true, true, false)));
        assertEquals("Woodfish on · G", StatusBarText.text(settings(true, false, true)));
    }

    @Test
    void offWhenMasterSwitchOffOrNothingActive() {
        assertEquals("Woodfish off", StatusBarText.text(settings(false, true, true)));
        assertEquals("Woodfish off", StatusBarText.text(settings(true, false, false)));
    }

    @Test
    void tooltipExplainsLettersAndPendingLayers() {
        String on = StatusBarText.tooltip(settings(true, true, true));
        assertTrue(on.startsWith("<html>") && on.endsWith("</html>"));
        assertTrue(on.contains("A 渐变语法"));
        assertTrue(on.contains("G 文字发光"));
        assertTrue(on.contains("强度 1.00×"));
        assertTrue(on.contains("点击打开功能菜单"));

        // 总开关关着：分项开关如实显示「开启」，但说明暂不生效
        String off = StatusBarText.tooltip(settings(false, true, false));
        assertTrue(off.contains("已关闭"));
        assertTrue(off.contains("开启（总开关关闭，暂不生效）"));
    }
}
