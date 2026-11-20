package com.github.yyyyolo7a79.woodfish.core.color;

import java.util.Objects;

/**
 * 文字发光用的近似高斯模糊，替代原版 text-shadow 的模糊。
 *
 * <p>CSS 规定模糊半径为 B 的阴影等价于标准差 B / 2 的高斯模糊。原版发光半径是 4 / 10 / 20 px
 * （标点 2 / 6 px）乘发光强度、下限 0.5 px，所以对应的 sigma 是「半径 / 2」（再乘 HiDPI 缩放）。
 */
public final class GlowBlur {

    // 三次盒式模糊叠加已经很接近高斯，再多收益很小
    private static final int PASSES = 3;

    // 只为防止盒宽与累加和溢出 int，远大于任何实际的发光半径
    private static final double MAX_SIGMA = 16384;

    private GlowBlur() {
    }

    /**
     * 对预乘 alpha 的 ARGB 像素就地做近似高斯模糊：3 次盒式模糊（每次水平 + 垂直），
     * 盒宽按标准 boxesForGauss(sigma, 3) 计算。
     *
     * <p>四个通道用同一个核：预乘后彩色发光的边缘才不会发黑，结果仍满足各颜色通道 ≤ alpha。
     * 图像外视为透明，除数固定为盒宽（零填充卷积），所以只要四周留够 {@link #kernelRadius}
     * 的透明边距，能量就不会流失，边缘也不会被拉亮。每像素开销与 sigma 无关（滑动窗口），
     * 每次调用只分配一个同尺寸的临时数组。
     *
     * <p>要求扫描行跨度等于 width 且无偏移：新建的 BufferedImage 满足，getSubimage 得到的子图不满足。
     *
     * @param pixels {@code TYPE_INT_ARGB_PRE} 图像的 DataBufferInt 数组，长度至少 width × height
     * @param sigma  标准差（像素）；小于 0.5 或为 NaN 时直接返回，超过 16384 按 16384 计算
     * @throws IllegalArgumentException 宽高为负，或数组装不下 width × height 个像素
     */
    public static void blurPremultiplied(int[] pixels, int width, int height, double sigma) {
        Objects.requireNonNull(pixels, "pixels");
        if (width < 0 || height < 0 || (long) width * height > pixels.length) {
            throw new IllegalArgumentException("像素数组与尺寸不符：length=" + pixels.length
                    + ", width=" + width + ", height=" + height);
        }
        if (!(sigma >= 0.5) || width == 0 || height == 0) {
            return;
        }
        double clamped = Math.min(sigma, MAX_SIGMA);
        int[] buffer = null;
        for (int pass = 0; pass < PASSES; pass++) {
            int radius = boxRadius(clamped, pass);
            if (radius == 0) {
                continue;
            }
            if (buffer == null) {
                buffer = new int[width * height];
            }
            blurLines(pixels, buffer, width, height, 1, width, radius);
            blurLines(buffer, pixels, height, width, width, 1, radius);
        }
    }

    /**
     * 三次盒式模糊叠加后的核半径（像素）：离所有非透明像素都超过这个距离的像素，模糊后仍然透明。
     * 图像四周至少留这么宽的透明边距，发光才不会被裁掉。sigma 小于 0.5 或为 NaN 时为 0。
     */
    public static int kernelRadius(double sigma) {
        if (!(sigma >= 0.5)) {
            return 0;
        }
        double clamped = Math.min(sigma, MAX_SIGMA);
        int total = 0;
        for (int pass = 0; pass < PASSES; pass++) {
            total += boxRadius(clamped, pass);
        }
        return total;
    }

    /**
     * 标准 boxesForGauss(sigma, n) 的第 pass 个盒宽换成半径：盒宽取相邻的两个奇数
     * wl 与 wl + 2，前 m 次用 wl，使 n 次叠加的总方差最接近 sigma²。
     */
    private static int boxRadius(double sigma, int pass) {
        double twelveVariance = 12 * sigma * sigma;
        int lower = (int) Math.floor(Math.sqrt(twelveVariance / PASSES + 1));
        if (lower % 2 == 0) {
            lower--;
        }
        double wl = lower;
        long lowerCount = Math.round(
                (twelveVariance - PASSES * wl * wl - 4 * PASSES * wl - 3 * PASSES) / (-4 * wl - 4));
        int boxWidth = pass < lowerCount ? lower : lower + 2;
        return (boxWidth - 1) / 2;
    }

    /**
     * 对 lines 条线各做一次宽 2·radius + 1 的滑动窗口盒式模糊：src → dst。
     * 每条线有 length 个像素，线内相邻像素相隔 stride，相邻两条线的起点相隔 lineStep。
     */
    private static void blurLines(int[] src, int[] dst, int length, int lines, int stride,
                                  int lineStep, int radius) {
        int size = 2 * radius + 1;
        for (int line = 0; line < lines; line++) {
            int start = line * lineStep;
            int a = 0;
            int r = 0;
            int g = 0;
            int b = 0;
            // 第一个输出的窗口是 [-radius, radius]，先装入落在线内的 [0, radius]
            int preload = Math.min(radius, length - 1);
            for (int i = 0; i <= preload; i++) {
                int p = src[start + i * stride];
                a += p >>> 24;
                r += (p >>> 16) & 0xFF;
                g += (p >>> 8) & 0xFF;
                b += p & 0xFF;
            }
            for (int i = 0; i < length; i++) {
                // (和 + radius) / 盒宽：盒宽是奇数，这正是四舍五入，多次模糊后整体不会变暗
                dst[start + i * stride] = (a + radius) / size << 24
                        | (r + radius) / size << 16
                        | (g + radius) / size << 8
                        | (b + radius) / size;
                int enter = i + radius + 1;
                if (enter < length) {
                    int p = src[start + enter * stride];
                    a += p >>> 24;
                    r += (p >>> 16) & 0xFF;
                    g += (p >>> 8) & 0xFF;
                    b += p & 0xFF;
                }
                int leave = i - radius;
                if (leave >= 0) {
                    int p = src[start + leave * stride];
                    a -= p >>> 24;
                    r -= (p >>> 16) & 0xFF;
                    g -= (p >>> 8) & 0xFF;
                    b -= p & 0xFF;
                }
            }
        }
    }
}
