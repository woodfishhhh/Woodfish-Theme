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
        motion.event("caret", 1, 12, 24, 18, 6, 1000);
        motion.tick(1000, 16);
        motion.event("caret", 1, 55, 24, 18, 6, 1016);
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
        motion.event("insert", 1, 30, 30, 18, 2, 1000);
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
        motion.event("insert", 1, 25, 25, 18, 6, 1000);
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

    @Test void separateCaretsHaveLocalTrailsAndRemovedCaretStops() {
        var s = new WoodfishState(); s.options.put("caretTrail.enabled", "true");
        var motion = new InputMotion(EffectSettings.from(s, 1), Color.BLUE, false);
        for (int i = 1; i <= 2; i++) motion.event("caret", i, i * 100, 10, 16, 2, 1000);
        motion.tick(1000, 16);
        for (int i = 1; i <= 2; i++) motion.event("caret", i, i * 100 + 20, 10, 16, 2, 1016);
        motion.tick(1016, 16);
        var image = new BufferedImage(320, 80, BufferedImage.TYPE_INT_ARGB); var g = image.createGraphics();
        try { motion.paint(g); } finally { g.dispose(); }
        assertTrue(java.util.Arrays.stream(image.getRGB(96, 3, 36, 33, null, 0, 36)).anyMatch(rgb -> rgb != 0));
        assertTrue(java.util.Arrays.stream(image.getRGB(196, 3, 36, 33, null, 0, 36)).anyMatch(rgb -> rgb != 0));
        assertTrue(java.util.Arrays.stream(image.getRGB(145, 0, 25, 75, null, 0, 25)).allMatch(rgb -> rgb == 0));
        motion.event("remove", 2, 0, 0, 0, 0, 1020); motion.tick(1032, 16);
        assertTrue(motion.bounds().getMaxX() < 140);
    }

    @Test void warmFramesFitLocalDirtyArea() {
        var s = new WoodfishState(); s.options.put("caretTrail.enabled", "true"); s.options.put("typingParticles.enabled", "true");
        var motion = new InputMotion(EffectSettings.from(s, 1), Color.WHITE, true);
        var bean = (com.sun.management.ThreadMXBean) java.lang.management.ManagementFactory.getThreadMXBean();
        var g = new BufferedImage(800, 480, BufferedImage.TYPE_INT_ARGB_PRE).createGraphics();
        long[] time = new long[240], bytes = new long[240], ticks = new long[240];
        try {
            for (int i = -120; i < 240; i++) {
                int t = (i + 121) * 16, x = 200 + (i + 120) % 80;
                motion.event("caret", 1, x, 200, 18, 4, t);
                if (i % 6 == 0) motion.event("insert", 1, x, 200, 18, 4, t);
                long before = bean.getCurrentThreadAllocatedBytes(), start = System.nanoTime();
                motion.tick(t, 16);
                if (i >= 0) ticks[i] = bean.getCurrentThreadAllocatedBytes() - before;
                motion.paint(g);
                if (i >= 0) { time[i] = System.nanoTime() - start; bytes[i] = bean.getCurrentThreadAllocatedBytes() - before; }
                assertTrue(motion.bounds().width < 400);
            }
        } finally { g.dispose(); }
        java.util.Arrays.sort(time); java.util.Arrays.sort(bytes); java.util.Arrays.sort(ticks);
        System.out.printf("tick allocation %d%n", ticks[119]);
        System.out.printf("240 hot frames: p50/p95 %.3f/%.3f ms, %d/%d bytes%n", time[119]/1e6, time[227]/1e6, bytes[119], bytes[227]);
    }

    @Test void lighterAddsOverlappingDarkModeParticles() {
        var image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB_PRE);
        var g = image.createGraphics();
        try {
            g.setComposite(AdditiveComposite.INSTANCE); g.setColor(Color.BLUE); g.fillRect(0, 0, 2, 2);
            g.setColor(Color.RED); g.fillRect(1, 1, 1, 1);
        } finally { g.dispose(); }
        assertEquals(Color.MAGENTA.getRGB(), image.getRGB(1, 1));
    }
}
