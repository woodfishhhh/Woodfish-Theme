package com.github.yyyyolo7a79.woodfish.editor;

import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.HighlighterColors;
import com.intellij.openapi.editor.colors.EditorColorsScheme;
import com.intellij.openapi.editor.ex.EditorEx;
import com.intellij.openapi.editor.ex.RangeHighlighterEx;
import com.intellij.openapi.editor.highlighter.HighlighterIterator;
import com.intellij.openapi.editor.markup.HighlighterLayer;
import com.intellij.openapi.editor.markup.TextAttributes;
import com.intellij.util.DocumentUtil;
import com.intellij.util.Processor;

import java.awt.Color;
import java.awt.Font;

/**
 * 从编辑器收集「每段文字最终用什么颜色画」所需的全部输入，交给 {@link RunMerger} 合并。
 *
 * <p>来源与平台 IterationState 完全相同：lexer（{@code editor.getHighlighter()}）、
 * {@code getFilteredDocumentMarkupModel()}（daemon 的语义高亮：方法调用、字段、参数、未使用符号……）
 * 与 {@code getMarkupModel()}（编辑器级高亮：搜索结果、Focus Mode 等）。漏掉 document markup
 * 的话 Java 字段、Kotlin 参数这类颜色全都会画错，叠加上去非常难看。
 *
 * <p>本插件自己的两个 highlighter 不带 TextAttributes，{@code getTextAttributes(scheme)} 为 null，
 * 平台与这里都会直接跳过它们，不需要按身份排除。
 *
 * <p>只在 EDT 的绘制过程中使用（平台绘制时已持有读锁）。
 */
final class TokenRunCollector {

    private final RunMerger merger = new RunMerger(HighlighterLayer.SYNTAX);

    private Document document;
    private EditorColorsScheme scheme;
    private Color defaultForeground;
    private int defaultFont;

    private final Processor<RangeHighlighterEx> gatherer = highlighter -> {
        add(highlighter);
        return true;
    };

    /** Markup extends to the visual line end even when a fold ends the painted span. */
    void collect(EditorEx editor, int queryStart, int queryEnd, int spanStart, int spanEnd,
                 int visibleStart, int visibleEnd, RunMerger.Runs out) {
        merger.reset();
        document = editor.getDocument();
        scheme = editor.getColorsScheme();
        Color fg = scheme.getDefaultForeground();
        defaultForeground = fg != null ? fg : Color.GRAY;
        TextAttributes text = scheme.getAttributes(HighlighterColors.TEXT);
        defaultFont = text == null ? Font.PLAIN : text.getFontType();

        editor.getFilteredDocumentMarkupModel().processRangeHighlightersOverlappingWith(queryStart, queryEnd, gatherer);
        editor.getMarkupModel().processRangeHighlightersOverlappingWith(queryStart, queryEnd, gatherer);
        merger.finishGathering();

        int left = visibleStart, right = visibleEnd;
        for (long step = 1; ; step *= 2) {
            mergeWindow(editor, queryStart, queryEnd, spanStart, spanEnd, left, right, out);
            int last = out.count - 1;
            left = out.start[0];
            right = out.end[last];
            // Only an edge run touching the clip needs more lexer context to locate its gradient endpoint.
            boolean extendLeft = left > spanStart && out.end[0] > visibleStart;
            boolean extendRight = right < spanEnd && out.start[last] < visibleEnd;
            if (!extendLeft && !extendRight) return;
            if (extendLeft) left = (int) Math.max(spanStart, left - step);
            if (extendRight) right = (int) Math.min(spanEnd, right + step);
        }
    }

    private void mergeWindow(EditorEx editor, int queryStart, int queryEnd, int spanStart, int spanEnd,
                             int left, int right, RunMerger.Runs out) {
        out.clear();
        merger.resetLexemes();
        int start = left, end = right;
        HighlighterIterator it = editor.getHighlighter().createIterator(left);
        if (it.atEnd()) { start = spanStart; end = spanEnd; }
        while (!it.atEnd() && it.getStart() < right) {
            int s = align(Math.max(it.getStart(), spanStart));
            int e = align(Math.min(it.getEnd(), spanEnd));
            start = Math.min(start, s);
            end = Math.max(end, e);
            TextAttributes attributes = it.getTextAttributes();
            merger.addLexeme(s, e,
                    attributes == null ? null : attributes.getForegroundColor(),
                    attributes == null ? Font.PLAIN : attributes.getFontType());
            it.advance();
        }
        merger.merge(queryStart, queryEnd, start, end, defaultForeground, defaultFont, out);
    }

    /** 释放对编辑器对象的引用（帧结束后调用） */
    void release() {
        merger.reset();
        document = null;
        scheme = null;
    }

    private void add(RangeHighlighterEx highlighter) {
        // 与 IterationState.HighlighterSweep.skipHighlighter 相同的过滤条件
        if (!highlighter.isValid() || highlighter.isAfterEndOfLine()) {
            return;
        }
        TextAttributes attributes = highlighter.getTextAttributes(scheme);
        if (attributes == null) {
            return;
        }
        boolean erase = attributes == TextAttributes.ERASE_MARKER;
        Color fg = erase ? null : attributes.getForegroundColor();
        int fontType = erase ? Font.PLAIN : attributes.getFontType();
        if (!erase && fg == null && fontType == Font.PLAIN) {
            return; // 只带背景或效果，不影响文字颜色与字形
        }
        int affectedStart = highlighter.getAffectedAreaStartOffset();
        int affectedEnd = highlighter.getAffectedAreaEndOffset();
        merger.addHighlighter(highlighter.getStartOffset(), highlighter.getEndOffset(),
                align(affectedStart), align(affectedEnd), affectedEnd - affectedStart,
                highlighter.getLayer(), fg, fontType,
                !erase && attributes.getBackgroundColor() != null, erase,
                highlighter.getCustomRenderer() instanceof GradientRenderer && fontType == Font.BOLD);
    }

    private int align(int offset) {
        return DocumentUtil.alignToCodePointBoundary(document, offset);
    }
}
