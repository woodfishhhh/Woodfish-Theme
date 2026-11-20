package com.github.yyyyolo7a79.woodfish.ui.actions;

import com.github.yyyyolo7a79.woodfish.ui.WoodfishMenus;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.DumbAwareAction;
import com.intellij.openapi.ui.popup.ListPopup;
import org.jetbrains.annotations.NotNull;

/**
 * 打开 Woodfish 功能菜单（Woodfish.Menu 动作组）。不进菜单栏，供 Find Action 和快捷键使用；
 * 状态栏小部件点击时直接弹同一个菜单。
 */
public final class ShowFeatureMenuAction extends DumbAwareAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        ListPopup popup = WoodfishMenus.createFeatureMenu(e.getDataContext());
        if (popup != null) {
            popup.showInBestPositionFor(e.getDataContext());
        }
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
