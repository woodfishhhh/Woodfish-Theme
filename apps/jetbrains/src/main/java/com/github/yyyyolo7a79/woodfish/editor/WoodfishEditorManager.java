package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.WoodfishPluginDisposable;
import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishSettingsListener;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.EditorFactory;
import com.intellij.openapi.editor.EditorKind;
import com.intellij.openapi.editor.colors.EditorColorsListener;
import com.intellij.openapi.editor.colors.EditorColorsManager;
import com.intellij.openapi.editor.event.EditorFactoryEvent;
import com.intellij.openapi.editor.event.EditorFactoryListener;
import com.intellij.openapi.editor.ex.EditorEx;
import org.jetbrains.annotations.NotNull;

import com.github.yyyyolo7a79.woodfish.ui.ThemeAppearance;
import com.intellij.ide.ui.LafManager;
import com.intellij.ide.ui.LafManagerListener;
import javax.swing.UIManager;
import java.awt.Component;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 通用叠层的全局入口：为每个合格的编辑器挂载 {@link SyntaxEffects}，编辑器释放时回收。
 *
 * <p>只挂载「用户写代码的地方」：主编辑器、Diff、预览。控制台、终端、单行输入框
 * 等不挂 —— 它们要么没有语法高亮，要么由别的组件自行绘制文字，重绘反而会出现重影。
 *
 * <p>设置变化与配色方案切换在这里统一分发给各编辑器，渲染层不需要各自订阅。
 */
public final class WoodfishEditorManager implements EditorFactoryListener {

    private static final ThemeAppearance APPEARANCE = new ThemeAppearance();
    private static final Logger LOG = Logger.getInstance(WoodfishEditorManager.class);

    private static final Map<Editor, SyntaxEffects> INSTALLED = new ConcurrentHashMap<>();

    /** 全局订阅只做一次；插件卸载时由应用级 Disposable 自动断开 */
    private static volatile boolean subscribed = false;

    /** 插件加载前就已打开的编辑器不会触发 editorCreated，借第一次回调补建 */
    private static volatile boolean initialScanDone = false;

    @Override
    public void editorCreated(@NotNull EditorFactoryEvent event) {
        ensureSubscribed();
        if (!initialScanDone) {
            initialScanDone = true;
            for (Editor existing : EditorFactory.getInstance().getAllEditors()) {
                install(existing);
            }
        }
        install(event.getEditor());
    }

    @Override
    public void editorReleased(@NotNull EditorFactoryEvent event) {
        SyntaxEffects effects = INSTALLED.remove(event.getEditor());
        if (effects != null) {
            disposeQuietly(effects);
        }
    }

    /** 当前已挂载的编辑器数量（诊断信息使用） */
    public static int installedCount() {
        return INSTALLED.size();
    }

    /** 插件卸载时调用：移除所有编辑器上的效果，不留任何 highlighter */
    public static void disposeAll() {
        for (SyntaxEffects effects : INSTALLED.values()) {
            disposeQuietly(effects);
        }
        INSTALLED.clear();
        EditorBackdrop.clearCache();
        if (APPEARANCE.restore()) LafManager.getInstance().repaintUI();
    }

    // ==================== 挂载 ====================

    private static void install(Editor editor) {
        if (!(editor instanceof EditorEx ex) || INSTALLED.containsKey(editor) || !isEligible(ex)) {
            return;
        }
        try {
            EffectSettings settings = WoodfishSettings.getInstance().effective();
            INSTALLED.put(editor, SyntaxEffects.install(ex, settings));
        } catch (Throwable t) {
            // 单个编辑器挂载失败不应影响其他编辑器
            LOG.warn("woodfish: 挂载编辑器失败", t);
        }
    }

    private static boolean isEligible(EditorEx editor) {
        if (editor.isDisposed() || editor.isOneLineMode() || editor.getProject() == null) {
            return false;
        }
        EditorKind kind = editor.getEditorKind();
        if (kind != EditorKind.MAIN_EDITOR && kind != EditorKind.DIFF && kind != EditorKind.PREVIEW) {
            return false;
        }
        return !isTerminalEditor(editor);
    }

    /**
     * 终端背后的 editor 在类型上与普通编辑器无异，只能沿组件树找终端特有的包名识别。
     * 终端文字由终端模拟器自行绘制，重绘渐变会与之错位。
     */
    private static boolean isTerminalEditor(Editor editor) {
        try {
            Component c = editor.getContentComponent();
            for (int depth = 0; c != null && depth < 16; depth++) {
                String name = c.getClass().getName();
                if (name.startsWith("com.intellij.terminal")
                        || name.startsWith("org.jetbrains.plugins.terminal")
                        || name.contains("JediTerm")) {
                    return true;
                }
                c = c.getParent();
            }
        } catch (Throwable ignored) {
            // 组件树不可用时按非终端处理
        }
        return false;
    }

    // ==================== 全局事件分发 ====================

    private static synchronized void ensureSubscribed() {
        if (subscribed) {
            return;
        }
        subscribed = true;
        var app = ApplicationManager.getApplication();
        // 绑定到插件级 Disposable：动态卸载插件时自动断开，见 WoodfishPluginDisposable
        var connection = app.getMessageBus().connect(WoodfishPluginDisposable.getInstance());

        syncAppearance();
        connection.subscribe(LafManagerListener.TOPIC, manager -> onEdt(WoodfishEditorManager::syncAppearance));
        connection.subscribe(WoodfishSettingsListener.TOPIC, settings -> onEdt(() -> {
            syncAppearance();
            INSTALLED.values().forEach(e -> e.settingsChanged(settings));
        }));

        // 配色方案切换（含切换 UI 主题时随之切换的编辑器配色）：派生颜色全部作废
        connection.subscribe(EditorColorsManager.TOPIC, (EditorColorsListener) scheme ->
                onEdt(() -> INSTALLED.values().forEach(SyntaxEffects::schemeChanged)));
    }

    private static void syncAppearance() {
        if (APPEARANCE.apply(UIManager.getLookAndFeelDefaults(), WoodfishSettings.getInstance().effective())) {
            LafManager.getInstance().repaintUI();
        }
    }

    private static void onEdt(Runnable task) {
        var app = ApplicationManager.getApplication();
        if (app.isDispatchThread()) {
            task.run();
        } else {
            app.invokeLater(task);
        }
    }

    private static void disposeQuietly(SyntaxEffects effects) {
        try {
            effects.dispose();
        } catch (Throwable t) {
            LOG.warn("woodfish: 卸载编辑器效果失败", t);
        }
    }
}
