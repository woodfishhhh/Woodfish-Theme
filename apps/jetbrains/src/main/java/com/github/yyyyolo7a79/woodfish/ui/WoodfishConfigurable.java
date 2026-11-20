package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.settings.WoodfishSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.intellij.openapi.options.Configurable;
import com.intellij.openapi.options.SearchableConfigurable;
import com.intellij.openapi.util.Disposer;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.JComponent;

/**
 * 设置页：Settings | Tools | Woodfish Theme。
 *
 * <p>表单只读写 {@link WoodfishState} 编辑副本，点 Apply / OK 时才经
 * {@link WoodfishSettings#replace} 一次性生效；调整过程中只有页内预览跟着变。
 *
 * <p>实现 {@link Configurable.NoScroll}：由面板自己滚动下方表单，预览区固定在顶部 ——
 * 拖动页面下方的滑块时也能同时看到效果。
 */
public final class WoodfishConfigurable implements SearchableConfigurable, Configurable.NoScroll {

    /** 与 plugin.xml 中 applicationConfigurable 的 id 一致 */
    public static final String ID = "com.github.yyyyolo7a79.woodfish.settings";

    private WoodfishSettingsPanel panel;

    @Override
    public @NotNull String getId() {
        return ID;
    }

    @Override
    public String getDisplayName() {
        return "Woodfish Theme";
    }

    @Override
    public @Nullable JComponent createComponent() {
        if (panel == null) {
            panel = new WoodfishSettingsPanel();
        }
        return panel.getComponent();
    }

    @Override
    public @Nullable JComponent getPreferredFocusedComponent() {
        return panel == null ? null : panel.getPreferredFocusedComponent();
    }

    @Override
    public boolean isModified() {
        return panel != null && !pending().equals(WoodfishSettings.getInstance().snapshotState());
    }

    @Override
    public void apply() {
        if (panel != null) {
            WoodfishSettings.getInstance().replace(pending());
        }
    }

    @Override
    public void reset() {
        if (panel != null) {
            panel.load(WoodfishSettings.getInstance().snapshotState());
        }
    }

    @Override
    public void disposeUIResources() {
        if (panel != null) {
            Disposer.dispose(panel);
            panel = null;
        }
    }

    /**
     * 要写回的完整状态：表单副本 + 当前的引导标记。
     *
     * <p>引导标记不在表单里编辑，若照搬打开设置页时的旧值，可能把启动后刚置位的标记改回去，
     * 导致下次启动重复弹引导；规范化后再比较，免得表单与已生效值只差在格式上也显示「已修改」。
     */
    private WoodfishState pending() {
        WoodfishState state = panel.editedState();
        state.welcomeShown = WoodfishSettings.getInstance().snapshotState().welcomeShown;
        return state.normalize();
    }
}
