package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.markup.CustomHighlighterOrder;
import com.intellij.openapi.editor.markup.CustomHighlighterRenderer;
import com.intellij.openapi.editor.markup.RangeHighlighter;
import com.intellij.util.concurrency.AppExecutorUtil;
import org.jetbrains.annotations.NotNull;

import javax.swing.SwingUtilities;
import java.awt.AlphaComposite;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.InvalidPathException;
import java.util.LinkedHashMap;
import java.util.Map;

/** Editor-local cover image, painted underneath ranges, the selection and text. */
final class EditorBackdrop implements CustomHighlighterRenderer {
    private static final Logger LOG = Logger.getInstance(EditorBackdrop.class);
    private static final java.util.concurrent.Executor WORKERS = AppExecutorUtil.createBoundedApplicationPoolExecutor("Woodfish backgrounds", 1);
    record Picture(String file, double blur) {}
    private record Version(Picture picture, java.nio.file.attribute.FileTime modified, long size) {}
    private static Map<Version, BufferedImage> recent = new LinkedHashMap<>(4, .75f, true);
    private final Editor editor;
    private final Requests requests = new Requests();
    private BufferedImage image;
    private float alpha;

    EditorBackdrop(Editor editor) { this.editor = editor; }

    void configure(EffectSettings settings) {
        alpha = (float) (settings.number("background.opacity") * (1 - settings.number("background.mask")));
        if (!settings.on("background.enabled")) { clear(); return; }
        var wanted = new Picture(settings.value("background.image"), settings.number("background.blur"));
        var owner = new java.lang.ref.WeakReference<>(this);
        requests.submit(WORKERS, wanted, decoded -> {
            var live = owner.get();
            if (live != null && !live.editor.isDisposed()) {
                live.image = decoded;
                live.editor.getContentComponent().repaint();
            }
        });
    }

    // Each editor contributes at most one waiting worker and one replacement request.
    static final class Requests {
        private long generation;
        private Runnable pending;
        private boolean scheduled;

        synchronized void submit(java.util.concurrent.Executor executor, Picture picture, java.util.function.Consumer<BufferedImage> apply) {
            long id = ++generation;
            pending = () -> {
                BufferedImage decoded = null;
                try { decoded = load(picture); }
                catch (IOException | InvalidPathException e) { LOG.warn("Woodfish background image could not be decoded", e); }
                var result = decoded;
                SwingUtilities.invokeLater(() -> { if (current(id)) apply.accept(result); });
            };
            if (!scheduled) {
                scheduled = true;
                executor.execute(() -> runLatest(executor));
            }
        }

        private void runLatest(java.util.concurrent.Executor executor) {
            Runnable next;
            synchronized (this) {
                next = pending;
                pending = null;
            }
            try {
                if (next != null) next.run();
            } finally {
                synchronized (this) {
                    if (pending == null) scheduled = false;
                    else executor.execute(() -> runLatest(executor));
                }
            }
        }

        private synchronized boolean current(long id) { return generation == id; }
        synchronized void cancel() { generation++; pending = null; }
    }

    static BufferedImage load(Picture picture) throws IOException {
        var attrs = picture.file.isBlank() ? null : java.nio.file.Files.readAttributes(java.nio.file.Path.of(picture.file),
                java.nio.file.attribute.BasicFileAttributes.class);
        var version = new Version(picture, attrs == null ? null : attrs.lastModifiedTime(), attrs == null ? 0 : attrs.size());
        Map<Version, BufferedImage> cache;
        synchronized (EditorBackdrop.class) {
            cache = recent;
            var hit = cache.get(version);
            if (hit != null) return hit;
        }
        BufferedImage image = BackdropImage.read(picture.file, picture.blur);
        synchronized (EditorBackdrop.class) {
            if (image != null) cache.put(version, image);
            if (cache.size() > 2) cache.remove(cache.keySet().iterator().next());
        }
        return image;
    }

    void clear() { requests.cancel(); image = null; }
    static synchronized void clearCache() { recent = new LinkedHashMap<>(4, .75f, true); }
    @Override public @NotNull CustomHighlighterOrder getOrder() { return CustomHighlighterOrder.BEFORE_BACKGROUND; }

    @Override public void paint(@NotNull Editor editor, @NotNull RangeHighlighter highlighter, @NotNull Graphics graphics) {
        if (image == null || alpha <= 0 || !(graphics instanceof Graphics2D original)) return;
        Rectangle viewport = editor.getScrollingModel().getVisibleArea();
        Graphics2D g = (Graphics2D) original.create();
        try { paintCover(g, image, viewport, alpha); } finally { g.dispose(); }
    }

    static void paintCover(Graphics2D g, BufferedImage image, Rectangle viewport, float alpha) {
        if (viewport.isEmpty()) return;
        double scale = Math.max((double) viewport.width / image.getWidth(), (double) viewport.height / image.getHeight());
        int width = (int) Math.ceil(image.getWidth() * scale), height = (int) Math.ceil(image.getHeight() * scale);
        g.clip(viewport);
        g.setComposite(AlphaComposite.SrcOver.derive(alpha));
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(image, viewport.x + (viewport.width - width) / 2, viewport.y + (viewport.height - height) / 2,
                width, height, null);
    }
}
