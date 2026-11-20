package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.color.GlowBlur;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.util.Arrays;

/**
 * 把一个 {@link GlowSpec} 栅格化成发光图（后台线程执行，只接触不可变输入，线程安全）。
 *
 * <p>每一层等价于 CSS 的一个 {@code text-shadow: 0 0 B color}：用该层颜色画出字形（灰度抗锯齿），
 * 做 σ = B / 2 的高斯模糊，再按「半径大的在下」用 SrcOver 叠起来（CSS 中先写的阴影在上层）。
 * 模糊对预乘像素是线性的，所以同一行里不同颜色的 token 可以画进同一张图再一起模糊，结果与
 * 逐 token 模糊后相加一致。
 *
 * <p>大半径的层先按 2 的幂降采样（盒式平均，保持总能量）再模糊、最后双线性放大合成：
 * 降采样后 σ 仍不小于 2.5 像素，信号足够平滑，放大不会出现块状；20px 那层在 2x 屏上能省下
 * 约 60 倍的像素运算。
 */
final class GlowRasterizer {

    /** 单张发光图的像素上限（≈16MB）：防止异常超长的行占满内存 */
    static final int MAX_PIXELS = 4_000_000;

    private static final int NEAR = 0;
    private static final int MID = 1;
    private static final int FAR = 2;

    private static final int NORMAL_ONLY = 0;
    private static final int PUNCTUATION_ONLY = 1;
    private static final int ALL = 2;

    private record Layer(double radius, int color, int target) {
    }

    // 合成顺序：从下到上
    private static final Layer[] DARK = {
            new Layer(GlowParams.FAR, FAR, NORMAL_ONLY),
            new Layer(GlowParams.MID, MID, NORMAL_ONLY),
            new Layer(GlowParams.PUNCTUATION_FAR, MID, PUNCTUATION_ONLY),
            new Layer(GlowParams.NEAR, NEAR, NORMAL_ONLY),
            new Layer(GlowParams.PUNCTUATION_NEAR, NEAR, PUNCTUATION_ONLY),
    };
    private static final Layer[] LIGHT = {new Layer(GlowParams.LIGHT, MID, ALL)};

    private GlowRasterizer() {
    }

    static GlowImage rasterize(GlowSpec spec) {
        GlowParams params = spec.params;
        double sx = params.scaleX();
        double sy = params.scaleY();
        int pad = params.padDevice();
        int originX = (int) Math.floor(spec.minX * sx) - pad;
        int originY = -pad;
        int width = (int) Math.ceil(spec.maxX * sx) + pad - originX;
        int height = (int) Math.ceil(spec.lineHeight * sy) + 2 * pad;
        if (width <= 0 || height <= 0 || (long) width * height > MAX_PIXELS) {
            return GlowImage.NONE;
        }

        // 一张临时图在各层之间复用；宽度即扫描行跨度，GlowBlur 可以直接就地处理它的像素数组
        BufferedImage layerImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB_PRE);
        int[] layerPixels = ((DataBufferInt) layerImage.getRaster().getDataBuffer()).getData();
        int[] accumulated = null;
        FontRenderContext editorFrc = params.editorContext();

        for (Layer layer : params.light() ? LIGHT : DARK) {
            Arrays.fill(layerPixels, 0);
            if (!renderLayer(spec, layer, layerImage, originX, originY, width, height, editorFrc)) {
                continue;
            }
            if (accumulated == null) {
                accumulated = new int[width * height];
            }
            double sigma = params.sigma(layer.radius);
            int factor = downsampleFactor(sigma);
            if (factor == 1) {
                GlowBlur.blurPremultiplied(layerPixels, width, height, sigma);
                over(layerPixels, accumulated);
            } else {
                int smallWidth = (width + factor - 1) / factor;
                int smallHeight = (height + factor - 1) / factor;
                int[] small = downsample(layerPixels, width, height, factor, smallWidth, smallHeight);
                GlowBlur.blurPremultiplied(small, smallWidth, smallHeight, sigma / factor);
                upsampleOver(small, smallWidth, smallHeight, factor, accumulated, width, height);
            }
        }
        return accumulated == null ? GlowImage.NONE : crop(accumulated, width, height, originX, originY);
    }

    /**
     * 用该层颜色画出参与该层的字形；一个都没画时返回 false。
     *
     * <p>透明底只能画灰度。有风险的 piece（LCD 编辑器上的中日韩、回退字体与系统字体）若照常整段画，
     * 会按灰度字形缓存的步进排字、与编辑器的字逐字错开：普通文字改为逐字画在编辑器的位置，
     * 复杂排版的文字用编辑器的 FontRenderContext 排版（位置随 GlyphVector 带过来）。字符网格模式下
     * 编辑器把字挪进格子居中，普通文字同样逐字画在编辑器的位置，复杂排版照编辑器调整字形位置。
     */
    private static boolean renderLayer(GlowSpec spec, Layer layer, BufferedImage image,
                                       int originX, int originY, int width, int height, FontRenderContext editorFrc) {
        Graphics2D g = image.createGraphics();
        try {
            g.setClip(0, 0, width, height);
            // 透明底上无法做 LCD 抗锯齿；发光本来就要模糊，灰度足够
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, spec.params.fractionalMetrics()
                    ? RenderingHints.VALUE_FRACTIONALMETRICS_ON : RenderingHints.VALUE_FRACTIONALMETRICS_OFF);
            g.transform(new AffineTransform(spec.params.scaleX(), 0, 0, spec.params.scaleY(), -originX, -originY));
            FontRenderContext frc = g.getFontRenderContext();
            boolean drew = false;
            for (int i = 0; i < spec.pieceCount(); i++) {
                boolean punctuation = spec.punctuation[i];
                if (layer.target == NORMAL_ONLY && punctuation || layer.target == PUNCTUATION_ONLY && !punctuation) {
                    continue;
                }
                int argb = switch (layer.color) {
                    case NEAR -> spec.near[i];
                    case MID -> spec.mid[i];
                    default -> spec.far[i];
                };
                if (argb >>> 24 == 0) {
                    continue;
                }
                g.setColor(new Color(argb, true));
                Font font = spec.fonts[spec.font[i]];
                int from = spec.pieceStart(i);
                int to = spec.pieceEnd[i];
                if (TextPieces.needsLayout(font, spec.text, from, to)) {
                    // 有风险的字体用编辑器的 FRC 排版，字形位置才与编辑器一致；网格模式下再照编辑器挪进格子
                    g.drawGlyphVector(TextPieces.layout(font, spec.nativeRisk[i] ? editorFrc : frc,
                            spec.text, from, to, spec.cells), spec.x[i], spec.ascent);
                } else if (spec.nativeRisk[i] || spec.gridAligned[i]) {
                    TextPieces.drawEach(g, font, spec.text, spec.glyphX, from, to, 0, spec.ascent);
                } else {
                    TextPieces.drawRun(g, font, spec.text, from, to, spec.x[i], spec.ascent);
                }
                drew = true;
            }
            return drew;
        } finally {
            g.dispose();
        }
    }

    /** 让降采样后的 σ 不小于 2.5 像素的最大 2 的幂（最多 8 倍） */
    static int downsampleFactor(double sigma) {
        int factor = 1;
        while (factor < 8 && sigma / (factor * 2) >= 2.5) {
            factor *= 2;
        }
        return factor;
    }

    /**
     * 盒式降采样（预乘像素逐通道平均）。图像外按透明处理、除数固定为 factor²，
     * 与 GlowBlur 的零填充语义一致，总能量不变。
     */
    static int[] downsample(int[] src, int width, int height, int factor, int smallWidth, int smallHeight) {
        int[] small = new int[smallWidth * smallHeight];
        int area = factor * factor;
        int half = area / 2;
        for (int y = 0; y < smallHeight; y++) {
            int y0 = y * factor;
            int y1 = Math.min(height, y0 + factor);
            for (int x = 0; x < smallWidth; x++) {
                int x0 = x * factor;
                int x1 = Math.min(width, x0 + factor);
                int a = 0;
                int r = 0;
                int g = 0;
                int b = 0;
                for (int yy = y0; yy < y1; yy++) {
                    int row = yy * width;
                    for (int xx = x0; xx < x1; xx++) {
                        int p = src[row + xx];
                        a += p >>> 24;
                        r += (p >>> 16) & 0xFF;
                        g += (p >>> 8) & 0xFF;
                        b += p & 0xFF;
                    }
                }
                if (a != 0) {
                    small[y * smallWidth + x] = (a + half) / area << 24 | (r + half) / area << 16
                            | (g + half) / area << 8 | (b + half) / area;
                }
            }
        }
        return small;
    }

    /** 双线性放大 small 并以 SrcOver 叠到 dst 上（像素中心对齐：(x + 0.5) / factor − 0.5） */
    static void upsampleOver(int[] small, int smallWidth, int smallHeight, int factor,
                             int[] dst, int width, int height) {
        int[] x0 = new int[width];
        int[] wx = new int[width];
        for (int x = 0; x < width; x++) {
            double fx = (x + 0.5) / factor - 0.5;
            int ix = (int) Math.floor(fx);
            x0[x] = ix;
            wx[x] = (int) Math.round((fx - ix) * 256);
        }
        for (int y = 0; y < height; y++) {
            double fy = (y + 0.5) / factor - 0.5;
            int iy = (int) Math.floor(fy);
            int wy = (int) Math.round((fy - iy) * 256);
            int rowTop = iy >= 0 && iy < smallHeight ? iy * smallWidth : -1;
            int rowBottom = iy + 1 >= 0 && iy + 1 < smallHeight ? (iy + 1) * smallWidth : -1;
            if (rowTop < 0 && rowBottom < 0) {
                continue;
            }
            int out = y * width;
            for (int x = 0; x < width; x++) {
                int ix = x0[x];
                int w = wx[x];
                int p00 = sample(small, rowTop, ix, smallWidth);
                int p10 = sample(small, rowTop, ix + 1, smallWidth);
                int p01 = sample(small, rowBottom, ix, smallWidth);
                int p11 = sample(small, rowBottom, ix + 1, smallWidth);
                if ((p00 | p10 | p01 | p11) == 0) {
                    continue;
                }
                int a = lerp2(p00 >>> 24, p10 >>> 24, p01 >>> 24, p11 >>> 24, w, wy);
                if (a == 0) {
                    continue;
                }
                int r = lerp2((p00 >>> 16) & 0xFF, (p10 >>> 16) & 0xFF, (p01 >>> 16) & 0xFF, (p11 >>> 16) & 0xFF, w, wy);
                int g = lerp2((p00 >>> 8) & 0xFF, (p10 >>> 8) & 0xFF, (p01 >>> 8) & 0xFF, (p11 >>> 8) & 0xFF, w, wy);
                int b = lerp2(p00 & 0xFF, p10 & 0xFF, p01 & 0xFF, p11 & 0xFF, w, wy);
                dst[out + x] = overPixel(a << 24 | Math.min(r, a) << 16 | Math.min(g, a) << 8 | Math.min(b, a),
                        dst[out + x]);
            }
        }
    }

    private static int sample(int[] small, int row, int x, int smallWidth) {
        return row < 0 || x < 0 || x >= smallWidth ? 0 : small[row + x];
    }

    private static int lerp2(int p00, int p10, int p01, int p11, int wx, int wy) {
        int top = p00 * (256 - wx) + p10 * wx;
        int bottom = p01 * (256 - wx) + p11 * wx;
        return (top * (256 - wy) + bottom * wy + (1 << 15)) >>> 16;
    }

    /** dst = src over dst（逐像素，预乘） */
    static void over(int[] src, int[] dst) {
        for (int i = 0; i < src.length; i++) {
            int s = src[i];
            if (s != 0) {
                dst[i] = overPixel(s, dst[i]);
            }
        }
    }

    static int overPixel(int s, int d) {
        int sa = s >>> 24;
        if (sa == 255 || d == 0) {
            return s;
        }
        int k = 255 - sa;
        int a = sa + mul255(d >>> 24, k);
        int r = ((s >>> 16) & 0xFF) + mul255((d >>> 16) & 0xFF, k);
        int g = ((s >>> 8) & 0xFF) + mul255((d >>> 8) & 0xFF, k);
        int b = (s & 0xFF) + mul255(d & 0xFF, k);
        return Math.min(a, 255) << 24 | Math.min(r, 255) << 16 | Math.min(g, 255) << 8 | Math.min(b, 255);
    }

    /** round(x · k / 255) */
    private static int mul255(int x, int k) {
        int t = x * k + 128;
        return (t + (t >>> 8)) >>> 8;
    }

    /** 裁掉全透明的边缘后生成最终图像（复制进新图，保持其可被硬件管线缓存） */
    private static GlowImage crop(int[] pixels, int width, int height, int originX, int originY) {
        int top = 0;
        while (top < height && rowEmpty(pixels, width, top)) {
            top++;
        }
        if (top == height) {
            return GlowImage.NONE;
        }
        int bottom = height - 1;
        while (bottom > top && rowEmpty(pixels, width, bottom)) {
            bottom--;
        }
        int left = width;
        int right = -1;
        for (int y = top; y <= bottom; y++) {
            int row = y * width;
            for (int x = 0; x < left; x++) {
                if (pixels[row + x] != 0) {
                    left = x;
                    break;
                }
            }
            for (int x = width - 1; x > right; x--) {
                if (pixels[row + x] != 0) {
                    right = x;
                    break;
                }
            }
        }
        int croppedWidth = right - left + 1;
        int croppedHeight = bottom - top + 1;
        int[] cropped = new int[croppedWidth * croppedHeight];
        for (int y = 0; y < croppedHeight; y++) {
            System.arraycopy(pixels, (top + y) * width + left, cropped, y * croppedWidth, croppedWidth);
        }
        BufferedImage image = new BufferedImage(croppedWidth, croppedHeight, BufferedImage.TYPE_INT_ARGB_PRE);
        image.getRaster().setDataElements(0, 0, croppedWidth, croppedHeight, cropped);
        return new GlowImage(image, originX + left, originY + top);
    }

    private static boolean rowEmpty(int[] pixels, int width, int y) {
        int row = y * width;
        for (int x = 0; x < width; x++) {
            if (pixels[row + x] != 0) {
                return false;
            }
        }
        return true;
    }
}
