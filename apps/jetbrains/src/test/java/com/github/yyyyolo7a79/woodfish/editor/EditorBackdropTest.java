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
}
