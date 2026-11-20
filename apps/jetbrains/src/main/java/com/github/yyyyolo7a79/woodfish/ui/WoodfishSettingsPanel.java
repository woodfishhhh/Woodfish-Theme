package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.github.yyyyolo7a79.woodfish.ui.WoodfishPresets.Preset;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.ui.ComboBox;
import com.intellij.openapi.ui.popup.ListSeparator;
import com.intellij.openapi.util.Disposer;
import com.intellij.ui.CollectionComboBoxModel;
import com.intellij.ui.GroupedComboBoxRenderer;
import com.intellij.ui.TitledSeparator;
import com.intellij.ui.components.JBCheckBox;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBScrollPane;
import com.intellij.util.ui.FormBuilder;
import com.intellij.util.ui.JBUI;
import com.intellij.util.ui.UIUtil;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.Box;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JPanel;
import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.util.List;

import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.ANGLE_MAX;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.ANGLE_MIN;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.GLOW_INTENSITY_MAX;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.GLOW_INTENSITY_MIN;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.HUE_SHIFT_MAX;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.HUE_SHIFT_MIN;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.LIGHTNESS_DELTA_MAX;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.LIGHTNESS_DELTA_MIN;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.NEUTRAL_CHROMA_MAX;
import static com.github.yyyyolo7a79.woodfish.settings.WoodfishState.NEUTRAL_CHROMA_MIN;

/**
 * 设置页表单：顶部固定实时预览，下方是可滚动的开关、参数与预设区。
 *
 * <p>表单只改一份 {@link WoodfishState} 编辑副本，任何改动都立刻同步到预览；
 * 应用预设、另存、删除预设同样只改副本，点 Apply 才一次性生效，点 Cancel 全部作废。
 */
final class WoodfishSettingsPanel implements Disposable {

    private final JPanel root = new JPanel(new BorderLayout());
    private final EffectPreview preview = new EffectPreview();

    // ===== 开关 =====
    private final JBCheckBox overlayBox = new JBCheckBox("启用 Woodfish 通用叠层（总开关）");
    private final JBCheckBox gradientBox = new JBCheckBox("A  渐变语法（彩色字体）");
    private final JBCheckBox cjkGradientBox = new JBCheckBox("中日韩文字也应用渐变与发光");
    private final JBCheckBox glowBox = new JBCheckBox("G  文字发光");

    // ===== 参数：范围取自 WoodfishState，与 VS Code 版一致 =====
    private final ValueSlider hueShift = new ValueSlider(HUE_SHIFT_MIN, HUE_SHIFT_MAX, 1,
            SliderFormats::hueShift).named("色相偏移");
    private final ValueSlider lightnessDelta = new ValueSlider(LIGHTNESS_DELTA_MIN, LIGHTNESS_DELTA_MAX,
            SliderFormats.THOUSANDTHS, SliderFormats::lightness).named("明度变化");
    private final ValueSlider neutralChroma = new ValueSlider(NEUTRAL_CHROMA_MIN, NEUTRAL_CHROMA_MAX,
            SliderFormats.THOUSANDTHS, SliderFormats::chroma).named("低色度补色");
    private final ValueSlider angle = new ValueSlider(ANGLE_MIN, ANGLE_MAX, 1,
            SliderFormats::angle).named("渐变方向");
    private final ValueSlider glowIntensity = new ValueSlider(GLOW_INTENSITY_MIN, GLOW_INTENSITY_MAX,
            SliderFormats.HUNDREDTHS, SliderFormats::glow).named("发光强度");
    private final ValueSlider[] gradientSliders = {hueShift, lightnessDelta, neutralChroma, angle};

    // ===== 预设 =====
    private final CollectionComboBoxModel<Preset> presetModel = new CollectionComboBoxModel<>();
    private final ComboBox<Preset> presetCombo = new ComboBox<>(presetModel);
    private final JButton applyPresetButton = new JButton("应用");
    private final JButton savePresetButton = new JButton("另存为…");
    private final JButton deletePresetButton = new JButton("删除");
    private final JBLabel presetDescription = comment("");
    private final JBLabel matchLabel = comment("");

    /** 编辑中的副本；控件只读写它 */
    private WoodfishState edited = new WoodfishState();

    /** 批量把副本填进控件期间屏蔽监听，填完再统一刷新一次 */
    private boolean loading = false;

    WoodfishSettingsPanel() {
        Disposer.register(this, preview);

        presetCombo.setRenderer(new PresetRenderer(presetCombo));
        // 定宽：预设名最长 40 个字，按内容撑宽会把右边的按钮挤出可视区
        presetCombo.setMinimumAndPreferredWidth(JBUI.scale(240));
        presetCombo.addActionListener(e -> updatePresetButtons());
        applyPresetButton.addActionListener(e -> applySelectedPreset());
        savePresetButton.addActionListener(e -> saveAsPreset());
        deletePresetButton.addActionListener(e -> deleteSelectedPreset());

        JPanel form = FormBuilder.createFormBuilder()
                .addComponent(new TitledSeparator("开关"))
                .addComponent(overlayBox)
                .addComponent(checkboxComment(overlayBox,
                        "整体开关渐变与发光；关闭后保留全部参数，切换到任意配色方案都继续工作。"))
                .addComponent(gradientBox)
                .addComponent(checkboxComment(gradientBox,
                        "为代码文字叠加以原色为中点的 OKLCH 渐变。",
                        "关闭后仍可单独保留文字发光和当前配色。"))
                .addComponent(cjkGradientBox)
                .addComponent(checkboxComment(cjkGradientBox,
                        "中日韩字由系统回退字体显示，LCD 抗锯齿下改为逐字纯色重画，与 IDE 的字形逐像素重合。",
                        "关闭后中日韩文字只保留 IDE 原生绘制，不加渐变和发光。"))
                .addComponent(glowBox)
                .addComponent(checkboxComment(glowBox,
                        "在代码文字下方绘制分层发光。",
                        "关闭后保留彩色字体，去掉发光带来的眩光和模糊感。"))

                .addComponent(new TitledSeparator("渐变"))
                .addLabeledComponent("色相偏移：", hueShift.getComponent())
                .addComponentToRightColumn(comment(
                        "代码原色在渐变两端的 OKLCH 色相偏移。",
                        "默认 24 表示左端 −24°、右端 +24°；0 只保留明暗变化。"), 0)
                .addLabeledComponent("明度变化：", lightnessDelta.getComponent())
                .addComponentToRightColumn(comment(
                        "代码原色在渐变两端的 OKLCH 明度变化。",
                        "默认 0.06，左端增加、右端减少；超出可显示范围时自动压回 sRGB 色域。"), 0)
                .addLabeledComponent("低色度补色：", neutralChroma.getComponent())
                .addComponentToRightColumn(comment(
                        "为纯白、灰色等低色度文字补充的最小 OKLCH 色度。",
                        "默认 0.06，让默认前景色的文字也有可见的渐变。"), 0)
                .addLabeledComponent("渐变方向：", angle.getComponent())
                .addComponentToRightColumn(comment(
                        "代码渐变方向（CSS 角度）。默认 90 为从左到右，0 为自下而上。"), 0)

                .addComponent(new TitledSeparator("发光"))
                .addLabeledComponent("发光强度：", glowIntensity.getComponent())
                .addComponentToRightColumn(comment(
                        "按倍率缩放发光的模糊半径，1 为默认；0.6 更克制，1.5 更亮，2 以上明显更霓虹。",
                        "不同显示器、缩放比例和字体粗细下，可按需要调整。"), 0)

                .addComponent(new TitledSeparator("效果预设"))
                .addLabeledComponent("预设：",
                        row(presetCombo, applyPresetButton, savePresetButton, deletePresetButton))
                .addComponentToRightColumn(presetDescription, 0)
                .addComponentToRightColumn(matchLabel, 0)
                .addComponentToRightColumn(comment(
                        "预设只改渐变与发光参数，不改总开关；应用、另存与删除都要点 Apply 才生效。"), 0)

                .addVerticalGap(JBUI.scale(16))
                .addComponent(footer())
                .addComponentFillVertically(new JPanel(), 0)
                .getPanel();
        form.setBorder(JBUI.Borders.empty(0, 0, 8, 12));

        JBLabel hint = new JBLabel("实时预览：拖动下方滑块即可看到效果，点 Apply 后作用到所有编辑器");
        hint.setForeground(UIUtil.getContextHelpForeground());
        JPanel top = new JPanel(new BorderLayout(0, JBUI.scale(4)));
        top.add(preview.getComponent(), BorderLayout.CENTER);
        top.add(hint, BorderLayout.SOUTH);
        top.setBorder(JBUI.Borders.empty(0, 0, 8, 12));

        JBScrollPane scroll = new JBScrollPane(form);
        scroll.setBorder(JBUI.Borders.empty());
        root.add(top, BorderLayout.NORTH);
        root.add(scroll, BorderLayout.CENTER);

        overlayBox.addActionListener(e -> {
            edited.overlayEnabled = overlayBox.isSelected();
            onChanged();
        });
        gradientBox.addActionListener(e -> {
            edited.syntaxGradientEnabled = gradientBox.isSelected();
            onChanged();
        });
        cjkGradientBox.addActionListener(e -> {
            edited.cjkGradientEnabled = cjkGradientBox.isSelected();
            onChanged();
        });
        glowBox.addActionListener(e -> {
            edited.glowEnabled = glowBox.isSelected();
            onChanged();
        });
        hueShift.onChange(() -> onSlider(() -> edited.hueShift = hueShift.get(edited.hueShift)));
        lightnessDelta.onChange(() -> onSlider(() -> edited.lightnessDelta = lightnessDelta.get(edited.lightnessDelta)));
        neutralChroma.onChange(() -> onSlider(() -> edited.neutralChroma = neutralChroma.get(edited.neutralChroma)));
        angle.onChange(() -> onSlider(() -> edited.angle = angle.get(edited.angle)));
        glowIntensity.onChange(() -> onSlider(() -> edited.glowIntensity = glowIntensity.get(edited.glowIntensity)));
    }

    JComponent getComponent() {
        return root;
    }

    JComponent getPreferredFocusedComponent() {
        return overlayBox;
    }

    /** 编辑中的副本（深拷贝，调用方可随意修改） */
    @NotNull WoodfishState editedState() {
        return edited.copy();
    }

    /** 把状态填进表单（Configurable.reset） */
    void load(@NotNull WoodfishState state) {
        edited = state.copy();
        pushToControls();
        rebuildPresetModel(null);
        onChanged();
    }

    @Override
    public void dispose() {
        // 预览已作为子 Disposable 注册，随本面板一起释放
    }

    // ==================== 联动 ====================

    private void onSlider(Runnable write) {
        if (loading) {
            return;
        }
        write.run();
        onChanged();
    }

    /** 表单任何改动：刷新可用状态与「当前参数」提示，并同步到预览 */
    private void onChanged() {
        if (loading) {
            return;
        }
        updateEnabledStates();
        updateMatchLabel();
        preview.update(edited);
    }

    private void pushToControls() {
        loading = true;
        try {
            overlayBox.setSelected(edited.overlayEnabled);
            gradientBox.setSelected(edited.syntaxGradientEnabled);
            cjkGradientBox.setSelected(edited.cjkGradientEnabled);
            glowBox.setSelected(edited.glowEnabled);
            hueShift.set(edited.hueShift);
            lightnessDelta.set(edited.lightnessDelta);
            neutralChroma.set(edited.neutralChroma);
            angle.set(edited.angle);
            glowIntensity.set(edited.glowIntensity);
        } finally {
            loading = false;
        }
    }

    /** 只点亮当前配置下真正起作用的控件，免得调了半天发现没效果 */
    private void updateEnabledStates() {
        boolean overlay = edited.overlayEnabled;
        gradientBox.setEnabled(overlay);
        cjkGradientBox.setEnabled(overlay && (edited.syntaxGradientEnabled || edited.glowEnabled));
        glowBox.setEnabled(overlay);
        boolean gradient = overlay && edited.syntaxGradientEnabled;
        for (ValueSlider s : gradientSliders) {
            s.setEnabled(gradient);
        }
        glowIntensity.setEnabled(overlay && edited.glowEnabled);
    }

    private void updateMatchLabel() {
        Preset match = WoodfishPresets.matching(edited);
        matchLabel.setText(match == null
                ? "当前参数：未保存的自定义组合"
                : "当前参数：与" + (match.builtIn() ? "内置" : "我的") + "预设「" + match.name() + "」一致");
    }

    // ==================== 预设 ====================

    private void rebuildPresetModel(@Nullable String selectName) {
        List<Preset> presets = WoodfishPresets.all(edited);
        Preset toSelect = null;
        if (selectName != null) {
            toSelect = presets.stream().filter(p -> !p.builtIn() && p.name().equals(selectName))
                    .findFirst().orElse(null);
        }
        if (toSelect == null) {
            Preset match = WoodfishPresets.matching(edited);
            toSelect = match != null ? match : presets.get(0);
        }
        presetModel.replaceAll(presets);
        presetModel.setSelectedItem(toSelect);
        updatePresetButtons();
    }

    private @Nullable Preset selectedPreset() {
        return presetModel.getSelected();
    }

    private void updatePresetButtons() {
        Preset p = selectedPreset();
        applyPresetButton.setEnabled(p != null);
        deletePresetButton.setEnabled(p != null && !p.builtIn());
        presetDescription.setText(p == null ? "" : p.builtIn() ? p.description() : WoodfishPresets.summary(p.values()));
    }

    private void applySelectedPreset() {
        Preset p = selectedPreset();
        if (p == null) {
            return;
        }
        p.applyTo(edited);
        pushToControls();
        onChanged();
    }

    private void saveAsPreset() {
        String name = PresetUi.askName(null, root, edited);
        if (name == null) {
            return;
        }
        WoodfishPresets.saveCurrent(edited, name);
        rebuildPresetModel(name);
        onChanged();
    }

    private void deleteSelectedPreset() {
        Preset p = selectedPreset();
        if (p == null || p.builtIn()) {
            return;
        }
        WoodfishPresets.remove(edited, p.name());
        rebuildPresetModel(null);
        onChanged();
    }

    /**
     * 下拉框分组显示：内置预设 / 我的预设。收起时看不到分组标题，因此自定义预设右侧灰字标「自定义」；
     * 预设说明与参数概要显示在下拉框下方，避免列表过宽。
     */
    private static final class PresetRenderer extends GroupedComboBoxRenderer<Preset> {

        private final ComboBox<Preset> combo;

        PresetRenderer(ComboBox<Preset> combo) {
            super(combo);
            this.combo = combo;
        }

        @Override
        public @NotNull String getText(Preset item) {
            return item.name();
        }

        @Override
        public @Nullable String getSecondaryText(Preset item) {
            return item.builtIn() ? null : "自定义";
        }

        @Override
        public @Nullable ListSeparator separatorFor(Preset value) {
            int index = -1;
            for (int i = 0; i < combo.getItemCount(); i++) {
                if (combo.getItemAt(i) == value) {
                    index = i;
                    break;
                }
            }
            if (index == 0) {
                return new ListSeparator("内置预设");
            }
            if (index > 0 && !value.builtIn() && combo.getItemAt(index - 1).builtIn()) {
                return new ListSeparator("我的预设");
            }
            return null;
        }
    }

    // ==================== 小部件 ====================

    /**
     * 与 FormBuilder#addTooltip 同样的小号灰字。标签里的长句不会随宽度自动换行，
     * 因此按行传入、用 &lt;br&gt; 拼接，每行控制在设置页放得下的长度。
     */
    private static JBLabel comment(String... lines) {
        String text = lines.length == 1 && lines[0].isEmpty()
                ? ""
                : "<html>" + String.join("<br>", escape(lines)) + "</html>";
        JBLabel label = new JBLabel(text, UIUtil.ComponentStyle.SMALL, UIUtil.FontColor.BRIGHTER);
        label.setBorder(JBUI.Borders.emptyLeft(10));
        return label;
    }

    /** 复选框下方的说明：与复选框文字左对齐 */
    private static JComponent checkboxComment(JBCheckBox box, String... lines) {
        JBLabel label = comment(lines);
        label.setBorder(JBUI.Borders.empty(0, UIUtil.getCheckBoxTextHorizontalOffset(box), 4, 0));
        return label;
    }

    private static String[] escape(String[] lines) {
        String[] result = new String[lines.length];
        for (int i = 0; i < lines.length; i++) {
            result[i] = WoodfishNotifier.escape(lines[i]);
        }
        return result;
    }

    /** 页底：说明 JetBrains 版没有移植的原版功能 */
    private static JComponent footer() {
        JBLabel label = new JBLabel("<html>"
                + "本模块只包含渐变语法（A）与文字发光（G）两层效果；五套 Woodfish 主题随后续变更提供。<br>"
                + "彩色光标请改用 Neovide Cursor 插件；毛玻璃、系统级透明窗口与 Reveal 光效<br>"
                + "依赖 VS Code 的工作台注入，JetBrains IDE 没有对应机制，因此不提供。"
                + "</html>");
        label.setForeground(UIUtil.getContextHelpForeground());
        return label;
    }

    /** 横排若干组件（间距 8px，首个组件前不留空，保证与上下行左对齐） */
    private static JPanel row(JComponent... items) {
        JPanel p = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0));
        for (int i = 0; i < items.length; i++) {
            if (i > 0) {
                p.add(Box.createHorizontalStrut(JBUI.scale(8)));
            }
            p.add(items[i]);
        }
        return p;
    }
}
