package com.github.yyyyolo7a79.woodfish.ui;

import com.intellij.DynamicBundle;

public final class WoodfishBundle {
    private static final DynamicBundle BUNDLE = new DynamicBundle(WoodfishBundle.class, "messages.WoodfishBundle");
    private WoodfishBundle() {}
    public static String text(String key, Object... args) { return BUNDLE.getMessage(key, args); }
}
