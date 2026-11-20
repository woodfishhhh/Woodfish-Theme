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
            overlay = "已关闭（各项参数已保留）";
        } else if (!s.anyActive()) {
            overlay = "已开启，但渐变与发光都已关闭";
        } else {
            overlay = "已开启";
        }
        String glowState = layerState(s.overlayEnabled(), s.glow());
        if (s.glowActive()) {
            glowState += String.format(Locale.ROOT, "（强度 %.2f×）", s.glowIntensity());
        }
        return "<html>"
                + "<b>Woodfish 通用叠层</b>：" + overlay + "<br>"
                + "A 渐变语法（彩色字体）：" + layerState(s.overlayEnabled(), s.syntaxGradient()) + "<br>"
                + "G 文字发光：" + glowState + "<br>"
                + "点击打开功能菜单"
                + "</html>";
    }

    /** 分项开关本身的状态；总开关关着时说明「开着但暂不生效」，免得用户以为开关失灵 */
    private static String layerState(boolean overlayEnabled, boolean layerEnabled) {
        if (!layerEnabled) {
            return "关闭";
        }
        return overlayEnabled ? "开启" : "开启（总开关关闭，暂不生效）";
    }
}
