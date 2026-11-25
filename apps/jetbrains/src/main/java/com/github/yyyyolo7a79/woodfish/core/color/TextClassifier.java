package com.github.yyyyolo7a79.woodfish.core.color;

import com.github.yyyyolo7a79.woodfish.settings.SharedDefaults;
import java.util.BitSet;

/** The character tables are generated from theme-core. Token scanning does not allocate. */
public final class TextClassifier {
    private static final BitSet PUNCTUATION = SharedDefaults.characterSet("text.punctuation");
    private static final BitSet TRIM = SharedDefaults.characterSet("text.trim");
    private TextClassifier() {}

    public static boolean isPunctuationOnly(CharSequence text) {
        return isPunctuationOnly(text, 0, text.length());
    }

    public static boolean isPunctuationOnly(CharSequence text, int start, int end) {
        while (start < end && TRIM.get(text.charAt(start))) start++;
        while (end > start && TRIM.get(text.charAt(end - 1))) end--;
        if (start == end) return false;
        for (int i = start; i < end; i++) if (!PUNCTUATION.get(text.charAt(i))) return false;
        return true;
    }
}
