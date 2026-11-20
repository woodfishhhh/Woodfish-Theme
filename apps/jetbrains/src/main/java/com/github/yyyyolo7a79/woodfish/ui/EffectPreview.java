package com.github.yyyyolo7a79.woodfish.ui;

import com.github.yyyyolo7a79.woodfish.editor.SyntaxEffects;
import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.EditorFactory;
import com.intellij.openapi.editor.EditorKind;
import com.intellij.openapi.editor.EditorSettings;
import com.intellij.openapi.editor.colors.EditorColorsListener;
import com.intellij.openapi.editor.colors.EditorColorsManager;
import com.intellij.openapi.editor.ex.EditorEx;
import com.intellij.openapi.editor.highlighter.EditorHighlighterFactory;
import com.intellij.openapi.fileTypes.FileType;
import com.intellij.openapi.fileTypes.FileTypeRegistry;
import com.intellij.openapi.fileTypes.LanguageFileType;
import com.intellij.ui.JBColor;
import com.intellij.util.ui.JBUI;
import org.jetbrains.annotations.NotNull;

import javax.swing.JComponent;
import javax.swing.JPanel;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.util.List;

/**
 * 设置页的实时预览：一个只读的小编辑器，挂的是<b>真正的</b> {@link SyntaxEffects}。
 *
 * <p>不另写一套绘制逻辑，因此预览与实际编辑器的效果完全一致。它用设置页<b>编辑中</b>的参数
 * 和自己的版本号序列生成 {@link EffectSettings}，拖动滑块只影响预览，点 Apply 才作用到正在写的代码。
 *
 * <p>预览编辑器不属于任何项目（project 为 null），{@code WoodfishEditorManager} 因此不会再给它挂一份效果。
 * 设置对话框关闭时由 {@link #dispose()} 先卸载效果、再释放编辑器，不留后台开销。
 */
final class EffectPreview implements Disposable {

    private static final Logger LOG = Logger.getInstance(EffectPreview.class);

    /**
     * 预览专用版本号的起点。全局设置的版本号从 0 开始递增，两条序列错开，
     * 渲染层即使有按版本号判断过期的共享缓存，也不会把预览参数和全局参数混为一谈。
     */
    private static final long VERSION_BASE = 1L << 62;

    /**
     * 示例代码：按顺序取第一个由<b>真正的语言插件</b>支持的（IDEA → Java，PyCharm → Python，
     * WebStorm → TypeScript），都不支持时按纯文本显示。TextMate 等通用高亮的语言 ID 对不上，不算支持。
     */
    private record Sample(String fileName, List<String> languageIds, String text) {
    }

    private static final String JAVA = String.join("\n",
            "// Woodfish：每个词以自己的原色为中点渐变",
            "public final class Greeter {",
            "    private static final int MAX = 42;",
            "",
            "    public String greet(String name) {",
            "        if (name == null || name.isBlank()) {",
            "            return \"Hello, Woodfish!\";",
            "        }",
            "        return \"Hi, \" + name.strip() + \"!\";",
            "    }",
            "}");

    private static final List<Sample> SAMPLES = List.of(
            new Sample("Preview.java", List.of("JAVA"), JAVA),
            new Sample("Preview.kt", List.of("kotlin"), String.join("\n",
                    "// Woodfish：每个词以自己的原色为中点渐变",
                    "class Greeter(private val max: Int = 42) {",
                    "    fun greet(name: String?): String {",
                    "        if (name.isNullOrBlank()) {",
                    "            return \"Hello, Woodfish!\"",
                    "        }",
                    "        return \"Hi, ${name.take(max)}\"",
                    "    }",
                    "}")),
            new Sample("preview.py", List.of("Python"), String.join("\n",
                    "# Woodfish：每个词以自己的原色为中点渐变",
                    "class Greeter:",
                    "    MAX = 42",
                    "",
                    "    def greet(self, name: str | None) -> str:",
                    "        if not name:",
                    "            return \"Hello, Woodfish!\"",
                    "        return f\"Hi, {name[:self.MAX]}\"")),
            new Sample("preview.ts", List.of("TypeScript"), String.join("\n",
                    "// Woodfish：每个词以自己的原色为中点渐变",
                    "export class Greeter {",
                    "    private readonly max = 42;",
                    "",
                    "    greet(name?: string): string {",
                    "        if (!name) {",
                    "            return \"Hello, Woodfish!\";",
                    "        }",
                    "        return `Hi, ${name.slice(0, this.max)}`;",
                    "    }",
                    "}")),
            new Sample("preview.js", List.of("JavaScript", "ECMAScript 6"), String.join("\n",
                    "// Woodfish：每个词以自己的原色为中点渐变",
                    "export class Greeter {",
                    "    max = 42;",
                    "",
                    "    greet(name) {",
                    "        if (!name) {",
                    "            return \"Hello, Woodfish!\";",
                    "        }",
                    "        return `Hi, ${name.slice(0, this.max)}`;",
                    "    }",
                    "}")),
            new Sample("preview.json", List.of("JSON"), String.join("\n",
                    "{",
                    "  \"name\": \"Woodfish Theme\",",
                    "  \"version\": 7,",
                    "  \"effects\": [\"gradient\", \"glow\"],",
                    "  \"glow\": { \"intensity\": 1.0, \"enabled\": true },",
                    "  \"cursor\": null",
                    "}")));

    /** 一个语言插件都没有时：仍用 Java 示例，按纯文本显示（默认前景色同样有渐变与发光） */
    private static final Sample PLAIN = new Sample("preview.txt", List.of(), JAVA);

    private final EditorEx editor;
    private final JPanel component = new JPanel(new BorderLayout());
    private SyntaxEffects effects;
    private long version = VERSION_BASE;
    private boolean effectsFailed = false;

    EffectPreview() {
        Sample sample = pickSample();
        EditorFactory factory = EditorFactory.getInstance();
        Document document = factory.createDocument(sample.text());
        // 只读 viewer，且不传 project：不会被 WoodfishEditorManager 当成普通编辑器重复挂载
        editor = (EditorEx) factory.createViewer(document, null, EditorKind.PREVIEW);

        // 语法高亮：用当前配色方案、按文件名取语言插件自带的词法高亮。
        // 没有项目，字段、方法调用等语义颜色做不了；失败时保持纯文本，不影响预览
        try {
            editor.setHighlighter(EditorHighlighterFactory.getInstance()
                    .createEditorHighlighter(editor.getColorsScheme(), sample.fileName(), null));
        } catch (RuntimeException | LinkageError e) {
            LOG.info("woodfish: 预览语法高亮创建失败，按纯文本显示（" + sample.fileName() + "）", e);
        }

        EditorSettings s = editor.getSettings();
        s.setLineNumbersShown(false);
        s.setFoldingOutlineShown(false);
        s.setLineMarkerAreaShown(false);
        s.setGutterIconsShown(false);
        s.setIndentGuidesShown(false);
        s.setRightMarginShown(false);
        s.setCaretRowShown(false);
        s.setUseSoftWraps(false);
        s.setAdditionalLinesCount(0);
        s.setAdditionalColumnsCount(1);
        editor.setCaretEnabled(false);
        // 高度按行数算好，不需要滚动条；横向滚动条一出现就会盖住最后一行
        editor.setVerticalScrollbarVisible(false);
        editor.setHorizontalScrollbarVisible(false);

        int lines = Math.max(1, document.getLineCount());
        editor.getComponent().setPreferredSize(new Dimension(
                JBUI.scale(420), editor.getLineHeight() * lines + JBUI.scale(12)));
        component.add(editor.getComponent(), BorderLayout.CENTER);
        component.setBorder(JBUI.Borders.customLine(JBColor.border(), 1));

        // 用户在设置对话框里换了配色方案（Editor | Color Scheme 点 Apply）：派生颜色作废，与普通编辑器一致
        ApplicationManager.getApplication().getMessageBus().connect(this)
                .subscribe(EditorColorsManager.TOPIC, (EditorColorsListener) scheme -> schemeChanged());
    }

    JComponent getComponent() {
        return component;
    }

    /** 按编辑中的参数刷新预览（EDT；表单任何改动都会调用） */
    void update(@NotNull WoodfishState edited) {
        if (effectsFailed || editor.isDisposed()) {
            return;
        }
        EffectSettings settings = EffectSettings.from(edited.copy().normalize(), ++version);
        try {
            if (effects == null) {
                effects = SyntaxEffects.install(editor, settings);
            } else {
                effects.settingsChanged(settings);
            }
        } catch (RuntimeException | LinkageError e) {
            // 渲染层出错只让预览失效，设置页其余部分照常可用
            effectsFailed = true;
            LOG.warn("woodfish: 设置页预览挂载效果失败", e);
        }
    }

    private void schemeChanged() {
        if (effects == null || effectsFailed || editor.isDisposed()) {
            return;
        }
        Runnable task = () -> {
            if (effects != null && !effectsFailed && !editor.isDisposed()) {
                effects.schemeChanged();
            }
        };
        var app = ApplicationManager.getApplication();
        if (app.isDispatchThread()) {
            task.run();
        } else {
            app.invokeLater(task, ModalityState.stateForComponent(component));
        }
    }

    @Override
    public void dispose() {
        try {
            if (effects != null) {
                effects.dispose();
            }
        } catch (RuntimeException | LinkageError e) {
            LOG.warn("woodfish: 卸载预览效果失败", e);
        } finally {
            effects = null;
            if (!editor.isDisposed()) {
                EditorFactory.getInstance().releaseEditor(editor);
            }
        }
    }

    private static Sample pickSample() {
        FileTypeRegistry registry = FileTypeRegistry.getInstance();
        for (Sample s : SAMPLES) {
            FileType type = registry.getFileTypeByFileName(s.fileName());
            if (type instanceof LanguageFileType lft) {
                String id = lft.getLanguage().getID();
                if (s.languageIds().stream().anyMatch(id::equalsIgnoreCase)) {
                    return s;
                }
            }
        }
        return PLAIN;
    }
}
