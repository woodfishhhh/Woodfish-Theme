package com.github.yyyyolo7a79.woodfish.settings;

import java.io.IOException;
import java.util.Objects;
import java.util.Properties;

/** Committed output of the theme-core generator. */
public final class SharedDefaults {
    private static final Properties VALUES = load();

    private SharedDefaults() {}

    private static Properties load() {
        var values = new Properties();
        try (var stream = Objects.requireNonNull(SharedDefaults.class.getResourceAsStream("/woodfish/defaults.properties"))) {
            values.load(stream);
        } catch (IOException e) {
            throw new ExceptionInInitializerError(e);
        }
        return values;
    }

    public static java.awt.Color editorForeground(java.awt.Color background, java.awt.Color text) {
        String key = String.format(java.util.Locale.ROOT, "foreground.%06X.%06X",
                background.getRGB() & 0xffffff, text.getRGB() & 0xffffff);
        String foreground = VALUES.getProperty(key);
        return foreground == null ? text : java.awt.Color.decode(foreground);
    }

    public static java.util.BitSet characterSet(String name) {
        var result = new java.util.BitSet();
        for (String code : VALUES.getProperty(name).split(",")) result.set(Integer.parseInt(code));
        return result;
    }

    public static double number(String name) {
        return Double.parseDouble(Objects.requireNonNull(VALUES.getProperty(name), name));
    }
}
