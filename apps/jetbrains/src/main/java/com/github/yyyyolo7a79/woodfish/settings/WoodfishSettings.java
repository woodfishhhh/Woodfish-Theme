package com.github.yyyyolo7a79.woodfish.settings;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.PersistentStateComponent;
import com.intellij.openapi.components.Service;
import com.intellij.openapi.components.State;
import com.intellij.openapi.components.Storage;
import org.jetbrains.annotations.NotNull;

import java.util.function.Consumer;

/**
 * Woodfish 设置服务（应用级，持久化到 {@code woodfish-theme.xml}）。
 *
 * <p>读写约定：
 * <ul>
 *   <li>读：渲染层用 {@link #effective()} 拿不可变快照；设置页用 {@link #snapshotState()}
 *       拿一份可随意修改的副本</li>
 *   <li>写：一律经 {@link #update(Consumer)}，它负责规范化、去重比较和广播，
 *       调用方不要直接改 {@link #getState()} 返回的对象</li>
 * </ul>
 */
@Service(Service.Level.APP)
@State(name = "WoodfishThemeSettings", storages = @Storage("woodfish-theme.xml"))
public final class WoodfishSettings implements PersistentStateComponent<WoodfishState> {

    private volatile WoodfishState state = new WoodfishState().migrateLegacySettings();

    private volatile EffectSettings effective = EffectSettings.from(state, 0);

    private long version = 0;

    public static @NotNull WoodfishSettings getInstance() {
        return ApplicationManager.getApplication().getService(WoodfishSettings.class);
    }

    /** 仅供平台序列化使用；业务代码请用 {@link #snapshotState()} */
    @Override
    public @NotNull WoodfishState getState() {
        return state;
    }

    @Override
    public void loadState(@NotNull WoodfishState loaded) {
        EffectSettings snapshot;
        synchronized (this) {
            state = loaded.copy().migrateLegacySettings().normalize();
            snapshot = advance();
        }
        broadcast(snapshot);
    }

    /** 当前状态的深拷贝，可自由修改（不会影响已生效设置） */
    public @NotNull WoodfishState snapshotState() {
        return state.copy();
    }

    /** 渲染层使用的不可变快照 */
    public @NotNull EffectSettings effective() {
        return effective;
    }

    /**
     * 修改设置：在副本上执行 {@code mutator}，规范化后若与当前值不同则生效并广播。
     *
     * @return 是否真的发生了变化
     */
    public boolean update(@NotNull Consumer<WoodfishState> mutator) {
        EffectSettings snapshot;
        synchronized (this) {
            WoodfishState next = state.copy().migrateLegacySettings();
            mutator.accept(next);
            next.normalize();
            if (next.equals(state)) {
                return false;
            }
            state = next;
            snapshot = advance();
        }
        // 锁外广播：订阅者里再调 update 或做耗时刷新都不会卡住其他线程
        broadcast(snapshot);
        return true;
    }

    /** 用整份状态替换（设置页 Apply 使用） */
    public boolean replace(@NotNull WoodfishState newState) {
        WoodfishState copy = newState.copy();
        return update(s -> {
            s.overlayEnabled = copy.overlayEnabled;
            s.hueShift = copy.hueShift;
            s.lightnessDelta = copy.lightnessDelta;
            s.neutralChroma = copy.neutralChroma;
            s.angle = copy.angle;
            s.syntaxGradientEnabled = copy.syntaxGradientEnabled;
            s.cjkGradientEnabled = copy.cjkGradientEnabled;
            s.glowEnabled = copy.glowEnabled;
            s.glowIntensity = copy.glowIntensity;
            s.welcomeShown = copy.welcomeShown;
            s.customPresets = copy.customPresets;
            s.options = copy.options;
        });
    }

    /** 生成新版本快照（调用方须持有锁） */
    private EffectSettings advance() {
        EffectSettings snapshot = EffectSettings.from(state, ++version);
        effective = snapshot;
        return snapshot;
    }

    private static void broadcast(EffectSettings snapshot) {
        var app = ApplicationManager.getApplication();
        if (app == null || app.isDisposed()) {
            return;
        }
        app.getMessageBus().syncPublisher(WoodfishSettingsListener.TOPIC).settingsChanged(snapshot);
    }
}
