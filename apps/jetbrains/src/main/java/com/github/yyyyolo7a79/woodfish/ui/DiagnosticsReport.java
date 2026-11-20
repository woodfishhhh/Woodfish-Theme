package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.List;

/**
 * 诊断报告的排版（纯逻辑，不引用任何 IDE 类，单测可以直接加载）。
 * 格式照 VS Code 版：环境信息一张 Markdown 表，Woodfish 参数一段 JSON。
 */
final class DiagnosticsReport {

    /** 报告里的环境信息；读不到的项由收集方填「未知」 */
    record Facts(String pluginVersion, String ide, String build, String jbr, String os, String uiScale,
                 String uiTheme, String colorScheme, int installedEditors) {
    }

    private DiagnosticsReport() {
    }

    static @NotNull String format(@NotNull Facts f, @NotNull WoodfishState s) {
        List<String> lines = List.of(
                "## Woodfish Theme 诊断信息（JetBrains 版）",
                "",
                "| 项目 | 值 |",
                "| --- | --- |",
                row("Woodfish 版本", f.pluginVersion()),
                row("IDE", f.ide()),
                row("Build", f.build()),
                row("JBR", f.jbr()),
                row("系统", f.os()),
                row("界面缩放", f.uiScale()),
                row("UI 主题", f.uiTheme()),
                row("编辑器配色方案", f.colorScheme()),
                row("已挂载效果的编辑器", String.valueOf(f.installedEditors())),
                "",
                "### Woodfish 设置",
                "",
                "```json",
                "{",
                "  \"overlayEnabled\": " + s.overlayEnabled + ",",
                "  \"syntaxGradientEnabled\": " + s.syntaxGradientEnabled + ",",
                "  \"cjkGradientEnabled\": " + s.cjkGradientEnabled + ",",
                "  \"glowEnabled\": " + s.glowEnabled + ",",
                "  \"hueShift\": " + WoodfishPresets.number(s.hueShift) + ",",
                "  \"lightnessDelta\": " + WoodfishPresets.number(s.lightnessDelta) + ",",
                "  \"neutralChroma\": " + WoodfishPresets.number(s.neutralChroma) + ",",
                "  \"angle\": " + WoodfishPresets.number(s.angle) + ",",
                "  \"glowIntensity\": " + WoodfishPresets.number(s.glowIntensity) + ",",
                "  \"customPresets\": " + presetNames(s) + ",",
                "  \"welcomeShown\": " + s.welcomeShown,
                "}",
                "```");
        return String.join("\n", lines) + "\n";
    }

    /** 表格单元格里的 | 会破坏 Markdown 表格 */
    private static String row(String key, String value) {
        return "| " + key + " | " + value.replace("|", "\\|") + " |";
    }

    /** 只列名称：参数本身对排查问题没有帮助，名称够用来对照「我选的是哪个预设」 */
    private static String presetNames(WoodfishState s) {
        List<String> names = new ArrayList<>();
        for (WoodfishPresets.Preset p : WoodfishPresets.customs(s)) {
            names.add("\"" + p.name().replace("\\", "\\\\").replace("\"", "\\\"") + "\"");
        }
        return "[" + String.join(", ", names) + "]";
    }
}
