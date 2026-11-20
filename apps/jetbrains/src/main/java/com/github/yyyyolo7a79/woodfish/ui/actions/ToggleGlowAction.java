package com.github.yyyyolo7a79.woodfish.ui.actions;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.github.yyyyolo7a79.woodfish.ui.WoodfishNotifier;
import com.intellij.openapi.actionSystem.AnActionEvent;
import org.jetbrains.annotations.NotNull;

/**
 * G：文字发光开关。勾选状态表示分项开关本身，不受总开关影响。
 */
public final class ToggleGlowAction extends EffectToggleAction {

    @Override
    protected boolean read(@NotNull EffectSettings settings) {
        return settings.glow();
    }

    @Override
    protected void write(@NotNull WoodfishState state, boolean enabled) {
        state.glowEnabled = enabled;
    }

    @Override
    public void setSelected(@NotNull AnActionEvent e, boolean state) {
        super.setSelected(e, state);
        if (state) {
            WoodfishNotifier.warnIfOverlayOff(e.getProject(), "已打开发光字体");
        }
    }
}
