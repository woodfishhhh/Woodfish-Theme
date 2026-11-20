package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishSettingsListener;
import com.intellij.ide.DataManager;
import com.intellij.openapi.actionSystem.DataContext;
import com.intellij.openapi.actionSystem.impl.SimpleDataContext;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.popup.JBPopup;
import com.intellij.openapi.wm.StatusBar;
import com.intellij.openapi.wm.StatusBarWidget;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * 状态栏上的 Woodfish 小部件。
 *
 * <p>用 {@link StatusBarWidget.MultipleTextValuesPresentation}：点击时平台取 {@link #getPopup()}
 * 并把弹窗定位在小部件正上方，与编码、换行符等内置小部件的手感一致，不必自己算坐标。
 */
final class WoodfishStatusWidget implements StatusBarWidget, StatusBarWidget.MultipleTextValuesPresentation {

    private final Project project;
    private volatile StatusBar statusBar;

    WoodfishStatusWidget(@NotNull Project project) {
        this.project = project;
    }

    @Override
    public @NotNull String ID() {
        return WoodfishStatusWidgetFactory.ID;
    }

    @Override
    public @NotNull WidgetPresentation getPresentation() {
        return this;
    }

    @Override
    public void install(@NotNull StatusBar statusBar) {
        this.statusBar = statusBar;
        // 连接挂在小部件上：小部件被移除（用户隐藏、关闭项目、卸载插件）时自动断开
        ApplicationManager.getApplication().getMessageBus().connect(this)
                .subscribe(WoodfishSettingsListener.TOPIC, settings -> refresh());
    }

    @Override
    public @NotNull String getSelectedValue() {
        return StatusBarText.text(WoodfishSettings.getInstance().effective());
    }

    @Override
    public @NotNull String getTooltipText() {
        return StatusBarText.tooltip(WoodfishSettings.getInstance().effective());
    }

    @Override
    public @Nullable JBPopup getPopup() {
        StatusBar bar = statusBar;
        DataContext context = bar != null
                ? DataManager.getInstance().getDataContext(bar.getComponent())
                : SimpleDataContext.getProjectContext(project);
        return WoodfishMenus.createFeatureMenu(context);
    }

    @Override
    public void dispose() {
        statusBar = null;
    }

    /**
     * 设置可能在任意线程变化（启动时 loadState、设置同步），刷新统一回到 EDT。
     * 只是重画状态栏文字，用 {@link ModalityState#any()}：设置对话框开着时也立即刷新。
     */
    private void refresh() {
        StatusBar bar = statusBar;
        if (bar == null) {
            return;
        }
        var app = ApplicationManager.getApplication();
        if (app.isDispatchThread()) {
            bar.updateWidget(ID());
        } else {
            app.invokeLater(() -> {
                StatusBar current = statusBar;
                if (current != null) {
                    current.updateWidget(ID());
                }
            }, ModalityState.any());
        }
    }
}
