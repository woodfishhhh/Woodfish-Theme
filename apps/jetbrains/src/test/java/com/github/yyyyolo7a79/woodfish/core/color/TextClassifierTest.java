package com.github.yyyyolo7a79.woodfish.core.color;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.CharBuffer;
import org.junit.jupiter.api.Test;

class TextClassifierTest {

    @Test
    void matchesOriginalPunctuationOnly() {
        String[] texts = OriginalReferenceData.PUNCTUATION_TEXT;
        boolean[] expected = OriginalReferenceData.PUNCTUATION_EXPECTED;
        assertEquals(texts.length, expected.length);
        for (int i = 0; i < texts.length; i++) {
            assertEquals(expected[i], TextClassifier.isPunctuationOnly(texts[i]),
                    "文本 \"" + escape(texts[i]) + "\"");
        }
    }

    @Test
    void acceptsEveryOriginalPunctuationCharacter() {
        for (char ch : "()[]{}.,;:+-*/%=<>!?&|~^@#`'\"\\".toCharArray()) {
            assertTrue(TextClassifier.isPunctuationOnly(String.valueOf(ch)), "字符 " + ch);
        }
        for (char ch : "$_ 0aZ§·；。".toCharArray()) {
            assertFalse(TextClassifier.isPunctuationOnly(String.valueOf(ch)), "字符 " + escape(String.valueOf(ch)));
        }
    }

    @Test
    void trimsLikeJavaScriptRatherThanJava() {
        // JS 的 trim 认 U+00A0 / U+FEFF / U+202F，不认 U+001C..U+001F；Character.isWhitespace 恰好相反
        assertTrue(TextClassifier.isPunctuationOnly(" ; "));
        assertTrue(TextClassifier.isPunctuationOnly("﻿;"));
        assertTrue(TextClassifier.isPunctuationOnly(" ;"));
        assertFalse(TextClassifier.isPunctuationOnly("\u001c;"));
        assertFalse(TextClassifier.isPunctuationOnly("\u001f;"));
    }

    @Test
    void worksWithAnyCharSequence() {
        assertTrue(TextClassifier.isPunctuationOnly(new StringBuilder("  );\t")));
        assertTrue(TextClassifier.isPunctuationOnly(CharBuffer.wrap("x=>{}y", 1, 5)));
        assertFalse(TextClassifier.isPunctuationOnly(CharBuffer.wrap("x=> {}y", 1, 6)), "中间有空格");
        assertFalse(TextClassifier.isPunctuationOnly(new StringBuilder()));
    }

    private static String escape(String text) {
        StringBuilder out = new StringBuilder();
        for (char ch : text.toCharArray()) {
            if (ch >= 0x20 && ch < 0x7f) {
                out.append(ch);
            } else {
                out.append(String.format("\\u%04x", (int) ch));
            }
        }
        return out.toString();
    }
}
