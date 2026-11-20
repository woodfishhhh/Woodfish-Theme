package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.color.AnchorHue;
import com.intellij.openapi.editor.DefaultLanguageHighlighterColors;
import com.intellij.openapi.editor.colors.EditorColorsScheme;
import com.intellij.openapi.editor.colors.TextAttributesKey;
import com.intellij.openapi.editor.markup.TextAttributes;
import com.intellij.util.ui.JBUI;
import org.jetbrains.annotations.NotNull;

import java.awt.Color;
import java.util.ArrayList;
import java.util.List;

/**
 * 从配色方案求中性色（白、灰文字）借用的锚点色相。
 *
 * <p>原版统计屏幕上可见 token 的颜色出现次数，取「次数 × 色度」最高的彩色。JetBrains 里没有现成的
 * 「可见 token 统计」，而且逐帧统计会让锚点随滚动跳变；这里改用配色方案里常见语法键的前景色，
 * 权重近似它们在一般代码里的出现频率，结果只随配色方案变化，更稳定。
 * 太灰（色度 &lt; 0.075）或太暗的颜色由 {@link AnchorHue#resolve} 过滤，所以默认前景色权重再大也
 * 不会被选中；都不合格时退回界面强调色（焦点色、链接色），再没有就用紫色 300°。
 */
final class AnchorHueResolver {

    private record Source(TextAttributesKey key, double weight) {
    }

    // 纯标点类（括号、运算符、逗号……）不参与，与原版排除纯标点 token 一致
    private static final List<Source> SOURCES = List.of(
            new Source(DefaultLanguageHighlighterColors.IDENTIFIER, 20),
            new Source(DefaultLanguageHighlighterColors.KEYWORD, 14),
            new Source(DefaultLanguageHighlighterColors.FUNCTION_CALL, 10),
            new Source(DefaultLanguageHighlighterColors.LOCAL_VARIABLE, 8),
            new Source(DefaultLanguageHighlighterColors.STRING, 8),
            new Source(DefaultLanguageHighlighterColors.CLASS_REFERENCE, 6),
            new Source(DefaultLanguageHighlighterColors.INSTANCE_FIELD, 6),
            new Source(DefaultLanguageHighlighterColors.PARAMETER, 5),
            new Source(DefaultLanguageHighlighterColors.INSTANCE_METHOD, 4),
            new Source(DefaultLanguageHighlighterColors.NUMBER, 4),
            new Source(DefaultLanguageHighlighterColors.MARKUP_TAG, 4),
            new Source(DefaultLanguageHighlighterColors.FUNCTION_DECLARATION, 3),
            new Source(DefaultLanguageHighlighterColors.CONSTANT, 3),
            new Source(DefaultLanguageHighlighterColors.MARKUP_ATTRIBUTE, 3),
            new Source(DefaultLanguageHighlighterColors.CLASS_NAME, 2),
            new Source(DefaultLanguageHighlighterColors.STATIC_FIELD, 2),
            new Source(DefaultLanguageHighlighterColors.STATIC_METHOD, 2),
            new Source(DefaultLanguageHighlighterColors.METADATA, 2),
            new Source(DefaultLanguageHighlighterColors.PREDEFINED_SYMBOL, 2),
            new Source(DefaultLanguageHighlighterColors.GLOBAL_VARIABLE, 1));

    private AnchorHueResolver() {
    }

    /** 只在 EDT 调用（读配色方案与 UI 主题色） */
    static double resolve(@NotNull EditorColorsScheme scheme) {
        Color defaultForeground = scheme.getDefaultForeground();
        List<AnchorHue.WeightedColor> candidates = new ArrayList<>(SOURCES.size());
        for (Source source : SOURCES) {
            TextAttributes attributes = scheme.getAttributes(source.key());
            Color fg = attributes == null ? null : attributes.getForegroundColor();
            // 没有单独设前景色的键按默认前景色绘制，照样计数（随后会因色度太低被过滤）
            candidates.add(new AnchorHue.WeightedColor(fg != null ? fg : defaultForeground, source.weight()));
        }

        List<Color> accents = new ArrayList<>(2);
        accents.add(JBUI.CurrentTheme.Focus.focusColor());
        accents.add(JBUI.CurrentTheme.Link.Foreground.ENABLED);
        return AnchorHue.resolve(candidates, accents);
    }
}
