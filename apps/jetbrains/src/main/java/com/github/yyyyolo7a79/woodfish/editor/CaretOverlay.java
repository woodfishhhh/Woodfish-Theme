package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.NativeOptions;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.Caret;
import com.intellij.openapi.editor.colors.EditorColors;
import com.intellij.openapi.editor.event.CaretEvent;
import com.intellij.openapi.editor.event.CaretListener;
import com.intellij.openapi.ui.AbstractPainter;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.wm.IdeGlassPaneUtil;
import org.jetbrains.annotations.NotNull;

import javax.swing.JComponent;
import javax.swing.SwingUtilities;
import javax.swing.Timer;
import java.awt.*;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.InputMethodEvent;
import java.awt.event.KeyEvent;
import java.awt.geom.RoundRectangle2D;

/** Paints above the editor without replacing its caret, selection, or input handlers. */
final class CaretOverlay extends AbstractPainter {
    private final Editor editor;
    private final JComponent content;
    private final Timer timer;
    private EffectSettings settings;
    private InputMotion motion;
    private Color[] stops;
    private float[] fractions;
    private Rectangle previous = new Rectangle();
    private double lastTick;
    private final java.util.IdentityHashMap<Caret, Integer> caretIds = new java.util.IdentityHashMap<>();
    private int nextId;
    private Rectangle viewport = new Rectangle();
    private int lineHeight;

    CaretOverlay(Editor editor, EffectSettings settings, Disposable lifetime) {
        this.editor = editor;
        content = editor.getContentComponent();
        timer = new Timer(16, e -> tick());
        timer.setCoalesce(true);
        var focus = new FocusAdapter() {
            @Override public void focusGained(FocusEvent e) { wake(); }
            @Override public void focusLost(FocusEvent e) { stop(); }
        };
        content.addFocusListener(focus);
        Disposer.register(lifetime, () -> { stop(); content.removeFocusListener(focus); });
        editor.getCaretModel().addCaretListener(new CaretListener() {
            @Override public void caretPositionChanged(@NotNull CaretEvent event) { emit("caret", event.getCaret()); }
            @Override public void caretRemoved(@NotNull CaretEvent event) {
                Integer id = caretIds.remove(event.getCaret());
                if (id != null && motion != null) {
                    motion.event("remove", id, 0, 0, 0, 0, now());
                    repaint(previous.union(motion.bounds()));
                }
            }
        }, lifetime);
        IdeGlassPaneUtil.installPainter(content, this, lifetime);
        configure(settings);
    }

    void configure(EffectSettings next) {
        settings = next.forScheme(editor.getColorsScheme().getName());
        stops = NativeOptions.colors(settings.value("cursor.gradientStops"));
        fractions = new float[stops.length];
        for (int i = 0; i < stops.length; i++) fractions[i] = (float) i / (stops.length - 1);
        stop();
        wake();
    }

    private boolean focused() {
        return !editor.isDisposed() && content.isShowing() && content.isFocusOwner();
    }

    private boolean cursor() { return settings.overlayEnabled() && settings.on("cursor.enabled"); }

    private boolean inputEffects() {
        return settings.on("effects.enabled") && (settings.on("caretTrail.enabled") || settings.on("typingParticles.enabled"));
    }

    void inserted() {
        if (!SwingUtilities.isEventDispatchThread()) return;
        AWTEvent event = EventQueue.getCurrentEvent();
        if (event instanceof KeyEvent || event instanceof InputMethodEvent) emit("insert", editor.getCaretModel().getCurrentCaret());
    }

    private void emit(String kind, Caret source) {
        if (!focused()) return;
        if (inputEffects()) {
            if (motion == null) {
                var scheme = editor.getColorsScheme();
                Color accent = scheme.getColor(EditorColors.CARET_COLOR);
                motion = new InputMotion(settings, accent == null ? stops[0] : accent,
                        com.intellij.ui.ColorUtil.isDark(scheme.getDefaultBackground()));
            }
            Caret caret = source == null ? editor.getCaretModel().getPrimaryCaret() : source;
            Point p = editor.visualPositionToXY(caret.getVisualPosition());
            motion.event(kind, caretIds.computeIfAbsent(caret, unused -> ++nextId), p.x, p.y, editor.getLineHeight(), 0, now());
        }
        wake();
    }

    private void wake() {
        if (focused() && (cursor() || motion != null && motion.active())) {
            if (!timer.isRunning()) lastTick = now();
            timer.start();
        } else stop();
    }

    private void stop() {
        timer.stop();
        motion = null;
        if (!previous.isEmpty()) repaint(content.getVisibleRect());
        previous = new Rectangle();
    }

    private static double now() { return System.nanoTime() / 1_000_000.0; }

    private void tick() {
        if (!focused()) { stop(); return; }
        double time = now();
        boolean hadMotion = motion != null && motion.active();
        if (hadMotion) motion.tick(time, Math.min(64, time - lastTick));
        lastTick = time;
        Rectangle dirty = cursor() ? caretBounds() : new Rectangle(0, 0, -1, -1);
        if (hadMotion) dirty.add(motion.bounds());
        Rectangle visible = content.getVisibleRect();
        boolean changedView = !viewport.equals(visible) || lineHeight != editor.getLineHeight();
        repaint(changedView ? visible : previous.isEmpty() ? dirty : previous.union(dirty));
        viewport = visible;
        lineHeight = editor.getLineHeight();
        previous = dirty;
        if (!cursor() && (motion == null || !motion.active())) timer.stop();
    }

    private Rectangle caretBounds() {
        Rectangle bounds = null;
        int pad = 3 + (int) Math.ceil(settings.number("cursor.glowBlur"));
        for (var caret : editor.getCaretModel().getAllCarets()) {
            Point p = editor.visualPositionToXY(caret.getVisualPosition());
            var box = new Rectangle(p.x - pad, p.y - pad, Math.max(2, editor.getSettings().getLineCursorWidth()) + 2 * pad, editor.getLineHeight() + 2 * pad);
            bounds = bounds == null ? box : bounds.union(box);
        }
        return bounds == null ? new Rectangle() : bounds;
    }

    private void repaint(Rectangle dirty) {
        var root = SwingUtilities.getRootPane(content);
        if (root == null || dirty.isEmpty()) return;
        var glass = root.getGlassPane();
        Rectangle r = SwingUtilities.convertRectangle(content, dirty.intersection(content.getVisibleRect()), glass);
        glass.repaint(r.x, r.y, r.width, r.height);
    }

    @Override public boolean needsRepaint() { return settings != null && focused() && (cursor() || motion != null); }

    @Override public void executePaint(Component component, Graphics2D graphics) {
        if (!needsRepaint()) return;
        Graphics2D g = (Graphics2D) graphics.create();
        try {
            g.clip(content.getVisibleRect());
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            if (motion != null) motion.paint(g);
            if (!cursor()) return;
            for (var caret : editor.getCaretModel().getAllCarets()) {
                Point p = editor.visualPositionToXY(caret.getVisualPosition());
                paintCaret(g, p, editor.getLineHeight());
            }
        } finally { g.dispose(); }
    }

    private void paintCaret(Graphics2D g, Point p, int height) {
        double duration = settings.number("cursor.animationDuration") * 1000;
        double phase = now() % duration / duration;
        float start = (float) (p.y - 8 * height * phase);
        g.setPaint(new LinearGradientPaint(p.x, start, p.x, start + 9f * height, fractions, stops));
        int width = Math.max(2, editor.getSettings().getLineCursorWidth());
        double arc = settings.number("cursor.borderRadius") * 2;
        if (settings.on("cursor.glow")) {
            float opacity = (float) settings.number("cursor.glowOpacity");
            int layers = 1 + (int) Math.ceil(settings.number("cursor.glowBlur"));
            for (int i = layers; i > 0; i--) {
                g.setComposite(AlphaComposite.SrcOver.derive(opacity / layers));
                g.fill(new RoundRectangle2D.Double(p.x - i, p.y, width + i * 2, height, arc + i, arc + i));
            }
        }
        g.setComposite(AlphaComposite.SrcOver);
        g.fill(new RoundRectangle2D.Double(p.x, p.y, width, height, arc, arc));
    }
}
