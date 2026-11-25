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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

/** Editor-local cover image, painted underneath ranges, the selection and text. */
final class EditorBackdrop implements CustomHighlighterRenderer {
    private static final Logger LOG = Logger.getInstance(EditorBackdrop.class);
    private record Picture(String file, double blur) {}
    private static final Map<Picture, CompletableFuture<BufferedImage>> RECENT = new LinkedHashMap<>(4, .75f, true);
    private final Editor editor;
    private Picture current;
    private BufferedImage image;
    private float alpha;

    EditorBackdrop(Editor editor) { this.editor = editor; }

    void configure(EffectSettings settings) {
        alpha = (float) (settings.number("background.opacity") * (1 - settings.number("background.mask")));
        if (!settings.on("background.enabled")) { clear(); return; }
        var wanted = new Picture(settings.value("background.image"), settings.number("background.blur"));
        if (wanted.equals(current)) return;
        current = wanted;
        image = null;
        load(wanted).thenAccept(decoded -> SwingUtilities.invokeLater(() -> {
            if (wanted.equals(current) && !editor.isDisposed()) {
                image = decoded;
                editor.getContentComponent().repaint();
            }
        }));
    }

    private static synchronized CompletableFuture<BufferedImage> load(Picture picture) {
        var future = RECENT.get(picture);
        if (future != null) return future;
        future = CompletableFuture.supplyAsync(() -> {
            try { return BackdropImage.read(picture.file(), picture.blur()); }
            catch (IOException | InvalidPathException e) { throw new CompletionException(e); }
        }, AppExecutorUtil.getAppExecutorService()).exceptionally(error -> {
            LOG.warn("Woodfish background image could not be decoded", error.getCause());
            return null;
        });
        RECENT.put(picture, future);
        if (RECENT.size() > 2) RECENT.remove(RECENT.keySet().iterator().next());
        return future;
    }

    void clear() { current = null; image = null; }
    static synchronized void clearCache() { RECENT.clear(); }
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
