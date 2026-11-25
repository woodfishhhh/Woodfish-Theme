package com.github.yyyyolo7a79.woodfish.core;

import org.junit.jupiter.api.Test;
import org.mozilla.javascript.Context;

import java.net.URL;
import java.net.URLClassLoader;
import static org.junit.jupiter.api.Assertions.*;

class IsolatedRuntimeTest {
    @Test void runtimeFindsBundledProvidersWithoutTheIdeThreadLoader() throws Exception {
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
}
