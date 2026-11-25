package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.WoodfishState;
import org.junit.jupiter.api.Test;
import java.awt.Color;
import java.awt.image.BufferedImage;
import static org.junit.jupiter.api.Assertions.*;

class InputMotionTest {
    @Test void sharedTrailStartsOnMovementAndStopsAtRest() {
        var config = new WoodfishState();
        config.options.put("caretTrail.enabled", "true");
        var motion = new InputMotion(EffectSettings.from(config, 1), Color.CYAN, true);
        motion.event("caret", 12, 24, 18, 6, 1000);
        motion.tick(1000, 16);
        motion.event("caret", 55, 24, 18, 6, 1016);
        motion.tick(1016, 16);
        assertTrue(motion.active());
        assertTrue(painted(motion));
        for (int i = 1; i < 120 && motion.active(); i++) motion.tick(1016 + i * 16, 16);
        assertFalse(motion.active());
    }

    @Test void typingBurstPaintsAndExpires() {
        var config = new WoodfishState();
        config.options.put("typingParticles.enabled", "true");
        var motion = new InputMotion(EffectSettings.from(config, 1), Color.CYAN, false);
        motion.event("insert", 30, 30, 18, 2, 1000);
        motion.tick(1016, 16);
        assertTrue(painted(motion));
        motion.tick(3000, 16);
        assertFalse(motion.active());
        assertFalse(painted(motion));
    }

    @Test void shakeMovesOnlyTheInputLayerAndReturnsToRest() {
        var cfg = new WoodfishState();
        cfg.options.put("typingParticles.enabled", "true");
        cfg.options.put("typingParticles.shake", "true");
        var motion = new InputMotion(EffectSettings.from(cfg, 1), Color.BLUE, true);
        motion.event("insert", 25, 25, 18, 6, 1000);
        var g = new BufferedImage(64, 64, BufferedImage.TYPE_INT_ARGB).createGraphics();
        try {
            var origin = g.getTransform();
            motion.tick(1060, 16);
            motion.paint(g);
            assertNotEquals(origin, g.getTransform());
            g.setTransform(origin);
            motion.tick(1200, 16);
            motion.paint(g);
            assertEquals(origin, g.getTransform());
        } finally { g.dispose(); }
    }

    private static boolean painted(InputMotion motion) {
        var image = new BufferedImage(96, 80, BufferedImage.TYPE_INT_ARGB);
        var g = image.createGraphics();
        try { motion.paint(g); } finally { g.dispose(); }
        return java.util.Arrays.stream(image.getRGB(0, 0, 96, 80, null, 0, 96)).anyMatch(rgb -> rgb != 0);
    }
}
