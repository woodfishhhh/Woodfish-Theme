package com.github.yyyyolo7a79.woodfish.ui;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import org.junit.jupiter.api.Test;

class DiagnosticsReportTest {

    private static DiagnosticsReport.Facts facts(String scheme) {
        return new DiagnosticsReport.Facts("1.0.0", "IntelliJ IDEA 2024.3.7", "IU-243.28141.41",
                "21.0.8+9-b1038.72（JetBrains s.r.o.）", "Windows 11 10.0（amd64）", "IDE 100%，系统 125%",
                "Demo（demo.theme）", scheme, 3);
    }

    @Test
    void reportContainsEnvironmentAndAllParameters() {
        WoodfishState s = new WoodfishState();
        s.glowIntensity = 1.6;
        WoodfishPresets.saveCurrent(s, "夜间 \"引号\"");
        String report = DiagnosticsReport.format(facts("Demo"), s);

        for (String expected : new String[]{
                "| Woodfish 版本 | 1.0.0 |",
                "| Build | IU-243.28141.41 |",
                "| 已挂载效果的编辑器 | 3 |",
                "\"overlayEnabled\": true,",
                "\"cjkGradientEnabled\": true,",
                "\"hueShift\": 24,",
                "\"lightnessDelta\": 0.06,",
                "\"angle\": 90,",
                "\"glowIntensity\": 1.6,",
                "\"customPresets\": [\"夜间 \\\"引号\\\"\"],",
                "\"welcomeShown\": false"}) {
            assertTrue(report.contains(expected), "报告缺少：" + expected + "\n" + report);
        }
        assertTrue(report.endsWith("```\n"));
    }

    @Test
    void pipesInValuesDoNotBreakTable() {
        String report = DiagnosticsReport.format(facts("A|B"), new WoodfishState());
        assertTrue(report.contains("| 编辑器配色方案 | A\\|B |"), report);
    }
}
