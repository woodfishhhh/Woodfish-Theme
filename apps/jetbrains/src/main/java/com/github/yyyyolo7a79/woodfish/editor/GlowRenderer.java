package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.markup.CustomHighlighterOrder;
import com.intellij.openapi.editor.markup.CustomHighlighterRenderer;
import com.intellij.openapi.editor.markup.RangeHighlighter;
import com.intellij.ui.ColorUtil;
import org.jetbrains.annotations.NotNull;

import javax.swing.JComponent;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 发光层：在背景与选区之后、文字之前绘制（{@code isForeground() == false} 即
 * {@code CustomHighlighterOrder.AFTER_BACKGROUND}），等同于 CSS text-shadow 位于文字之下。
 *
 * <p>EDT 上只做三件事：为每个视觉行生成 {@link GlowSpec}、查缓存、把命中的图按设备像素 1:1 贴上去。
 * 未命中的交给 {@link GlowService} 在后台栅格化，完成后只重绘该行连同溢出的区域。
 *
 * <p><b>溢出与残影</b>：发光会越过行界落到上下行，而编辑器只重绘它认为变了的行。这里按行顶 y 记下
 * 每行上次贴的是哪张图；同一位置换图（文字、颜色、折叠、软换行任何原因）且新旧图的外扩范围
 * 超出本次 clip 时，补发一次覆盖新旧两张图的重绘。这比分别监听文档、高亮、折叠、软换行、inlay
 * 更可靠：所有导致发光变化的原因最后都体现为「这一行该贴的图变了」，而发光变化必然伴随编辑器
 * 对这一行的重绘，因此一定会被发现。
 *
 * <p><b>等待期间的占位</b>：新图未就绪时，若这一行的起始偏移没变（例如正在这一行打字），先贴旧图，
 * 避免当前行的发光随每次按键闪灭；行结构变了（回车、删行）就不占位，免得旧内容的发光短暂错位。
 */
final class GlowRenderer implements CustomHighlighterRenderer, GlowService.Client {

    /** 记住的行数上限：超出说明视野之外的条目没被及时清理，直接重置 */
    private static final int MAX_TRACKED_LINES = 4096;

    private static final class Drawn {
        int startOffset;
        GlowSpec spec;
        GlowImage shown;
        boolean pending;
        /** 当前贴着的图在用户空间的范围（没贴图时为空） */
        final Rectangle shownBounds = new Rectangle();
        /** 按 spec 估算的外扩范围：新图就绪时至少要重绘这么大 */
        final Rectangle specBounds = new Rectangle();
    }

    private final SyntaxEffects effects;
    private final Map<Integer, Drawn> drawn = new HashMap<>();
    private final ConcurrentLinkedQueue<GlowSpec> ready = new ConcurrentLinkedQueue<>();
    private final AtomicBoolean drainScheduled = new AtomicBoolean();
    private volatile Set<GlowSpec> wanted = Set.of();
    private volatile boolean disposed;

    GlowRenderer(SyntaxEffects effects) {
        this.effects = effects;
    }

    @Override
    public CustomHighlighterOrder getOrder() {
        // 见 GradientRenderer.getOrder：isForeground() 已标 forRemoval
        return CustomHighlighterOrder.AFTER_BACKGROUND;
    }

    @Override
    public void paint(@NotNull Editor editor, @NotNull RangeHighlighter highlighter, @NotNull Graphics g) {
        EffectSettings settings = effects.settings();
        if (!settings.glowActive() || effects.isDisabled() || !(g instanceof Graphics2D g2)) {
            return;
        }
        try {
            paintGlow(g2, settings);
            effects.renderSucceeded();
        } catch (Throwable t) {
            effects.renderFailed(t, "发光");
        } finally {
            if (!settings.gradientActive()) {
                effects.scanner().endSession();
            }
        }
    }

    /** 设置或配色变化：旧图不再适用，也不能拿来占位 */
    void reset() {
        drawn.clear();
        wanted = Set.of();
        ready.clear();
    }

    void dispose() {
        disposed = true;
        reset();
    }

    // ==================== GlowService.Client（任意线程） ====================

    @Override
    public boolean wants(GlowSpec spec) {
        return !disposed && wanted.contains(spec);
    }

    @Override
    public void glowReady(GlowSpec spec) {
        if (disposed) {
            return;
        }
        ready.add(spec);
        if (drainScheduled.compareAndSet(false, true)) {
            // any()：设置页里的预览编辑器处在模态对话框中，也要能刷新
            ApplicationManager.getApplication().invokeLater(this::drainReady, ModalityState.any(), o -> disposed);
        }
    }

    // ==================== 绘制（EDT） ====================

    private void paintGlow(Graphics2D g, EffectSettings settings) {
        AffineTransform tx = g.getTransform();
        if (tx.getShearX() != 0 || tx.getShearY() != 0 || !(tx.getScaleX() > 0) || !(tx.getScaleY() > 0)) {
            return; // 编辑器不会旋转；遇到奇怪的变换宁可不画
        }
        Rectangle clip = effects.clipOf(g);
        if (clip == null) {
            return;
        }
        boolean light = !ColorUtil.isDark(effects.editor().getColorsScheme().getDefaultBackground());
        boolean fractional = g.getRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS)
                == RenderingHints.VALUE_FRACTIONALMETRICS_ON;
        GlowParams params = new GlowParams(tx.getScaleX(), tx.getScaleY(), settings.glowIntensity(), light, fractional,
                g.getFontRenderContext().getAntiAliasingHint());
        int pad = params.padUser();
        PaintFrame f = effects.scanner().scan(g, clip, pad, settings.gradientActive() && effects.skipSelectedText());
        GlowService service = GlowService.getInstance();
        boolean includeCjk = settings.cjkGradientEnabled();

        Graphics2D device = null;
        List<GlowSpec> requests = null;
        List<Rectangle> repaints = null;
        // 编辑器组件绘制前已把平移对齐到整数设备像素（PaintUtil.alignTxToInt），这里取整只是保险
        int originX = (int) Math.round(tx.getTranslateX());
        try {
            for (int line = 0; line < f.lineCount; line++) {
                int top = f.lineTop[line];
                GlowSpec spec = GlowSpec.create(f, line, params, effects.deriver(), includeCjk);
                Drawn previous = drawn.get(top);
                if (spec != null && previous != null && spec.equals(previous.spec)) {
                    spec = previous.spec; // 复用实例，后续比较走引用相等
                }
                GlowImage image = spec == null ? null : service.lookup(spec);
                boolean pending = spec != null && image == null;
                GlowImage show = image;
                if (pending && previous != null && previous.startOffset == f.lineStart[line]) {
                    show = previous.shown;
                }
                if (show != null && show.isEmpty()) {
                    show = null;
                }

                if (show != null) {
                    if (device == null) {
                        device = (Graphics2D) g.create();
                        device.setTransform(new AffineTransform()); // 设备空间：clip 保持不变，贴图走 1:1 快速路径
                    }
                    int deviceTop = (int) Math.round(tx.getScaleY() * top + tx.getTranslateY());
                    device.drawImage(show.image(), originX + show.offsetX(), deviceTop + show.offsetY(), null);
                }

                Drawn state = previous;
                if (state == null) {
                    state = new Drawn();
                    drawn.put(top, state);
                } else if (state.shown != show && (state.shown != null || show != null)) {
                    Rectangle changed = union(state.shownBounds, bounds(show, top, tx, new Rectangle()));
                    if (!changed.isEmpty() && !clip.contains(changed)) {
                        if (repaints == null) {
                            repaints = new ArrayList<>();
                        }
                        repaints.add(changed);
                    }
                }
                state.startOffset = f.lineStart[line];
                state.spec = spec;
                state.shown = show;
                state.pending = pending;
                bounds(show, top, tx, state.shownBounds);
                specBounds(spec, top, pad, state.specBounds);
                if (pending) {
                    if (requests == null) {
                        requests = new ArrayList<>();
                    }
                    requests.add(spec);
                }
            }
        } finally {
            if (device != null) {
                device.dispose();
            }
        }

        prune(pad);
        // 先公布「正在等哪些图」再提交任务：后台线程开工前会据此判断是否还需要
        publishWanted();
        if (requests != null) {
            for (GlowSpec spec : requests) {
                service.request(spec, this);
            }
        }
        if (repaints != null) {
            JComponent component = effects.editor().getContentComponent();
            for (Rectangle r : repaints) {
                component.repaint(r);
            }
        }
    }

    /** 新图就绪：重绘仍在等这张图的行（连同旧图与新图可能覆盖的范围） */
    private void drainReady() {
        drainScheduled.set(false);
        if (disposed || effects.isDisabled()) {
            ready.clear();
            return;
        }
        Set<GlowSpec> done = new HashSet<>();
        for (GlowSpec spec; (spec = ready.poll()) != null; ) {
            done.add(spec);
        }
        JComponent component = effects.editor().getContentComponent();
        for (Drawn state : drawn.values()) {
            if (state.pending && state.spec != null && done.contains(state.spec)) {
                component.repaint(union(state.shownBounds, state.specBounds));
            }
        }
    }

    /** 丢掉远离视野的行：它们的发光早已不在屏幕上 */
    private void prune(int pad) {
        if (drawn.size() > MAX_TRACKED_LINES) {
            drawn.clear();
            return;
        }
        Rectangle visible = effects.editor().getScrollingModel().getVisibleArea();
        int lineHeight = Math.max(1, effects.editor().getLineHeight());
        int from = visible.y - 2 * pad - lineHeight;
        int to = visible.y + visible.height + 2 * pad;
        for (Iterator<Map.Entry<Integer, Drawn>> it = drawn.entrySet().iterator(); it.hasNext(); ) {
            int top = it.next().getKey();
            if (top < from || top > to) {
                it.remove();
            }
        }
    }

    private void publishWanted() {
        Set<GlowSpec> pending = null;
        for (Drawn state : drawn.values()) {
            if (state.pending && state.spec != null) {
                if (pending == null) {
                    pending = new HashSet<>();
                }
                pending.add(state.spec);
            }
        }
        wanted = pending == null ? Set.of() : pending;
    }

    /** 已贴图像在用户空间的范围（向外取整） */
    private static Rectangle bounds(GlowImage image, int top, AffineTransform tx, Rectangle out) {
        if (image == null || image.isEmpty()) {
            out.setBounds(0, 0, 0, 0);
            return out;
        }
        double sx = tx.getScaleX();
        double sy = tx.getScaleY();
        int x0 = (int) Math.floor(image.offsetX() / sx);
        int y0 = top + (int) Math.floor(image.offsetY() / sy);
        int x1 = (int) Math.ceil((image.offsetX() + image.image().getWidth()) / sx);
        int y1 = top + (int) Math.ceil((image.offsetY() + image.image().getHeight()) / sy);
        out.setBounds(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
        return out;
    }

    /** 按 spec 估算新图会覆盖的范围；多留 2px，保证包含 {@link #bounds} 算出的实际图像范围 */
    private static void specBounds(GlowSpec spec, int top, int pad, Rectangle out) {
        if (spec == null) {
            out.setBounds(0, 0, 0, 0);
            return;
        }
        int margin = pad + 2;
        int x0 = (int) Math.floor(spec.minX) - margin;
        int x1 = (int) Math.ceil(spec.maxX) + margin;
        out.setBounds(x0, top - margin, x1 - x0, spec.lineHeight + 2 * margin);
    }

    private static Rectangle union(Rectangle a, Rectangle b) {
        if (a.isEmpty()) {
            return new Rectangle(b);
        }
        if (b.isEmpty()) {
            return new Rectangle(a);
        }
        return a.union(b);
    }
}
