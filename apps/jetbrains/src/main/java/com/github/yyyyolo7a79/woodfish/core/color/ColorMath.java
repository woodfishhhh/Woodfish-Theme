package com.github.yyyyolo7a79.woodfish.core.color;

import java.awt.Color;

/**
 * sRGB 与 OKLCH 的换算及色域映射，逐项移植自原版 overlay-bootstrap.js。
 *
 * <p>矩阵系数与运算顺序和原版完全相同，派生颜色才能与 VS Code 版一致（单测对照 Node
 * 运行原版得到的数值，误差在 1e-9 以内）。超越函数统一用 {@link StrictMath}：它是 fdlibm
 * 的移植，结果在任何 JVM / CPU 上逐位确定；这些函数只在派生颜色的缓存未命中时调用，
 * 速度无关紧要。
 *
 * <p>RGB 一律是 0..255 的 double。中间结果不裁剪（与原版相同），只有 {@link #toColor}
 * 生成 {@link Color} 时才裁剪。
 */
public final class ColorMath {

    private ColorMath() {
    }

    /** sRGB（各通道 0..255）转 OKLCH */
    public static Oklch rgbToOklch(double r, double g, double b) {
        double red = srgbToLinear(r);
        double green = srgbToLinear(g);
        double blue = srgbToLinear(b);
        double lightRoot = StrictMath.cbrt(
                0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
        double mediumRoot = StrictMath.cbrt(
                0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
        double shortRoot = StrictMath.cbrt(
                0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
        double lightness =
                0.2104542553 * lightRoot + 0.793617785 * mediumRoot - 0.0040720468 * shortRoot;
        double okA =
                1.9779984951 * lightRoot - 2.428592205 * mediumRoot + 0.4505937099 * shortRoot;
        double okB =
                0.0259040371 * lightRoot + 0.7827717662 * mediumRoot - 0.808675766 * shortRoot;
        return new Oklch(lightness, StrictMath.hypot(okA, okB),
                StrictMath.atan2(okB, okA) * 180 / Math.PI);
    }

    /** {@link Color} 转 OKLCH，忽略 alpha */
    public static Oklch fromColor(Color color) {
        // 只读一次 getRGB：JBColor 之类的动态颜色每次读取的结果可能不同
        int rgb = color.getRGB();
        return rgbToOklch((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);
    }

    /** OKLCH 转 sRGB，返回 {r, g, b}（0..255）；不裁剪，越出色域的通道可能小于 0 或大于 255 */
    public static double[] oklchToRgb(Oklch color) {
        double[] rgb = new double[3];
        oklchToRgb(color.l(), color.c(), color.h(), rgb);
        return rgb;
    }

    /** 三个通道都是有限值且落在 0..255 内（NaN、无穷都算越界） */
    public static boolean isInSrgbGamut(double[] rgb) {
        checkRgb(rgb);
        return inGamut(rgb);
    }

    /**
     * 对应原版 gamutMapOklch：已在色域内时原样返回；否则保持明度与色相，在 0..c 之间
     * 固定二分 20 次，取仍在色域内的最大色度。
     *
     * <p>明度超出 0..1 时连色度 0 都在色域外，此时返回色度为 0 的结果，可能仍然越界，
     * 交给 {@link #toColor} 裁剪，这与原版一致。
     */
    public static double[] gamutMap(Oklch color) {
        double l = color.l();
        double h = color.h();
        double[] rgb = new double[3];
        oklchToRgb(l, color.c(), h, rgb);
        if (inGamut(rgb)) {
            return rgb;
        }
        double minimumChroma = 0;
        double maximumChroma = color.c();
        for (int iteration = 0; iteration < 20; iteration++) {
            double candidateChroma = (minimumChroma + maximumChroma) / 2;
            oklchToRgb(l, candidateChroma, h, rgb);
            if (inGamut(rgb)) {
                minimumChroma = candidateChroma;
            } else {
                maximumChroma = candidateChroma;
            }
        }
        oklchToRgb(l, minimumChroma, h, rgb);
        return rgb;
    }

    /**
     * 明度偏移：结果越出 0..1 时改为反方向偏移（再裁剪到 0..1）。
     * 白色调亮不了就调暗，渐变两端才不会挤成同一个颜色。
     */
    public static double offsetLightness(double lightness, double delta) {
        double shifted = lightness + delta;
        if (shifted >= 0 && shifted <= 1) {
            return shifted;
        }
        return clamp(lightness - delta, 0, 1);
    }

    /**
     * 生成 {@link Color}：各通道裁剪到 0..255 后四舍五入；alpha 裁剪到 0..1 后乘 255 四舍五入。
     * NaN 按 0 处理（原版此时会输出无效的 CSS 值，这里退回最保守的结果）。
     */
    public static Color toColor(double[] rgb, double alpha) {
        checkRgb(rgb);
        return new Color(channel(rgb[0]), channel(rgb[1]), channel(rgb[2]),
                (int) Math.round(clamp(alpha, 0, 1) * 255));
    }

    private static double srgbToLinear(double value) {
        double channel = value / 255;
        return channel <= 0.04045
                ? channel / 12.92
                : StrictMath.pow((channel + 0.055) / 1.055, 2.4);
    }

    private static double linearToSrgb(double value) {
        double channel = value <= 0.0031308
                ? 12.92 * value
                : 1.055 * StrictMath.pow(value, 1 / 2.4) - 0.055;
        return channel * 255;
    }

    /** 结果写进 out：二分查找要换算二十多次，不必每次分配数组 */
    private static void oklchToRgb(double l, double c, double h, double[] out) {
        double hue = h * Math.PI / 180;
        double okA = c * StrictMath.cos(hue);
        double okB = c * StrictMath.sin(hue);
        double lightRoot = l + 0.3963377774 * okA + 0.2158037573 * okB;
        double mediumRoot = l - 0.1055613458 * okA - 0.0638541728 * okB;
        double shortRoot = l - 0.0894841775 * okA - 1.291485548 * okB;
        double light = StrictMath.pow(lightRoot, 3);
        double medium = StrictMath.pow(mediumRoot, 3);
        double shortCone = StrictMath.pow(shortRoot, 3);
        out[0] = linearToSrgb(
                4.0767416621 * light - 3.3077115913 * medium + 0.2309699292 * shortCone);
        out[1] = linearToSrgb(
                -1.2684380046 * light + 2.6097574011 * medium - 0.3413193965 * shortCone);
        out[2] = linearToSrgb(
                -0.0041960863 * light - 0.7034186147 * medium + 1.707614701 * shortCone);
    }

    private static boolean inGamut(double[] rgb) {
        return inGamut(rgb[0]) && inGamut(rgb[1]) && inGamut(rgb[2]);
    }

    private static boolean inGamut(double channel) {
        return Double.isFinite(channel) && channel >= 0 && channel <= 255;
    }

    private static int channel(double value) {
        return (int) Math.round(clamp(value, 0, 255));
    }

    /** 与原版 clamp 相同：NaN 原样传出 */
    private static double clamp(double value, double minimum, double maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    private static void checkRgb(double[] rgb) {
        if (rgb.length != 3) {
            throw new IllegalArgumentException("rgb 必须是 {r, g, b} 三个通道，实际长度 " + rgb.length);
        }
    }
}
