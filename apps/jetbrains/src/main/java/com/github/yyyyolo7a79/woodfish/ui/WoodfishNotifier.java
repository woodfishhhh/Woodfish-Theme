package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishSettings;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroup;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.text.StringUtil;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Woodfish 的通知统一从这里发出（通知组 {@value #GROUP_ID} 在 plugin.xml 中注册为 BALLOON）。
 *
 * <p>{@link Notification#notify} 本身线程安全，可以在后台线程（如启动活动）里直接调用。
 */
public final class WoodfishNotifier {

    public static final String GROUP_ID = "Woodfish Theme";

    private static final Logger LOG = Logger.getInstance(WoodfishNotifier.class);

    private WoodfishNotifier() {
    }

    /**
     * @param content 通知正文按 HTML 渲染：拼进用户输入（如预设名）前先用 {@link #escape} 转义
     */
    public static void notify(@Nullable Project project, @NotNull NotificationType type,
                              @NotNull String title, @NotNull String content, @NotNull AnAction... actions) {
        NotificationGroup group = NotificationGroupManager.getInstance().getNotificationGroup(GROUP_ID);
        if (group == null) {
            // 只会在 plugin.xml 漏注册时发生；记日志而不是让动作直接失败
            LOG.warn("woodfish: 通知组未注册：" + GROUP_ID);
            return;
        }
        Notification notification = group.createNotification(title, content, type);
        for (AnAction action : actions) {
            notification.addAction(action);
        }
        notification.notify(project);
    }

    public static void info(@Nullable Project project, @NotNull String title, @NotNull String content,
                            @NotNull AnAction... actions) {
        notify(project, NotificationType.INFORMATION, title, content, actions);
    }

    /**
     * 打开了某个效果层或应用了预设、但总开关是关着的：提醒一句并给出「打开总开关」按钮，
     * 否则用户会以为操作没起作用。
     */
    public static void warnIfOverlayOff(@Nullable Project project, @NotNull String what) {
        if (WoodfishSettings.getInstance().effective().overlayEnabled()) {
            return;
        }
        info(project, "Woodfish 通用叠层已关闭",
                escape(what) + "，但总开关处于关闭状态，打开后才会显示效果。",
                NotificationAction.createSimpleExpiring("打开总开关",
                        () -> WoodfishSettings.getInstance().update(s -> s.overlayEnabled = true)));
    }

    /** 转义 HTML 特殊字符 */
    public static @NotNull String escape(@NotNull String text) {
        return StringUtil.escapeXmlEntities(text);
    }
}
