package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.editor.WoodfishEditorManager;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishSettings;
import com.github.yyyyolo7a79.woodfish.ui.DiagnosticsReport.Facts;
import com.intellij.ide.plugins.cl.PluginAwareClassLoader;
import com.intellij.ide.ui.LafManager;
import com.intellij.openapi.application.ApplicationInfo;
import com.intellij.openapi.editor.colors.EditorColorsManager;
import com.intellij.openapi.editor.colors.EditorColorsScheme;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.project.Project;
import com.intellij.testFramework.LightVirtualFile;
import com.intellij.ui.scale.JBUIScale;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.awt.GraphicsEnvironment;
import java.util.Locale;

/**
 * 「生成 Woodfish 诊断信息」：收集 IDE、JBR、系统、主题、配色方案与全部 Woodfish 参数，
 * 排版交给 {@link DiagnosticsReport}。全部是内存读取，在 EDT 上调用没有负担。
 */
public final class WoodfishDiagnostics {

    private static final String UNKNOWN = WoodfishBundle.text("report.unknown");

    private WoodfishDiagnostics() {
    }

    /** 生成完整报告（Markdown） */
    public static @NotNull String build() {
        return DiagnosticsReport.format(collect(), WoodfishSettings.getInstance().snapshotState());
    }

    /** 在临时编辑器标签页里打开报告（只在内存中、不落盘），方便用户确认要提交的内容 */
    public static void openInEditor(@NotNull Project project, @NotNull String report) {
        if (project.isDisposed()) {
            return;
        }
        FileEditorManager.getInstance(project)
                .openFile(new LightVirtualFile("woodfish-diagnostics.md", report), true);
    }

    private static Facts collect() {
        ApplicationInfo app = ApplicationInfo.getInstance();
        EditorColorsScheme scheme = EditorColorsManager.getInstance().getGlobalScheme();
        // 内置方案的内部名与显示名不同（如 _@user_Darcula），两个都写出来便于对照
        String schemeName = scheme.getDisplayName().equals(scheme.getName())
                ? scheme.getName()
                : scheme.getDisplayName() + "（" + scheme.getName() + "）";
        String theme = LafManager.getInstance().getCurrentUIThemeLookAndFeel().getName();
        return new Facts(
                pluginVersion(),
                app.getFullApplicationName(),
                app.getBuild().asString(),
                System.getProperty("java.runtime.version", UNKNOWN)
                        + "（" + System.getProperty("java.vm.vendor", UNKNOWN) + "）",
                System.getProperty("os.name", UNKNOWN) + " " + System.getProperty("os.version", "")
                        + "（" + System.getProperty("os.arch", UNKNOWN) + "）",
                uiScale(),
                theme == null ? UNKNOWN : theme,
                schemeName,
                WoodfishEditorManager.installedCount());
    }

    /**
     * 插件版本：经插件类加载器拿描述符。{@code PluginManagerCore.getPlugin} 与
     * {@code PluginManager.getPluginByClass} 在 2026.2 都改成了内部 API，
     * {@link PluginAwareClassLoader#getPluginDescriptor()} 在 2024.3 ~ 2026.2 都是公开的。
     */
    private static String pluginVersion() {
        if (WoodfishDiagnostics.class.getClassLoader() instanceof PluginAwareClassLoader loader) {
            String version = loader.getPluginDescriptor().getVersion();
            if (version != null) {
                return version;
            }
        }
        return UNKNOWN;
    }

    /** IDE 缩放 + 系统（HiDPI）缩放：发光半径按像素算，显示异常时这两项最常用得上 */
    private static String uiScale() {
        String ide = percent(JBUIScale.scale(1f));
        Double system = systemScale();
        return system == null ? "IDE " + ide : WoodfishBundle.text("report.scale.both", ide, percent(system.floatValue()));
    }

    private static @Nullable Double systemScale() {
        try {
            if (GraphicsEnvironment.isHeadless()) {
                return null;
            }
            return GraphicsEnvironment.getLocalGraphicsEnvironment().getDefaultScreenDevice()
                    .getDefaultConfiguration().getDefaultTransform().getScaleX();
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String percent(float scale) {
        return String.format(Locale.ROOT, "%.0f%%", scale * 100);
    }
}
