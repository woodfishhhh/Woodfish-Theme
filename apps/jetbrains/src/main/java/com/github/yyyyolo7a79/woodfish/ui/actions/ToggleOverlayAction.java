package com.github.yyyyolo7a79.woodfish.ui.actions;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import org.jetbrains.annotations.NotNull;

/**
 * 通用叠层总开关：关闭后渐变与发光全部停用，其余参数原样保留 —— 效果出问题时的一键复位入口。
 */
public final class ToggleOverlayAction extends EffectToggleAction {

    @Override
    protected boolean read(@NotNull EffectSettings settings) {
        return settings.overlayEnabled();
    }

    @Override
    protected void write(@NotNull WoodfishState state, boolean enabled) {
        state.overlayEnabled = enabled;
    }
}
