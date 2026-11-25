package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import org.jetbrains.annotations.NotNull;

import java.util.Locale;

/**
 * 状态栏的文字与提示（纯逻辑，便于单测）。
 *
 * <p>沿用 VS Code 版的写法：{@code Woodfish on · AG}，字母只列出<b>实际生效</b>的层
 * （A 渐变语法、G 文字发光）。总开关关闭、或两层都关了时显示 {@code Woodfish off}，
 * 这样一眼就能看出「为什么代码没有效果」。
 */
final class StatusBarText {

    private StatusBarText() {
    }

    static @NotNull String text(@NotNull EffectSettings s) {
        if (!s.anyActive()) {
            return "Woodfish off";
        }
        StringBuilder letters = new StringBuilder();
        if (s.gradientActive()) {
            letters.append('A');
        }
        if (s.glowActive()) {
            letters.append('G');
        }
        return "Woodfish on · " + letters;
    }

    static @NotNull String tooltip(@NotNull EffectSettings s) {
        String overlay;
        if (!s.overlayEnabled()) {
            overlay = WoodfishBundle.text("status.master.off");
        } else if (!s.anyActive()) {
            overlay = WoodfishBundle.text("status.master.quiet");
        } else {
            overlay = WoodfishBundle.text("status.master.on");
        }
        String glowState = layerState(s.overlayEnabled(), s.glow());
        if (s.glowActive()) {
            glowState += WoodfishBundle.text("status.intensity", String.format(Locale.ROOT, "%.2f×", s.glowIntensity()));
        }
        return WoodfishBundle.text("status.tooltip", overlay, layerState(s.overlayEnabled(), s.syntaxGradient()), glowState);
    }

    /** 分项开关本身的状态；总开关关着时说明「开着但暂不生效」，免得用户以为开关失灵 */
    private static String layerState(boolean overlayEnabled, boolean layerEnabled) {
        if (!layerEnabled) {
            return WoodfishBundle.text("status.layer.off");
        }
        return overlayEnabled ? WoodfishBundle.text("status.layer.on") : WoodfishBundle.text("status.layer.pending");
    }
}
