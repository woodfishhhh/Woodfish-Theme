package com.github.yyyyolo7a79.woodfish.ui;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.StatusBar;
import com.intellij.openapi.wm.StatusBarWidget;
import com.intellij.openapi.wm.StatusBarWidgetFactory;
import org.jetbrains.annotations.NotNull;

/**
 * 状态栏入口：显示 {@code Woodfish on · AG} / {@code Woodfish off}，点击打开功能菜单。
 *
 * <p>用户可以在状态栏右键菜单里按显示名「Woodfish Theme」隐藏它。
 */
public final class WoodfishStatusWidgetFactory implements StatusBarWidgetFactory {

    /** 与 plugin.xml 中 statusBarWidgetFactory 的 id 一致 */
    public static final String ID = "com.github.yyyyolo7a79.woodfish.status";

    @Override
    public @NotNull String getId() {
        return ID;
    }

    @Override
    public @NotNull String getDisplayName() {
        return "Woodfish Theme";
    }

    @Override
    public boolean isAvailable(@NotNull Project project) {
        return true;
    }

    @Override
    public @NotNull StatusBarWidget createWidget(@NotNull Project project) {
        return new WoodfishStatusWidget(project);
    }

    @Override
    public boolean canBeEnabledOn(@NotNull StatusBar statusBar) {
        return true;
    }
}
