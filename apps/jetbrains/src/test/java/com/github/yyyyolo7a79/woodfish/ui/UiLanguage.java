package com.github.yyyyolo7a79.woodfish.ui;

import com.intellij.DynamicBundle;

final class UiLanguage {
    private UiLanguage() {}

    static String expected(String chinese, String english) {
        return DynamicBundle.getLocale().getLanguage().equals("zh") ? chinese : english;
    }
}
