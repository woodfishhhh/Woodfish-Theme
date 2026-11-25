package com.github.yyyyolo7a79.woodfish.editor;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.util.Arrays;

/** Accumulate a cluster of additive dots in one small premultiplied tile and composite it once. */
final class ParticleTile {
    private static final int SIDE = 128;
    private final BufferedImage image = new BufferedImage(SIDE, SIDE, BufferedImage.TYPE_INT_ARGB_PRE);
    private final int[] pixels = ((DataBufferInt) image.getRaster().getDataBuffer()).getData();
    private int left, top, minX = SIDE, minY = SIDE, maxX, maxY;

    void dot(Graphics2D g, double x, double y, double radius, int color) {
        int x0 = (int) Math.floor(x - radius - .5), x1 = (int) Math.ceil(x + radius + .5);
        int y0 = (int) Math.floor(y - radius - .5), y1 = (int) Math.ceil(y + radius + .5);
        if (x0 < left || y0 < top || x1 > left + SIDE || y1 > top + SIDE) flush(g);
        if (minX == SIDE) { left = (int) x - SIDE / 2; top = (int) y - SIDE / 2; }
        minX = Math.min(minX, x0 - left); maxX = Math.max(maxX, x1 - left);
        minY = Math.min(minY, y0 - top); maxY = Math.max(maxY, y1 - top);
        for (int py = y0; py < y1; py++) {
            for (int px = x0; px < x1; px++) {
                double dx = px + .5 - x, dy = py + .5 - y;
                double coverage = Math.clamp(radius + .5 - Math.sqrt(dx * dx + dy * dy), 0d, 1d);
                int index = (py - top) * SIDE + px - left;
                pixels[index] = blend(pixels[index], color, (int) Math.round((color >>> 24) * coverage));
            }
        }
    }

    private static int blend(int dst, int color, int alpha) {
        int result = Math.min(255, (dst >>> 24) + alpha) << 24;
        for (int shift = 0; shift <= 16; shift += 8) {
            int channel = (color >>> shift & 255) * alpha;
            result |= Math.min(255, (dst >>> shift & 255) + (channel + 127) / 255) << shift;
        }
        return result;
    }

    void flush(Graphics2D g) {
        if (minX == SIDE) return;
        g.setComposite(AdditiveComposite.INSTANCE);
        g.drawImage(image, left + minX, top + minY, left + maxX, top + maxY, minX, minY, maxX, maxY, null);
        for (int row = minY; row < maxY; row++) Arrays.fill(pixels, row * SIDE + minX, row * SIDE + maxX, 0);
        minX = minY = SIDE; maxX = maxY = 0;
    }
}
