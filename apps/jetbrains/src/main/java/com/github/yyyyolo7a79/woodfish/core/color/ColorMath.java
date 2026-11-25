package com.github.yyyyolo7a79.woodfish.core.color;

import com.github.yyyyolo7a79.woodfish.core.SharedCore;
import java.awt.Color;

/** Adapts Java2D colors to the shared sRGB, OKLCH and gamut functions. */
public final class ColorMath {
    private ColorMath() {}

    public static Oklch rgbToOklch(double r, double g, double b) {
        double[] lch = SharedCore.numbers("oklch", r, g, b);
        return new Oklch(lch[0], lch[1], lch[2]);
    }

    public static Oklch fromColor(Color color) {
        int rgb = color.getRGB();
        return rgbToOklch((rgb >>> 16) & 255, (rgb >>> 8) & 255, rgb & 255);
    }

    public static double[] oklchToRgb(Oklch color) {
        return SharedCore.numbers("rgb", color.l(), color.c(), color.h(), false);
    }

    public static double[] gamutMap(Oklch color) {
        return SharedCore.numbers("rgb", color.l(), color.c(), color.h(), true);
    }

    public static boolean isInSrgbGamut(double[] rgb) {
        checkRgb(rgb);
        return (Boolean) SharedCore.call("inGamut", rgb[0], rgb[1], rgb[2]);
    }

    public static double offsetLightness(double lightness, double delta) {
        return ((Number) SharedCore.call("offsetLightness", lightness, delta)).doubleValue();
    }

    public static Color toColor(double[] rgb, double alpha) {
        checkRgb(rgb);
        return new Color(channel(rgb[0]), channel(rgb[1]), channel(rgb[2]), channel(alpha * 255));
    }

    private static int channel(double value) {
        return (int) Math.round(Math.clamp(value, 0, 255));
    }

    private static void checkRgb(double[] rgb) {
        if (rgb.length != 3) throw new IllegalArgumentException("RGB 需要三个通道");
    }
}
