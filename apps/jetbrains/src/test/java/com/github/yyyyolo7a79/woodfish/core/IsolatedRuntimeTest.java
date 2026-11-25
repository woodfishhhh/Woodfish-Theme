package com.github.yyyyolo7a79.woodfish.core;

import org.junit.jupiter.api.Test;
import org.mozilla.javascript.Context;

import java.net.URL;
import java.net.URLClassLoader;
import static org.junit.jupiter.api.Assertions.*;

class IsolatedRuntimeTest {
    @Test void runtimeFindsBundledProvidersWithoutTheIdeThreadLoader() throws Exception {
        exercise();
    }

    @Test void closedRuntimeLoadersAreCollected() throws Exception {
        var first = exercise();
        var second = exercise();
        for (int i = 0; i < 100 && (!first.refersTo(null) || !second.refersTo(null)); i++) {
            System.gc();
            Thread.sleep(30);
        }
        assertTrue(first.refersTo(null) && second.refersTo(null));
    }

    private static java.lang.ref.WeakReference<ClassLoader> exercise() throws Exception {
        var classes = root(SharedCore.class, "com/github/yyyyolo7a79/woodfish/core/SharedCore.class");
        var rhino = root(Context.class, "org/mozilla/javascript/Context.class");
        var resources = root(SharedCore.class, "woodfish/theme-core.js");
        var thread = Thread.currentThread();
        var previous = thread.getContextClassLoader();
        var platform = ClassLoader.getPlatformClassLoader();
        try (var plugin = new URLClassLoader(new URL[]{classes, resources, rhino}, platform)) {
            thread.setContextClassLoader(platform);
            var core = plugin.loadClass(SharedCore.class.getName());
            var call = core.getMethod("call", String.class, Object[].class);
            assertEquals(28, ((Number) call.invoke(null, "roundedArc", new Object[]{16})).intValue());
            assertSame(platform, thread.getContextClassLoader());
            return new java.lang.ref.WeakReference<>(plugin);
        } finally {
            thread.setContextClassLoader(previous);
        }
    }
    private static URL root(Class<?> type, String resource) throws Exception {
        URL entry = java.util.Objects.requireNonNull(type.getResource("/" + resource));
        if (entry.openConnection() instanceof java.net.JarURLConnection jar) return jar.getJarFileURL();
        String file = entry.toString();
        return java.net.URI.create(file.substring(0, file.length() - resource.length())).toURL();
    }

    @Test void roundedAppearanceAppliesWithNoRhinoOnClasspath() throws Exception {
        var classes = root(SharedCore.class, "com/github/yyyyolo7a79/woodfish/core/SharedCore.class");
        try (var plugin = new URLClassLoader(new URL[]{classes}, ClassLoader.getPlatformClassLoader())) {
            assertThrows(ClassNotFoundException.class, () -> plugin.loadClass("org.mozilla.javascript.Context"));
            var type = plugin.loadClass("com.github.yyyyolo7a79.woodfish.ui.ThemeAppearance");
            var apply = type.getDeclaredMethod("apply", javax.swing.UIDefaults.class, boolean.class, boolean.class,
                    double.class, String.class, double.class);
            apply.setAccessible(true);
            var table = new javax.swing.UIDefaults(); table.put("Button.arc", 16);
            apply.invoke(type.getConstructor().newInstance(), table, true, false, 1d, "", 0d);
            assertEquals(28, table.get("Button.arc"));
        }
    }
}
