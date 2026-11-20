package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.WoodfishPluginDisposable;
import com.github.yyyyolo7a79.woodfish.core.color.TokenColorDeriver;
import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.EditorFactory;
import com.intellij.openapi.editor.event.DocumentEvent;
import com.intellij.openapi.editor.event.DocumentListener;
import com.intellij.openapi.editor.event.EditorFactoryEvent;
import com.intellij.openapi.editor.event.EditorFactoryListener;
import com.intellij.openapi.editor.ex.EditorEx;
import com.intellij.openapi.editor.markup.CustomHighlighterRenderer;
import com.intellij.openapi.editor.markup.HighlighterLayer;
import com.intellij.openapi.editor.markup.HighlighterTargetArea;
import com.intellij.openapi.editor.markup.MarkupModel;
import com.intellij.openapi.editor.markup.RangeHighlighter;
import com.intellij.openapi.util.Disposer;
import org.jetbrains.annotations.NotNull;

import java.awt.Graphics2D;
import java.awt.Rectangle;

/**
 * 单个编辑器上的渐变 + 发光效果。
 *
 * <p>做法：在<b>编辑器级</b> MarkupModel（不影响同一文件的其他分屏）上放两个覆盖全文、两端贪婪、
 * 不带 TextAttributes 的 RangeHighlighter，各挂一个 custom renderer：
 * <ul>
 *   <li>{@link GlowRenderer}：背景与选区之后、文字之前，画分层发光（相当于 text-shadow）</li>
 *   <li>{@link GradientRenderer}：文字之后，用渐变画笔按原字体原位置重画字形（相当于 background-clip: text）</li>
 * </ul>
 * 两者在同一次绘制里共用 {@link FrameScanner} 的扫描结果，且只处理 clip 覆盖的视觉行，绝不遍历全文。
 *
 * <p>契约（见 {@link WoodfishEditorManager}）：
 * <ul>
 *   <li>{@link #install}、{@link #settingsChanged}、{@link #schemeChanged}、{@link #dispose} 都在 EDT 上调用</li>
 *   <li>{@link #install} 对 {@code getProject() == null} 的编辑器同样可用（设置页预览编辑器）</li>
 *   <li>{@link #dispose} 移除 highlighter、断开监听、放弃后台任务，不保留已释放编辑器的引用</li>
 * </ul>
 */
public final class SyntaxEffects implements Disposable {

    private static final Logger LOG = Logger.getInstance(SyntaxEffects.class);

    private final EditorEx editor;
    private final Disposable lifetime = Disposer.newDisposable("Woodfish syntax effects");
    private final FrameScanner scanner;
    private final GlowRenderer glowRenderer = new GlowRenderer(this);
    private final GradientRenderer gradientRenderer = new GradientRenderer(this);
    private final RenderGuard guard = new RenderGuard();

    private volatile EffectSettings settings;
    private volatile TokenColorDeriver deriver;
    private double anchorHue;

    private RangeHighlighter glowHighlighter;
    private RangeHighlighter gradientHighlighter;
    private boolean repairScheduled;
    private boolean disabled;
    private boolean disposed;

    private SyntaxEffects(EditorEx editor, EffectSettings settings) {
        this.editor = editor;
        this.settings = settings;
        this.scanner = new FrameScanner(editor);
    }

    public static @NotNull SyntaxEffects install(@NotNull EditorEx editor,
                                                 @NotNull EffectSettings settings) {
        SyntaxEffects effects = new SyntaxEffects(editor, settings);
        try {
            effects.attach();
        } catch (RuntimeException | Error e) {
            effects.dispose();
            throw e;
        }
        return effects;
    }

    private void attach() {
        // 所有清理都挂在 lifetime 上：无论是管理器调用 dispose()、编辑器先被释放，还是插件卸载时
        // 插件级 Disposable 级联释放，都只走一遍 cleanup
        Disposer.register(lifetime, this::cleanup);
        try {
            Disposer.register(WoodfishPluginDisposable.getInstance(), lifetime);
        } catch (Throwable t) {
            LOG.debug("woodfish: 未能挂到插件生命周期（插件可能正在卸载）", t);
        }

        anchorHue = AnchorHueResolver.resolve(editor.getColorsScheme());
        deriver = newDeriver(settings, anchorHue);
        addHighlighters();

        editor.getDocument().addDocumentListener(new DocumentListener() {
            @Override
            public void documentChanged(@NotNull DocumentEvent event) {
                if (!event.getDocument().isInBulkUpdate()) {
                    checkHighlighters();
                }
            }

            @Override
            public void bulkUpdateFinished(@NotNull Document document) {
                checkHighlighters();
            }
        }, lifetime);

        // 设置页预览编辑器等不经过管理器的调用方可能忘记 dispose：编辑器释放时自行收尾
        EditorFactory.getInstance().addEditorFactoryListener(new EditorFactoryListener() {
            @Override
            public void editorReleased(@NotNull EditorFactoryEvent event) {
                if (event.getEditor() == editor) {
                    dispose();
                }
            }
        }, lifetime);
    }

    public void settingsChanged(@NotNull EffectSettings newSettings) {
        EffectSettings old = settings;
        settings = newSettings;
        if (disposed) {
            return;
        }
        if (Double.compare(old.hueShift(), newSettings.hueShift()) != 0
                || Double.compare(old.lightnessDelta(), newSettings.lightnessDelta()) != 0
                || Double.compare(old.neutralChroma(), newSettings.neutralChroma()) != 0) {
            deriver = newDeriver(newSettings, anchorHue);
        }
        refresh();
    }

    public void schemeChanged() {
        if (disposed) {
            return;
        }
        anchorHue = AnchorHueResolver.resolve(editor.getColorsScheme());
        deriver = newDeriver(settings, anchorHue);
        // 配色变了，旧发光图里的颜色全部作废
        GlowService.getInstance().clearCache();
        refresh();
    }

    @Override
    public void dispose() {
        Disposer.dispose(lifetime);
    }

    // ==================== 供两个渲染器使用（EDT） ====================

    @NotNull EditorEx editor() {
        return editor;
    }

    @NotNull EffectSettings settings() {
        return settings;
    }

    @NotNull TokenColorDeriver deriver() {
        return deriver;
    }

    @NotNull FrameScanner scanner() {
        return scanner;
    }

    boolean isDisabled() {
        return disabled || disposed;
    }

    /** 方案定义了选区前景色、且确有选区时，渐变要跳过选中文字（编辑器会用选区前景色画它们） */
    boolean skipSelectedText() {
        return editor.getSelectionModel().hasSelection(true)
                && editor.getSelectionModel().getTextAttributes().getForegroundColor() != null;
    }

    /** 本次绘制要处理的范围；没有 clip 时退回可见区域，绝不处理整篇文档 */
    Rectangle clipOf(Graphics2D g) {
        Rectangle clip = g.getClipBounds();
        if (clip == null) {
            clip = editor.getScrollingModel().getVisibleArea();
        }
        return clip.isEmpty() ? null : clip;
    }

    void renderSucceeded() {
        guard.success();
    }

    void renderFailed(Throwable t, String where) {
        scanner.endSession();
        if (guard.failure(t, where)) {
            disabled = true;
            // 绘制途中不能改 MarkupModel：排到绘制结束后撤下 highlighter
            ApplicationManager.getApplication().invokeLater(() -> {
                if (!disposed) {
                    removeHighlighters();
                    glowRenderer.reset();
                    gradientRenderer.clearCaches();
                    editor.getContentComponent().repaint();
                }
            }, ModalityState.any());
        }
    }

    // ==================== 内部 ====================

    private void refresh() {
        scanner.endSession();
        glowRenderer.reset();
        gradientRenderer.clearCaches();
        if (!editor.isDisposed()) {
            editor.getContentComponent().repaint();
        }
    }

    private static TokenColorDeriver newDeriver(EffectSettings s, double anchorHue) {
        return new TokenColorDeriver(s.hueShift(), s.lightnessDelta(), s.neutralChroma(), anchorHue);
    }

    private void addHighlighters() {
        glowHighlighter = addHighlighter(glowRenderer);
        gradientHighlighter = addHighlighter(gradientRenderer);
    }

    /**
     * 覆盖全文的 highlighter：LINES_IN_RANGE + 两端贪婪，文首文末的插入都会被包进来；
     * 不带 TextAttributes，平台合并文字属性时会直接跳过它，不影响任何颜色、错误条或复制带格式文本。
     */
    private RangeHighlighter addHighlighter(CustomHighlighterRenderer renderer) {
        MarkupModel markup = editor.getMarkupModel();
        RangeHighlighter highlighter = markup.addRangeHighlighter(0, editor.getDocument().getTextLength(),
                HighlighterLayer.FIRST, null, HighlighterTargetArea.LINES_IN_RANGE);
        highlighter.setGreedyToLeft(true);
        highlighter.setGreedyToRight(true);
        highlighter.setCustomRenderer(renderer);
        return highlighter;
    }

    /**
     * 文档改动后确认 highlighter 仍覆盖全文。贪婪的全文区间在整体替换、清空后再输入时都能保持，
     * 这里只是兜底：一旦失效或缩水，排到写操作之外重建（文档监听里不宜改 MarkupModel）。
     */
    private void checkHighlighters() {
        if (repairScheduled || disposed || disabled) {
            return;
        }
        int length = editor.getDocument().getTextLength();
        if (covers(glowHighlighter, length) && covers(gradientHighlighter, length)) {
            return;
        }
        repairScheduled = true;
        ApplicationManager.getApplication().invokeLater(() -> {
            repairScheduled = false;
            if (disposed || disabled || editor.isDisposed()) {
                return;
            }
            int now = editor.getDocument().getTextLength();
            if (!covers(glowHighlighter, now) || !covers(gradientHighlighter, now)) {
                removeHighlighters();
                addHighlighters();
            }
        }, ModalityState.any());
    }

    private static boolean covers(RangeHighlighter highlighter, int length) {
        return highlighter != null && highlighter.isValid()
                && highlighter.getStartOffset() == 0 && highlighter.getEndOffset() == length;
    }

    private void removeHighlighters() {
        for (RangeHighlighter highlighter : new RangeHighlighter[] {glowHighlighter, gradientHighlighter}) {
            if (highlighter != null) {
                try {
                    highlighter.dispose(); // 等价于 markupModel.removeHighlighter，编辑器已释放时为空操作
                } catch (Throwable t) {
                    LOG.debug("woodfish: 移除 highlighter 失败", t);
                }
            }
        }
        glowHighlighter = null;
        gradientHighlighter = null;
    }

    /** 由 lifetime 释放时调用一次：之后不再引用编辑器的任何模型 */
    private void cleanup() {
        if (disposed) {
            return;
        }
        disposed = true;
        removeHighlighters();
        glowRenderer.dispose();
        gradientRenderer.clearCaches();
        scanner.dispose();
    }
}
