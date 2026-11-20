package com.github.yyyyolo7a79.woodfish;

import com.github.yyyyolo7a79.woodfish.editor.WoodfishEditorManager;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.Service;
import org.jetbrains.annotations.NotNull;

/**
 * 插件生命周期的 Disposable 根。
 *
 * <p>不要把监听器挂到 Application 上：插件被动态卸载（禁用 / 更新）时 Application 不会销毁，
 * 挂在上面的监听器和编辑器上的 renderer 会把整个插件 ClassLoader 拖住，平台只能要求重启。
 * 平台卸载插件时会销毁它的应用级服务，于是挂在这里的东西都能被及时清理。
 */
@Service(Service.Level.APP)
public final class WoodfishPluginDisposable implements Disposable {

    public static @NotNull Disposable getInstance() {
        return ApplicationManager.getApplication().getService(WoodfishPluginDisposable.class);
    }

    @Override
    public void dispose() {
        WoodfishEditorManager.disposeAll();
    }
}
