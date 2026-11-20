package com.github.yyyyolo7a79.woodfish.ui.actions;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.DumbAwareToggleAction;
import org.jetbrains.annotations.NotNull;

/**
 * 三个效果开关的共同实现：勾选状态读不可变快照，切换经 {@link WoodfishSettings#update} 写入。
 *
 * <p>{@link #isSelected} 只读一个 volatile 快照、不碰 Swing，因此在后台线程更新（BGT）。
 * 继承 DumbAware 版本：索引期间同样可用。
 */
abstract class EffectToggleAction extends DumbAwareToggleAction {

    /** 从快照读出本开关的状态 */
    protected abstract boolean read(@NotNull EffectSettings settings);

    /** 把本开关写进状态副本 */
    protected abstract void write(@NotNull WoodfishState state, boolean enabled);

    @Override
    public final boolean isSelected(@NotNull AnActionEvent e) {
        return read(WoodfishSettings.getInstance().effective());
    }

    @Override
    public void setSelected(@NotNull AnActionEvent e, boolean state) {
        WoodfishSettings.getInstance().update(s -> write(s, state));
    }

    @Override
    public final @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
