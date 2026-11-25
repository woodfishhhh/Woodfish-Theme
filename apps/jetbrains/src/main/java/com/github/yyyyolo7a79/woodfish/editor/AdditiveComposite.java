package com.github.yyyyolo7a79.woodfish.editor;

import java.awt.*;
import java.awt.image.*;

/** Canvas lighter: saturating addition in premultiplied RGBA, including on transparent glass. */
enum AdditiveComposite implements Composite {
    INSTANCE;
    public CompositeContext createContext(ColorModel src, ColorModel dst, RenderingHints hints) {
        return new CompositeContext() {
            public void dispose() {}
            public void compose(Raster source, Raster dest, WritableRaster out) {
                Object s = null, d = null;
                for (int y = 0; y < out.getHeight(); y++) {
                    for (int x = 0; x < out.getWidth(); x++) {
                        s = source.getDataElements(x + source.getMinX(), y + source.getMinY(), s);
                        d = dest.getDataElements(x + dest.getMinX(), y + dest.getMinY(), d);
                        d = dst.getDataElements(add(src.getRGB(s), dst.getRGB(d)), d);
                        out.setDataElements(x + out.getMinX(), y + out.getMinY(), d);
                    }
                }
            }
        };
    }
    private static int add(int s, int d) {
        int sa = s >>> 24, da = d >>> 24, a = Math.min(255, sa + da);
        if (a == 0) return 0;
        int rgb = a << 24;
        for (int shift = 0; shift <= 16; shift += 8) {
            int sum = (s >> shift & 255) * sa + (d >> shift & 255) * da;
            rgb |= Math.min(255, (sum + a / 2) / a) << shift;
        }
        return rgb;
    }
}
