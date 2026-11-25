package com.github.yyyyolo7a79.woodfish.editor;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class EditorBackdropTest {
    @Test void readsThePackagedCloudPictureWithoutAnIdeImagePlugin() throws Exception {
        var cloud = BackdropImage.read("", 0);
        assertTrue(cloud.getWidth() > 500 && cloud.getHeight() > 300);
        assertTrue(Math.max(cloud.getWidth(), cloud.getHeight()) <= 2560);
    }

    @Test void paintsAtTheViewportAndKeepsTheClipAndOpacity(@TempDir Path temp) throws Exception {
        var input = new BufferedImage(8, 4, BufferedImage.TYPE_INT_RGB);
        var ig = input.createGraphics();
        ig.setColor(Color.BLUE); ig.fillRect(0, 0, 8, 4); ig.dispose();
        var file = temp.resolve("background.png");
        ImageIO.write(input, "png", file.toFile());
        var target = new BufferedImage(20, 20, BufferedImage.TYPE_INT_ARGB);
        var g = target.createGraphics();
        try { EditorBackdrop.paintCover(g, BackdropImage.read(file.toString(), 0), new Rectangle(4, 5, 8, 8), .5f); }
        finally { g.dispose(); }
        assertEquals(0, target.getRGB(0, 0));
        assertEquals(0x800000ff, target.getRGB(8, 8));
    }

    private static void writeColor(Path path, Color color) throws Exception {
        var pixel = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        pixel.setRGB(0, 0, color.getRGB()); ImageIO.write(pixel, "png", path.toFile());
    }

    @Test void missingImageCanBeRetried(@TempDir Path temp) throws Exception {
        var path = temp.resolve("picture.png"); var request = new EditorBackdrop.Picture(path.toString(), 0);
        assertThrows(java.io.IOException.class, () -> EditorBackdrop.load(request));
        writeColor(path, Color.RED); assertEquals(Color.RED.getRGB(), EditorBackdrop.load(request).getRGB(0, 0));
    }

    @Test void replacingSamePathChangesPixels(@TempDir Path temp) throws Exception {
        var path = temp.resolve("picture.png"); var request = new EditorBackdrop.Picture(path.toString(), 0);
        writeColor(path, Color.RED); assertEquals(Color.RED.getRGB(), EditorBackdrop.load(request).getRGB(0, 0));
        writeColor(path, Color.GREEN); java.nio.file.Files.setLastModifiedTime(path, java.nio.file.attribute.FileTime.fromMillis(1000));
        assertEquals(Color.GREEN.getRGB(), EditorBackdrop.load(request).getRGB(0, 0));
    }

    @Test void latestBackgroundWinsAndDisposalDropsCallback(@TempDir Path temp) throws Exception {
        var queue = new java.util.ArrayList<Runnable>(); var applied = new java.util.ArrayList<Integer>();
        var requests = new EditorBackdrop.Requests(); var path = temp.resolve("ok.png"); writeColor(path, Color.GREEN);
        var picture = new EditorBackdrop.Picture(path.toString(), 0);
        requests.submit(queue::add, picture, image -> applied.add(1));
        requests.submit(queue::add, picture, image -> applied.add(2));
        assertEquals(1, queue.size()); queue.removeFirst().run(); javax.swing.SwingUtilities.invokeAndWait(() -> {});
        assertEquals(java.util.List.of(2), applied);
        javax.swing.SwingUtilities.invokeAndWait(() -> {
            requests.submit(queue::add, picture, image -> applied.add(3));
            queue.removeFirst().run(); requests.cancel();
        });
        javax.swing.SwingUtilities.invokeAndWait(() -> {}); assertEquals(java.util.List.of(2), applied);
    }
}
