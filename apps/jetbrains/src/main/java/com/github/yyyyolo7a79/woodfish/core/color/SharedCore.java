package com.github.yyyyolo7a79.woodfish.core.color;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.NativeArray;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

/** Pure, bundled theme-core. Call only on a color cache miss. */
final class SharedCore {
    private static final Scriptable API = load();

    private SharedCore() {}

    private static Scriptable load() {
        try (Context cx = Context.enter();
             var reader = new InputStreamReader(Objects.requireNonNull(
                     SharedCore.class.getResourceAsStream("/woodfish/theme-core.js")), StandardCharsets.UTF_8)) {
            cx.setLanguageVersion(Context.VERSION_ES6);
            var scope = cx.initSafeStandardObjects();
            cx.evaluateReader(scope, reader, "woodfish/theme-core.js", 1, null);
            return (Scriptable) ScriptableObject.getProperty(scope, "WoodfishCore");
        } catch (IOException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    // The shared JS gamut cache belongs to this realm. Calls may arrive from the glow worker or EDT.
    static synchronized Object call(String name, Object... args) {
        try (Context cx = Context.enter()) {
            cx.setLanguageVersion(Context.VERSION_ES6);
            var fn = (Function) ScriptableObject.getProperty(API, name);
            return fn.call(cx, ScriptableObject.getTopLevelScope(API), API, args);
        }
    }

    static double[] numbers(String name, Object... args) {
        var array = (NativeArray) call(name, args);
        double[] values = new double[(int) array.getLength()];
        for (int i = 0; i < values.length; i++) values[i] = ((Number) array.get(i, array)).doubleValue();
        return values;
    }
}
