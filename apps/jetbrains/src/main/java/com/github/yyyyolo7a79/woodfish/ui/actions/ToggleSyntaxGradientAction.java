package com.github.yyyyolo7a79.woodfish.ui.actions;

import com.github.yyyyolo7a79.woodfish.ui.WoodfishBundle;
import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.github.yyyyolo7a79.woodfish.ui.WoodfishNotifier;
import com.intellij.openapi.actionSystem.AnActionEvent;
import org.jetbrains.annotations.NotNull;

/**
 * A：渐变语法（彩色字体）开关。勾选状态表示分项开关本身，不受总开关影响。
 */
public final class ToggleSyntaxGradientAction extends EffectToggleAction {

    @Override
    protected boolean read(@NotNull EffectSettings settings) {
        return settings.syntaxGradient();
    }

    @Override
    protected void write(@NotNull WoodfishState state, boolean enabled) {
        state.syntaxGradientEnabled = enabled;
    }

    @Override
    public void setSelected(@NotNull AnActionEvent e, boolean state) {
        super.setSelected(e, state);
        if (state) {
            WoodfishNotifier.warnIfOverlayOff(e.getProject(), WoodfishBundle.text("action.gradient.enabled"));
        }
    }
}
