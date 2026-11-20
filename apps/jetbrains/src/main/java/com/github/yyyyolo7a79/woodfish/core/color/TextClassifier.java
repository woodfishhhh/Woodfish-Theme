package com.github.yyyyolo7a79.woodfish.core.color;

/**
 * token 文本分类，对应原版 punctuationOnly。
 */
public final class TextClassifier {

    // 原版正则 /^[()[\]{}.,;:+\-*/%=<>!?&|~^@#`'"\\]+$/ 里的 30 个字符，全部是 ASCII
    private static final String PUNCTUATION = "()[]{}.,;:+-*/%=<>!?&|~^@#`'\"\\";

    // 按码点拆成两个 64 位掩码（0..63 与 64..127），绘制时逐字符判断不必查表或分配
    private static final long PUNCTUATION_LOW;
    private static final long PUNCTUATION_HIGH;

    static {
        long low = 0;
        long high = 0;
        for (int i = 0; i < PUNCTUATION.length(); i++) {
            char ch = PUNCTUATION.charAt(i);
            if (ch < 64) {
                low |= 1L << ch;
            } else {
                high |= 1L << (ch - 64);
            }
        }
        PUNCTUATION_LOW = low;
        PUNCTUATION_HIGH = high;
    }

    private TextClassifier() {
    }

    /**
     * 去掉首尾空白后非空，且只由这些字符组成：
     * <code>( ) [ ] { } . , ; : + - * / % = &lt; &gt; ! ? &amp; | ~ ^ @ # ` ' " \</code>。
     *
     * <p>空白按 JavaScript 的 {@code String.prototype.trim} 判定（原版先把 U+00A0 换成空格再 trim，
     * 结果相同）。中间夹着空白的文本（如 {@code "( )"}）不算纯标点。不分配对象。
     */
    public static boolean isPunctuationOnly(CharSequence text) {
        int start = 0;
        int end = text.length();
        while (start < end && isJsWhitespace(text.charAt(start))) {
            start++;
        }
        while (end > start && isJsWhitespace(text.charAt(end - 1))) {
            end--;
        }
        if (start == end) {
            return false;
        }
        for (int i = start; i < end; i++) {
            if (!isPunctuation(text.charAt(i))) {
                return false;
            }
        }
        return true;
    }

    private static boolean isPunctuation(char ch) {
        if (ch < 64) {
            return (PUNCTUATION_LOW >>> ch & 1) != 0;
        }
        return ch < 128 && (PUNCTUATION_HIGH >>> (ch - 64) & 1) != 0;
    }

    /**
     * ECMAScript 的 WhiteSpace 与 LineTerminator，即 trim 会去掉的字符。不能用
     * {@link Character#isWhitespace} / {@link String#strip}：它们把 U+001C..U+001F 当空白，
     * 却不认 U+00A0、U+2007、U+202F 和 U+FEFF。
     */
    private static boolean isJsWhitespace(char ch) {
        return switch (ch) {
            case '\t', '\n', '\u000B', '\f', '\r', '\uFEFF', '\u2028', '\u2029' -> true;
            default -> Character.getType(ch) == Character.SPACE_SEPARATOR;
        };
    }
}
