package com.github.yyyyolo7a79.woodfish.ui.actions;

import com.github.yyyyolo7a79.woodfish.ui.WoodfishDiagnostics;
import com.github.yyyyolo7a79.woodfish.ui.WoodfishNotifier;
import com.intellij.notification.NotificationAction;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.ide.CopyPasteManager;
import com.intellij.openapi.project.DumbAwareAction;
import com.intellij.openapi.project.Project;
import org.jetbrains.annotations.NotNull;

/**
 * 生成诊断信息：IDE、JBR、系统、主题、配色方案与全部 Woodfish 参数，复制到剪贴板方便提 issue。
 * 有项目窗口时通知里附「在编辑器中查看」，与 VS Code 版「复制并打开报告」一致。
 */
public final class CopyDiagnosticsAction extends DumbAwareAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        String report = WoodfishDiagnostics.build();
        CopyPasteManager.copyTextToClipboard(report);

        Project project = e.getProject();
        AnAction[] actions = project == null
                ? new AnAction[0]
                : new AnAction[]{NotificationAction.createSimpleExpiring("在编辑器中查看",
                        () -> WoodfishDiagnostics.openInEditor(project, report))};
        WoodfishNotifier.info(project, "诊断信息已复制到剪贴板",
                "提交 GitHub issue 时直接粘贴即可。", actions);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
