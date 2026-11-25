package com.github.yyyyolo7a79.woodfish.settings;

import java.awt.Color;
import java.io.IOException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;

/** VS Code's setting IDs and ranges, with only non-default values saved in the IDE config. */
public final class NativeOptions {
    private static final Properties SCHEMA = load();
    public static final List<String> KEYS = List.of(SCHEMA.getProperty("keys").split(","));

    public static final List<String> PRESET_KEYS = List.of(SCHEMA.getProperty("presetKeys").split(","));

    private static final java.util.Set<String> THEMED = SCHEMA.stringPropertyNames().stream()
            .filter(key -> key.startsWith("theme.")).map(key -> key.substring(key.indexOf(".cursor.") + 1))
            .collect(java.util.stream.Collectors.toUnmodifiableSet());

    private NativeOptions() {}

    private static Properties load() {
        var properties = new Properties();
        try (var stream = Objects.requireNonNull(NativeOptions.class.getResourceAsStream("/woodfish/settings.properties"))) {
            properties.load(stream);
        } catch (IOException e) {
            throw new ExceptionInInitializerError(e);
        }
        return properties;
    }

    public static String schema(String key) { return SCHEMA.getProperty(key); }

    public static String get(Map<String, String> overrides, String key) {
        return overrides.getOrDefault(key, schema(key));
    }

    public static Map<String, String> normalize(Map<String, String> overrides) {
        var clean = new LinkedHashMap<String, String>();
        if (overrides == null) return clean;
        for (String key : KEYS) {
            String value = overrides.get(key);
            if (value != null) set(clean, key, value);
        }
        return clean;
    }

    public static void set(Map<String, String> overrides, String key, String raw) {
        String value = normalized(key, raw.strip());
        if (value.equals(schema(key)) && !THEMED.contains(key)) overrides.remove(key);
        else overrides.put(key, value);
    }

    private static String normalized(String key, String value) {
        String defaults = schema(key);
        String choices = schema(key + ".enum");
        if (choices != null) return Arrays.asList(choices.split(",")).contains(value) ? value : defaults;
        return switch (schema(key + ".type")) {
            case "boolean" -> value.equals("true") || value.equals("false") ? value : defaults;
            case "number" -> number(key, value, defaults);
            case "array" -> validText(key, value) ? value : defaults;
            default -> key.endsWith(".color") && !validColor(value) ? defaults : value;
        };
    }

    private static String number(String key, String input, String defaults) {
        try {
            double n = Double.parseDouble(input);
            if (!Double.isFinite(n)) return defaults;
            n = Math.clamp(n, Double.parseDouble(schema(key + ".min")), Double.parseDouble(schema(key + ".max")));
            return n == (int) n ? Integer.toString((int) n) : Double.toString(n);
        } catch (NumberFormatException e) {
            return defaults;
        }
    }

    public static boolean validText(String key, String raw) {
        String value = raw.strip();
        if (key.equals("cursor.gradientStops")) return validStops(value);
        if (key.equals("glass.targets")) {
            var available = List.of(schema(key).split(","));
            return value.isEmpty() || Arrays.stream(value.split(",", -1)).map(String::strip).allMatch(available::contains);
        }
        return !key.endsWith(".color") || validColor(value);
    }

    private static boolean validColor(String value) { return value.matches("#[0-9a-fA-F]{6}"); }

    private static boolean validStops(String value) {
        String[] stops = value.split(",", -1);
        return stops.length >= 2 && stops.length <= 32 && Arrays.stream(stops).allMatch(s -> validColor(s.strip()));
    }

    public static Color[] colors(String value) {
        return Arrays.stream(value.split(",")).map(String::strip).map(Color::decode).toArray(Color[]::new);
    }
}
