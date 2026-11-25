package com.github.yyyyolo7a79.woodfish.ui;

import org.junit.jupiter.api.Test;
import javax.swing.UIDefaults;
import java.awt.Color;
import static org.junit.jupiter.api.Assertions.*;

class ThemeAppearanceTest {

    @Test void perThemeCaretDefaultsYieldToEditorSettings() {
        var state = new com.github.yyyyolo7a79.woodfish.settings.WoodfishState();
        var base = com.github.yyyyolo7a79.woodfish.settings.EffectSettings.from(state, 0);
        assertEquals(12, base.forScheme("_@user_Woodfish Dracula").number("cursor.animationDuration"));
        assertEquals(8, base.forScheme("Third-party").number("cursor.animationDuration"));
        com.github.yyyyolo7a79.woodfish.settings.NativeOptions.set(state.options, "cursor.animationDuration", "8");
        assertEquals(8, com.github.yyyyolo7a79.woodfish.settings.EffectSettings.from(state.normalize(), 0)
                .forScheme("Woodfish Dracula").number("cursor.animationDuration"));
        state.options.put("cursor.animationDuration", "5");
        assertEquals(5, com.github.yyyyolo7a79.woodfish.settings.EffectSettings.from(state, 0)
                .forScheme("Woodfish Dracula").number("cursor.animationDuration"));
    }

    @Test void persistedSquircleCornersSwitchControlsTheLookAndFeel() {
        var appearance = new ThemeAppearance();
        var table = new UIDefaults();
        table.put("Menu.Selection.arc", 10);
        var state = new com.github.yyyyolo7a79.woodfish.settings.WoodfishState();
        var initial = com.github.yyyyolo7a79.woodfish.settings.EffectSettings.from(state, 0);
        assertTrue(initial.on("squircleCorners.enabled"));
        assertTrue(appearance.apply(table, initial, "io.github.woodfishhhh.woodfishtheme.dark"));
        assertNotEquals(10, table.get("Menu.Selection.arc"));
        state.options.put("squircleCorners.enabled", "false");
        appearance.apply(table, com.github.yyyyolo7a79.woodfish.settings.EffectSettings.from(state.normalize(), 1), "io.github.woodfishhhh.woodfishtheme.dark");
        assertEquals(10, table.get("Menu.Selection.arc"));
    }

    @Test void preservesPillsAndHonorsGlassTargets() {
        var appearance = new ThemeAppearance();
        var table = new UIDefaults();
        table.put("Button.arc", 200);
        table.put("Menu.Selection.arc", 16);
        table.put("ToolTip.background", Color.WHITE);
        table.put("PopupMenu.background", Color.WHITE);
        appearance.apply(table, true, true, .5, "hover", 0);
        assertEquals(200, table.get("Button.arc"));
        assertEquals(28, table.get("Menu.Selection.arc"));
        assertEquals(128, ((Color) table.get("ToolTip.background")).getAlpha());
        assertSame(Color.WHITE, table.get("PopupMenu.background"));
        appearance.restore();
        assertEquals(16, table.get("Menu.Selection.arc"));
    }

    @Test void restoresNativeValuesAcrossThemeChangesAndRespectsOtherWriters() {
        var overrides = new ThemeAppearance();
        var first = new UIDefaults();
        first.put("Menu.Selection.arc", 4);
        first.put("PopupMenu.background", Color.WHITE);
        assertTrue(overrides.apply(first, true, true, .7, "menu", 0));
        assertEquals(4, first.get("Menu.Selection.arc"));
        assertEquals(179, ((Color) first.get("PopupMenu.background")).getAlpha());
        assertFalse(overrides.apply(first, true, true, .7, "menu", 0));
        first.put("Menu.Selection.arc", 30);
        var second = new UIDefaults();
        second.put("Menu.Selection.arc", 6);
        overrides.apply(second, true, false, 1, "menu", 0);
        assertEquals(30, first.get("Menu.Selection.arc"));
        assertSame(Color.WHITE, first.get("PopupMenu.background"));
        overrides.apply(second, false, false, 1, "menu", 0);
        assertEquals(6, second.get("Menu.Selection.arc"));
        assertFalse(second.containsKey("Button.arc"));
    }

    @Test void hoverGlassAndThirdPartyLookAndFeelLeaveUnrelatedArcsAlone() {
        var overrides = new ThemeAppearance();
        var table = new UIDefaults();
        table.put("Menu.Selection.arc", 8); table.put("Notification.arc", 6); table.put("GotItTooltip.arc", 10);
        overrides.apply(table, false, true, .5, "hover", 12);
        assertEquals(8, table.get("Menu.Selection.arc")); assertEquals(6, table.get("Notification.arc"));
        assertEquals(24, table.get("GotItTooltip.arc"));
        var thirdParty = new UIDefaults(); thirdParty.put("Button.arc", 16);
        assertTrue(overrides.apply(thirdParty, null, "third.party"));
        assertEquals(10, table.get("GotItTooltip.arc")); assertEquals(16, thirdParty.get("Button.arc"));
    }

    @Test void breadcrumbGlassLeavesCompletionAndShowUsagesSelectionArcUntouched() {
        var defaults = new UIDefaults();
        defaults.put("Popup.Selection.arc", 8);
        defaults.put("Popup.background", Color.WHITE);
        new ThemeAppearance().apply(defaults, false, true, .5, "breadcrumbPicker", 12);
        assertEquals(128, ((Color) defaults.get("Popup.background")).getAlpha());
        assertEquals(8, defaults.getInt("Popup.Selection.arc"));
    }
}
