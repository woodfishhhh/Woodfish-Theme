package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.github.yyyyolo7a79.woodfish.ui.WoodfishPresets.Preset;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.options.ConfigurationException;
import com.intellij.openapi.ui.ComboBox;
import com.intellij.openapi.util.Disposer;
import com.intellij.ui.TitledSeparator;
import com.intellij.ui.components.JBCheckBox;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBScrollPane;
import com.intellij.util.ui.FormBuilder;
import com.intellij.util.ui.JBUI;
import javax.swing.*;
import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.util.ArrayList;
import java.util.List;
import java.util.function.*;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.*;
import static com.github.yyyyolo7a79.woodfish.ui.WoodfishBundle.text;

final class WoodfishSettingsPanel implements Disposable {
    private final JPanel root = new JPanel(new BorderLayout());
    private final EffectPreview preview = new EffectPreview();
    private final List<Runnable> refreshers = new ArrayList<>();
    private final ComboBox<Preset> presets = new ComboBox<>();
    private final JButton remove = new JButton(text("preset.delete"));
    private final JLabel description = new JBLabel();
    private final JLabel match = new JBLabel();
    private WoodfishState edited = new WoodfishState();
    private final NativeSettingsForm nativeForm = new NativeSettingsForm(() -> edited, this::changed);
    private JComponent master;
    private boolean loading;

    WoodfishSettingsPanel() {
        Disposer.register(this, preview);
        JPanel top = new JPanel(new BorderLayout(0, JBUI.scale(4)));
        top.add(preview.getComponent(), BorderLayout.CENTER);
        top.add(new JBLabel(text("preview.hint")), BorderLayout.SOUTH);
        top.setBorder(JBUI.Borders.emptyBottom(10));
        root.add(top, BorderLayout.NORTH);
        FormBuilder form = FormBuilder.createFormBuilder();
        addPresets(form);
        addTextEffects(form);
        nativeForm.append(form);
        nativeForm.addPlatformSettings(form);
        JPanel fields = form.addComponentFillVertically(new JPanel(), 0).getPanel();
        fields.setBorder(JBUI.Borders.empty(0, 0, 8, 12));
        var scroll = new JBScrollPane(fields);
        scroll.setBorder(JBUI.Borders.empty());
        root.add(scroll, BorderLayout.CENTER);
    }

    private void addTextEffects(FormBuilder f) {
        f.addComponent(new TitledSeparator(text("section.text")));
        master = check(f, "overlay.enabled", s -> s.overlayEnabled, (s, v) -> s.overlayEnabled = v, s -> true);
        check(f, "syntaxGradient.enabled", s -> s.syntaxGradientEnabled, (s, v) -> s.syntaxGradientEnabled = v, s -> s.overlayEnabled);
        check(f, "cjk.enabled", s -> s.cjkGradientEnabled, (s, v) -> s.cjkGradientEnabled = v,
                s -> s.overlayEnabled && (s.syntaxGradientEnabled || s.glowEnabled));
        check(f, "glow.enabled", s -> s.glowEnabled, (s, v) -> s.glowEnabled = v, s -> s.overlayEnabled);
        slider(f, "overlay.hueShift", HUE_SHIFT_MIN, HUE_SHIFT_MAX, 1, SliderFormats::hueShift, s -> s.hueShift, (s,v) -> s.hueShift = v);
        slider(f, "overlay.lightnessDelta", LIGHTNESS_DELTA_MIN, LIGHTNESS_DELTA_MAX, 1000, SliderFormats::lightness, s -> s.lightnessDelta, (s,v) -> s.lightnessDelta = v);
        slider(f, "overlay.neutralChroma", NEUTRAL_CHROMA_MIN, NEUTRAL_CHROMA_MAX, 1000, SliderFormats::chroma, s -> s.neutralChroma, (s,v) -> s.neutralChroma = v);
        slider(f, "overlay.angle", ANGLE_MIN, ANGLE_MAX, 1, SliderFormats::angle, s -> s.angle, (s,v) -> s.angle = v);
        slider(f, "glow.intensity", GLOW_INTENSITY_MIN, GLOW_INTENSITY_MAX, 100, SliderFormats::glow, s -> s.glowIntensity, (s,v) -> s.glowIntensity = v);
    }

    private JCheckBox check(FormBuilder f, String key, Predicate<WoodfishState> get,
                            BiConsumer<WoodfishState, Boolean> set, Predicate<WoodfishState> enabled) {
        var box = new JBCheckBox(text(key));
        box.addActionListener(e -> { if (!loading) { set.accept(edited, box.isSelected()); refreshText(); changed(); } });
        refreshers.add(() -> { box.setSelected(get.test(edited)); box.setEnabled(enabled.test(edited)); });
        f.addComponent(box);
        return box;
    }

    private void slider(FormBuilder f, String key, double min, double max, int scale, IntFunction<String> format,
                        ToDoubleFunction<WoodfishState> get, ObjDoubleConsumer<WoodfishState> set) {
        var control = new ValueSlider(min, max, scale, format).named(text(key));
        control.onChange(() -> { if (!loading) { set.accept(edited, control.get(get.applyAsDouble(edited))); changed(); } });
        refreshers.add(() -> {
            control.set(get.applyAsDouble(edited));
            control.setEnabled(edited.overlayEnabled && (key.equals("glow.intensity") ? edited.glowEnabled : edited.syntaxGradientEnabled));
        });
        f.addLabeledComponent(text(key), control.getComponent());
    }

    private void addPresets(FormBuilder form) {
        presets.setRenderer((list, p, i, selected, focus) -> new DefaultListCellRenderer()
                .getListCellRendererComponent(list, p == null ? "" : WoodfishPresets.displayName(p), i, selected, focus));
        presets.addActionListener(e -> updatePresetButtons());
        JPanel row = new JPanel(new FlowLayout(FlowLayout.LEADING, JBUI.scale(6), 0));
        for (JComponent c : List.of(presets, button("preset.apply", this::applyPreset), button("preset.save", this::savePreset), remove)) row.add(c);
        remove.addActionListener(e -> {
            Preset p = (Preset) presets.getSelectedItem();
            if (p != null && !p.builtIn()) { WoodfishPresets.remove(edited, p.name()); rebuild(null); changed(); }
        });
        form.addLabeledComponent(text("section.presets"), row).addComponentToRightColumn(description, 0).addComponentToRightColumn(match, 0);
    }

    private static JButton button(String key, Runnable action) {
        var button = new JButton(text(key));
        button.addActionListener(e -> action.run());
        return button;
    }

    private void applyPreset() {
        Preset p = (Preset) presets.getSelectedItem();
        if (p == null) return;
        p.applyTo(edited);
        refreshText();
        nativeForm.load();
        changed();
    }

    private void savePreset() {
        nativeForm.saveWhenValid(this::saveValidPreset, e ->
                com.intellij.openapi.ui.Messages.showErrorDialog(root, e.getMessage(), text("preset.save")));
    }

    private void saveValidPreset() {
        String name = PresetUi.askName(null, root, edited);
        if (name == null) return;
        WoodfishPresets.saveCurrent(edited, name);
        rebuild(name);
        changed();
    }

    private void updatePresetButtons() {
        Preset p = (Preset) presets.getSelectedItem();
        remove.setEnabled(p != null && !p.builtIn());
        description.setText(p == null ? "" : WoodfishPresets.displayDescription(p));
    }

    private void rebuild(String name) {
        var items = WoodfishPresets.all(edited);
        presets.setModel(new DefaultComboBoxModel<>(items.toArray(Preset[]::new)));
        var selected = items.stream().filter(p -> p.name().equals(name)).findFirst().orElse(WoodfishPresets.matching(edited));
        presets.setSelectedItem(selected == null ? items.getFirst() : selected);
        updatePresetButtons();
    }

    private void changed() {
        if (loading) return;
        Preset p = WoodfishPresets.matching(edited);
        match.setText(p == null ? text("preset.unsaved") : text("preset.match", WoodfishPresets.displayName(p)));
        preview.update(edited);
    }

    private void refreshText() {
        loading = true;
        try { refreshers.forEach(Runnable::run); } finally { loading = false; }
    }

    void load(WoodfishState state) {
        edited = state.copy();
        refreshText();
        nativeForm.load();
        rebuild(null);
        changed();
    }

    boolean hasInvalidInput() { return nativeForm.invalid() != null; }
    void validateInput() throws ConfigurationException { nativeForm.validate(); }
    WoodfishState editedState() { return edited.copy(); }
    JComponent getComponent() { return root; }
    JComponent getPreferredFocusedComponent() { return master; }
    @Override public void dispose() { }
}
