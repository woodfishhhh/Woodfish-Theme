package com.github.yyyyolo7a79.woodfish.core;

import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DistributionTest {
    @Test void shippedPluginContainsAllMitNotices() throws Exception {
        try (var zip = new ZipFile(System.getProperty("woodfish.distribution"))) {
            var jar = zip.stream().filter(e -> e.getName().endsWith(".jar") && e.getName().contains("/lib/woodfish-theme-jetbrains")).findFirst().orElseThrow();
            var notices = new java.util.HashMap<String, String>();
            try (var entries = new ZipInputStream(zip.getInputStream(jar))) {
                for (var entry = entries.getNextEntry(); entry != null; entry = entries.getNextEntry()) {
                    if (java.util.Set.of("META-INF/LICENSE", "META-INF/THIRD_PARTY_NOTICES.md").contains(entry.getName()))
                        notices.put(entry.getName(), new String(entries.readAllBytes(), StandardCharsets.UTF_8));
                }
            }
            String license = notices.get("META-INF/LICENSE");
            assertTrue(license.contains("Woodfish") && license.contains("yyyyolo7a79"));
            String trail = notices.get("META-INF/THIRD_PARTY_NOTICES.md");
            assertTrue(trail.contains("Copyright (c) 2023 Brandon Kirbyson"));
            for (String text : java.util.List.of(license, trail)) {
                assertTrue(text.contains("Permission is hereby granted"));
                assertTrue(text.replaceAll("\\s+", " ").contains("OTHER DEALINGS IN THE SOFTWARE"));
            }
        }
    }
}
