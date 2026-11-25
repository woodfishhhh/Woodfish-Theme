package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.github.yyyyolo7a79.woodfish.ui.WoodfishPresets.Preset;
import com.intellij.icons.AllIcons;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.InputValidatorEx;
import com.intellij.openapi.ui.MessageDialogBuilder;
import com.intellij.openapi.ui.Messages;
import com.intellij.openapi.ui.popup.JBPopupFactory;
import com.intellij.openapi.ui.popup.ListPopup;
import com.intellij.openapi.ui.popup.ListPopupStepEx;
import com.intellij.openapi.ui.popup.ListSeparator;
import com.intellij.openapi.ui.popup.PopupStep;
import com.intellij.openapi.ui.popup.util.BaseListPopupStep;
import com.intellij.util.ui.EmptyIcon;
import com.intellij.util.ui.StatusText;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.Icon;
import java.awt.Component;
import java.util.ArrayList;
import java.util.List;

/**
 * 预设相关的弹窗与对话框：动作（作用于已生效的设置）和设置页（作用于编辑中的副本）共用。
 */
public final class PresetUi {

    private PresetUi() {
    }

    // ==================== 选择预设（动作） ====================

    /** 弹出预设列表：内置 / 我的预设分组，与当前参数一致的预设打勾，末尾是保存与管理入口 */
    public static void showChooser(@Nullable Project project) {
        WoodfishState current = WoodfishSettings.getInstance().snapshotState();
        Preset matched = WoodfishPresets.matching(current);

        List<Entry> entries = new ArrayList<>();
        for (Preset p : WoodfishPresets.all(current)) {
            entries.add(new Entry(p, null));
        }
        entries.add(new Entry(null, Command.SAVE));
        entries.add(new Entry(null, Command.MANAGE));

        ListPopup popup = JBPopupFactory.getInstance()
                .createListPopup(new PresetStep(project, entries, matched));
        WoodfishMenus.showCentered(popup, project);
    }

    /** 应用到已生效的设置；总开关关着时提醒一句 */
    public static void apply(@Nullable Project project, @NotNull Preset preset) {
        WoodfishSettings.getInstance().update(preset::applyTo);
        WoodfishNotifier.warnIfOverlayOff(project, WoodfishBundle.text("preset.applied", WoodfishPresets.displayName(preset)));
    }

    // ==================== 保存为预设 ====================

    /** 把已生效的参数保存为自定义预设（「将当前效果保存为预设」动作） */
    public static void saveCurrent(@Nullable Project project) {
        WoodfishState snapshot = WoodfishSettings.getInstance().snapshotState();
        String name = askName(project, null, snapshot);
        if (name == null) {
            return;
        }
        WoodfishSettings.getInstance().update(s -> WoodfishPresets.saveCurrent(s, name));
        WoodfishNotifier.info(project, WoodfishBundle.text("preset.saved"),
                WoodfishBundle.text("preset.saved.detail", WoodfishNotifier.escape(name)));
    }

    /**
     * 询问预设名：校验规则见 {@link WoodfishPresets#validateName}，与已有预设重名时再确认是否覆盖。
     *
     * @param parent 非空时对话框挂在它所在的窗口上（设置页内调用），否则挂在项目窗口上
     * @param target 用来判断重名与上限的状态（设置页传编辑中的副本）
     * @return 去掉首尾空白后的名称；用户取消时返回 null
     */
    public static @Nullable String askName(@Nullable Project project, @Nullable Component parent,
                                           @NotNull WoodfishState target) {
        InputValidatorEx validator = text -> WoodfishPresets.validateName(text, target);
        String message = WoodfishBundle.text("preset.name.prompt");
        String title = WoodfishBundle.text("preset.name.title");
        String initial = WoodfishPresets.suggestName(target);
        String raw = parent != null
                ? Messages.showInputDialog(parent, message, title, null, initial, validator)
                : Messages.showInputDialog(project, message, title, null, initial, validator);
        if (raw == null) {
            return null;
        }
        String name = raw.strip();
        if (WoodfishPresets.findCustom(target, name) != null) {
            MessageDialogBuilder.YesNo confirm = MessageDialogBuilder
                    .yesNo(WoodfishBundle.text("preset.replace.title"), WoodfishBundle.text("preset.replace.detail", name))
                    .yesText(WoodfishBundle.text("preset.replace"))
                    .noText(WoodfishBundle.text("cancel"));
            boolean overwrite = parent != null ? confirm.ask(parent) : confirm.ask(project);
            if (!overwrite) {
                return null;
            }
        }
        return name;
    }

    // ==================== 弹窗步骤 ====================

    private enum Command {
        SAVE(WoodfishBundle.text("preset.save")),
        MANAGE(WoodfishBundle.text("preset.manage"));

        final String text;

        Command(String text) {
            this.text = text;
        }
    }

    /** 列表项：预设或命令，二者恰好一个非空 */
    private record Entry(@Nullable Preset preset, @Nullable Command command) {
    }

    private static final class PresetStep extends BaseListPopupStep<Entry> implements ListPopupStepEx<Entry> {

        private final @Nullable Project project;
        private final @Nullable Preset matched;

        PresetStep(@Nullable Project project, List<Entry> entries, @Nullable Preset matched) {
            super(WoodfishBundle.text("preset.chooser"), entries);
            this.project = project;
            this.matched = matched;
            for (int i = 0; i < entries.size(); i++) {
                if (isMatched(entries.get(i))) {
                    setDefaultOptionIndex(i);
                }
            }
        }

        private boolean isMatched(Entry e) {
            return e.preset() != null && matched != null
                    && e.preset().builtIn() == matched.builtIn()
                    && e.preset().name().equals(matched.name());
        }

        @Override
        public @NotNull String getTextFor(Entry value) {
            return value.preset() != null ? WoodfishPresets.displayName(value.preset()) : value.command().text;
        }

        @Override
        public @Nullable String getSecondaryTextFor(Entry value) {
            Preset p = value.preset();
            if (p == null) {
                return value.command() == Command.MANAGE ? WoodfishBundle.text("preset.manage.hint") : null;
            }
            return p.builtIn() ? WoodfishPresets.displayDescription(p) : WoodfishPresets.summary(p.values());
        }

        @Override
        public @Nullable String getTooltipTextFor(Entry value) {
            return isMatched(value) ? WoodfishBundle.text("preset.matches") : null;
        }

        @Override
        public void setEmptyText(@NotNull StatusText emptyText) {
        }

        @Override
        public Icon getIconFor(Entry value) {
            if (value.command() == Command.SAVE) {
                return AllIcons.Actions.MenuSaveall;
            }
            if (value.command() == Command.MANAGE) {
                return AllIcons.General.Settings;
            }
            return isMatched(value) ? AllIcons.Actions.Checked : EmptyIcon.ICON_16;
        }

        @Override
        public @Nullable ListSeparator getSeparatorAbove(Entry value) {
            List<Entry> values = getValues();
            int index = values.indexOf(value);
            Entry previous = index > 0 ? values.get(index - 1) : null;
            Preset p = value.preset();
            if (p != null && p.builtIn() && previous == null) {
                return new ListSeparator(WoodfishBundle.text("preset.group.builtin"));
            }
            if (p != null && !p.builtIn() && (previous == null || previous.preset() == null
                    || previous.preset().builtIn())) {
                return new ListSeparator(WoodfishBundle.text("preset.group.custom"));
            }
            if (value.command() == Command.SAVE) {
                return new ListSeparator();
            }
            return null;
        }

        @Override
        public @Nullable PopupStep<?> onChosen(Entry selectedValue, boolean finalChoice) {
            // 一律等弹窗关闭后再执行：保存要弹对话框，应用会触发全局重绘
            return doFinalStep(() -> {
                if (selectedValue.preset() != null) {
                    apply(project, selectedValue.preset());
                } else if (selectedValue.command() == Command.SAVE) {
                    saveCurrent(project);
                } else {
                    ShowSettingsUtil.getInstance().showSettingsDialog(project, WoodfishConfigurable.class);
                }
            });
        }
    }
}
