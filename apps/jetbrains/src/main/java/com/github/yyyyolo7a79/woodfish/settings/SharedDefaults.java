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

    public static double number(String name) {
        return Double.parseDouble(Objects.requireNonNull(VALUES.getProperty(name), name));
    }
}
