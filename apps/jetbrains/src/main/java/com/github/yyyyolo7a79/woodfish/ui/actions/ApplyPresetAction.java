package com.github.yyyyolo7a79.woodfish.ui.actions;

import com.github.yyyyolo7a79.woodfish.ui.PresetUi;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.DumbAwareAction;
import org.jetbrains.annotations.NotNull;

/** 选择效果预设：弹出内置 / 我的预设列表，选中即生效（只改效果参数，不改总开关） */
public final class ApplyPresetAction extends DumbAwareAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        PresetUi.showChooser(e.getProject());
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
