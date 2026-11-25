package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import javax.swing.UIDefaults;
import javax.swing.plaf.ColorUIResource;
import java.awt.Color;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/** Reversible overrides of the active Swing look and feel's documented theme keys. EDT only. */
public final class ThemeAppearance {
    private static final String[] ARCS = {"Button.arc", "Component.arc", "DisclosureButton.arc", "Menu.Selection.arc",
            "Popup.Selection.arc", "PopupMenu.Selection.arc", "Tree.Selection.arc", "Notification.arc", "GotItTooltip.arc"};
    private static final Map<String, String[]> TINT_KEYS = Map.ofEntries(
            Map.entry("menu", new String[]{"Menu.background", "PopupMenu.background"}),
            Map.entry("hover", new String[]{"ToolTip.background", "Editor.ToolTip.background"}),
            Map.entry("suggest", new String[]{"CompletionPopup.background"}),
            Map.entry("quickInput", new String[]{"SearchEverywhere.Header.background", "SearchEverywhere.SearchField.background"}),
            Map.entry("notifications", new String[]{"Notification.background"}),
            Map.entry("editorWidget", new String[]{"Editor.SearchField.background"}),
            Map.entry("dropdown", new String[]{"ComboBox.background"}),
            Map.entry("breadcrumbPicker", new String[]{"Popup.background"}),
            Map.entry("debugToolbar", new String[]{"Popup.Toolbar.background"}),
            Map.entry("paneHeader", new String[]{"ToolWindow.Header.background", "ToolWindow.Header.inactiveBackground"}),
            Map.entry("dialog", new String[]{"AlertDialog.background"}));
    private record Change(Object previous, Object applied) {}
    private final Map<String, Change> changes = new LinkedHashMap<>();
    private UIDefaults table;
    private boolean rounded, glass;
    private double opacity, popupRadius;
    private String targets = "";

    public boolean apply(UIDefaults next, EffectSettings settings) {
        return apply(next, settings.on("squircleCorners.enabled"), settings.on("glass.enabled"), settings.number("glass.opacity"), settings.value("glass.targets"), settings.number("glass.borderRadius"));
    }

    boolean apply(UIDefaults next, boolean round, boolean tint, double alpha, String requestedTargets, double radius) {
        if (table == next && rounded == round && glass == tint && opacity == alpha && targets.equals(requestedTargets) && popupRadius == radius) return false;
        boolean changed = restore();
        table = next;
        rounded = round;
        glass = tint;
        opacity = alpha;
        targets = requestedTargets;
        popupRadius = radius;
        if (round) for (String key : ARCS) {
            if (table.get(key) instanceof Integer arc) set(key, ((Number) com.github.yyyyolo7a79.woodfish.core.SharedCore.call("roundedArc", arc)).intValue());
        }
        if (tint && radius > 0) {
            for (String key : new String[]{"Menu.Selection.arc", "Popup.Selection.arc", "PopupMenu.Selection.arc", "Notification.arc"}) {
                set(key, (int) Math.round(2 * radius));
            }
        }
        if (tint) for (String target : targets.split(",")) {
            for (String key : TINT_KEYS.getOrDefault(target.strip(), new String[0])) tint(key, alpha);
        }
        return changed || !changes.isEmpty();
    }

    private void tint(String key, double alpha) {
        if (table.get(key) instanceof Color c) {
            Color color = new Color(c.getRed(), c.getGreen(), c.getBlue(), (int) Math.round(255 * alpha));
            set(key, new ColorUIResource(color));
        }
    }

    private void set(String key, Object value) {
        if (table.containsKey(key) && !Objects.equals(table.get(key), value)) {
            Object old = table.put(key, value);
            changes.compute(key, (k, earlier) -> new Change(earlier == null ? old : earlier.previous(), value));
        }
    }

    public boolean restore() {
        boolean changed = !changes.isEmpty();
        changes.forEach((key, change) -> {
            if (table.get(key) == change.applied()) table.put(key, change.previous());
        });
        changes.clear();
        table = null;
        return changed;
    }
}
