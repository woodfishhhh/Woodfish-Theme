package com.github.yyyyolo7a79.woodfish.ui;

import com.intellij.openapi.actionSystem.ActionGroup;
import com.intellij.openapi.actionSystem.ActionManager;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.DataContext;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.popup.JBPopup;
import com.intellij.openapi.ui.popup.JBPopupFactory;
import com.intellij.openapi.ui.popup.ListPopup;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * 功能菜单与弹窗定位的公共逻辑。
 *
 * <p>功能菜单直接复用 plugin.xml 里的 {@value #MENU_GROUP_ID} 动作组：Tools 菜单、状态栏、
 * Find Action 三个入口看到的条目和勾选状态完全一致，不必另维护一份列表。
 */
public final class WoodfishMenus {

    public static final String MENU_GROUP_ID = "Woodfish.Menu";

    private WoodfishMenus() {
    }

    /** @return 动作组缺失（插件正在卸载等）时返回 null */
    public static @Nullable ListPopup createFeatureMenu(@NotNull DataContext dataContext) {
        AnAction group = ActionManager.getInstance().getAction(MENU_GROUP_ID);
        if (!(group instanceof ActionGroup actionGroup)) {
            return null;
        }
        return JBPopupFactory.getInstance().createActionGroupPopup(
                "Woodfish Theme", actionGroup, dataContext,
                JBPopupFactory.ActionSelectionAid.SPEEDSEARCH, true);
    }

    /**
     * 选择类弹窗（预设）居中显示在当前窗口，与平台的 Quick Switch Theme 一致；
     * 从状态栏菜单二次弹出时也不会贴着窗口底边。
     */
    public static void showCentered(@NotNull JBPopup popup, @Nullable Project project) {
        if (project != null && !project.isDisposed()) {
            popup.showCenteredInCurrentWindow(project);
        } else {
            popup.showInFocusCenter();
        }
    }
}
