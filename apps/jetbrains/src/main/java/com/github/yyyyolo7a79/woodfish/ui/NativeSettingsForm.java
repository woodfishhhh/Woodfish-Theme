package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.NativeOptions;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.intellij.openapi.options.ConfigurationException;
import com.intellij.ui.DocumentAdapter;
import com.intellij.ui.TitledSeparator;
import com.intellij.ui.components.JBCheckBox;
import com.intellij.ui.components.JBTextField;
import com.intellij.util.ui.FormBuilder;

import javax.swing.*;
import javax.swing.event.DocumentEvent;
import java.awt.BorderLayout;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

import static com.github.yyyyolo7a79.woodfish.ui.WoodfishBundle.text;

/** Native controls generated from the VS Code setting schema. Changes stay in the draft until Apply. */
final class NativeSettingsForm {
    private final Supplier<WoodfishState> draft;
    private final Runnable changed;
    private final Map<String, JComponent> fields = new LinkedHashMap<>();
    private boolean loading;

    NativeSettingsForm(Supplier<WoodfishState> draft, Runnable changed) {
        this.draft = draft;
        this.changed = changed;
    }

    void append(FormBuilder form) {
        String previous = "";
        for (String key : NativeOptions.KEYS) {
            String group = key.substring(0, key.indexOf('.'));
            if (!group.equals(previous)) form.addComponent(new TitledSeparator(text("section." + group)));
            previous = group;
            JComponent field = field(key);
            fields.put(key, field);
            field.getAccessibleContext().setAccessibleName(text(key));
            if (field instanceof JCheckBox) form.addComponent(field);
            else form.addLabeledComponent(text(key), key.equals("background.image") ? imageField((JTextField) field) : field);
        }
    }

    void addPlatformSettings(FormBuilder form) {
        var details = new JPanel();
        details.setLayout(new BoxLayout(details, BoxLayout.Y_AXIS));
        for (String key : NativeOptions.schema("platformKeys").split(",")) {
            String value = NativeOptions.schema(key);
            String reason = key.endsWith("customRules") ? "css" : key.equals("runtime.fixChecksums") ? "files" : "compositor";
            details.add(new JLabel(text("platform.setting", key, value, text("platform." + reason))));
        }
        details.setVisible(false);
        var expand = new JToggleButton(text("platform.details"));
        expand.addActionListener(e -> { details.setVisible(expand.isSelected()); details.revalidate(); });
        form.addComponent(expand).addComponent(details);
    }

    private JComponent field(String key) {
        String choices = NativeOptions.schema(key + ".enum");
        if (choices != null) {
            var combo = new JComboBox<>(choices.split(","));
            combo.setRenderer((list, value, i, selected, focus) -> new DefaultListCellRenderer()
                    .getListCellRendererComponent(list, text("option." + value), i, selected, focus));
            combo.addActionListener(e -> write(key, (String) combo.getSelectedItem()));
            return combo;
        }
        return switch (NativeOptions.schema(key + ".type")) {
            case "boolean" -> checkbox(key);
            case "number" -> spinner(key);
            default -> stringField(key);
        };
    }

    private JComponent checkbox(String key) {
        var box = new JBCheckBox(text(key));
        box.addActionListener(e -> write(key, Boolean.toString(box.isSelected())));
        return box;
    }

    private JComponent spinner(String key) {
        double min = Double.parseDouble(NativeOptions.schema(key + ".min"));
        double max = Double.parseDouble(NativeOptions.schema(key + ".max"));
        double step = max <= 1 ? .01 : max <= 24 ? .1 : 1;
        var spinner = new JSpinner(new SpinnerNumberModel(Double.parseDouble(NativeOptions.schema(key)), min, max, step));
        spinner.addChangeListener(e -> write(key, spinner.getValue().toString()));
        return spinner;
    }

    private JComponent stringField(String key) {
        var field = new JBTextField();
        field.getDocument().addDocumentListener(new DocumentAdapter() {
            @Override protected void textChanged(DocumentEvent e) { write(key, field.getText()); }
        });
        return field;
    }

    private static JPanel imageField(JTextField path) {
        var row = new JPanel(new BorderLayout());
        var browse = new JButton(text("browse"));
        browse.addActionListener(e -> {
            var chooser = new JFileChooser();
            if (chooser.showOpenDialog(row) == JFileChooser.APPROVE_OPTION)
                path.setText(chooser.getSelectedFile().getAbsolutePath());
        });
        row.add(path, BorderLayout.CENTER);
        row.add(browse, BorderLayout.EAST);
        return row;
    }

    private void write(String key, String value) {
        if (loading || value == null) return;
        if (NativeOptions.validText(key, value)) NativeOptions.set(draft.get().options, key, value);
        changed.run();
    }

    void load() {
        var scheme = com.intellij.openapi.editor.colors.EditorColorsManager.getInstance().getGlobalScheme();
        var shown = com.github.yyyyolo7a79.woodfish.settings.EffectSettings.from(draft.get(), 0).forScheme(scheme.getName());
        loading = true;
        try {
            fields.forEach((key, field) -> loadField(field, shown.value(key)));
        } finally { loading = false; }
    }

    private void loadField(JComponent field, String value) {
        if (field instanceof JCheckBox box) box.setSelected(Boolean.parseBoolean(value));
        else if (field instanceof JComboBox<?> combo) combo.setSelectedItem(value);
        else if (field instanceof JSpinner spin) spin.setValue(Double.parseDouble(value));
        else if (field instanceof JTextField input) input.setText(value);
    }

    String invalid() {
        for (var entry : fields.entrySet()) {
            if (entry.getValue() instanceof JTextField value && !NativeOptions.validText(entry.getKey(), value.getText()))
                return entry.getKey();
        }
        return null;
    }

    void validate() throws ConfigurationException {
        String invalid = invalid();
        if (invalid != null) throw new ConfigurationException(text("field.invalid", text(invalid)));
    }
}
