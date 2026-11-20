package com.github.yyyyolo7a79.woodfish.settings;

import com.intellij.util.messages.Topic;
import org.jetbrains.annotations.NotNull;

/**
 * 设置变化通知（应用级消息总线）。
 *
 * <p>订阅方式：
 * <pre>{@code
 * ApplicationManager.getApplication().getMessageBus()
 *         .connect(parentDisposable)
 *         .subscribe(WoodfishSettingsListener.TOPIC, settings -> { ... });
 * }</pre>
 *
 * <p><b>线程</b>：设置页和动作在 EDT 上发布；但 {@code loadState}（启动、设置同步）
 * 可能在任意线程触发。需要碰 Swing / 编辑器的订阅者应自行判断，必要时
 * {@code invokeLater} 回到 EDT。
 */
@FunctionalInterface
public interface WoodfishSettingsListener {

    Topic<WoodfishSettingsListener> TOPIC =
            new Topic<>(WoodfishSettingsListener.class, Topic.BroadcastDirection.NONE);

    /** @param settings 变化后的完整快照 */
    void settingsChanged(@NotNull EffectSettings settings);
}
