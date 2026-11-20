package com.github.yyyyolo7a79.woodfish.editor;

import java.awt.Font;
import java.awt.RenderingHints;
import java.awt.font.FontRenderContext;
import java.awt.font.GlyphVector;
import java.io.File;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * 判断一段文字在编辑器的抗锯齿设置下，能不能用「灰度字形缓存」原样重画（纯 Java2D，任意线程）。
 *
 * <p>Java2D 只对纯色画笔做 LCD 文字（{@code SurfaceData.canRenderLCDText} 要求
 * {@code paintState <= PAINT_ALPHACOLOR}），渐变画笔与透明底的发光图都会退成灰度。JBR 21 实测（Windows，150% 缩放）：
 * <ul>
 *   <li>JBR 自带字体（{@code java.home/lib/fonts}，JetBrains Mono 等）：LCD 与灰度都由 FreeType 光栅化，
 *       字形与步进一致，退成灰度也能与编辑器逐像素重合</li>
 *   <li>系统字体（中日韩回退字体、用户装的字体）：LCD 下改由 Windows GDI 光栅化，灰度仍走 FreeType，
 *       每个字的步进差约 1 个设备像素并逐字累积，形状也不同；在编辑器的字上再画一遍就成了错位的重影。
 *       宋体等带内嵌点阵的字体在小字号下还会一边用点阵、一边用轮廓</li>
 * </ul>
 *
 * <p>判定（{@link #isGrayscale} 为真时一律安全：编辑器自己用的就是灰度缓存）：中日韩文字一律有风险；
 * 其余文字只有字体属于 JBR 自带字族、且编辑器 FRC 与灰度 FRC 下的步进相同才安全。后者能识别出同名系统字体
 * 抢先注册、遮住 JBR 自带文件的情况（本机装了 JetBrains Mono 时，未枚举系统字体前的进程里就会这样）。
 */
final class NativeGlyphs {

    /** 覆盖常见字宽的探测串，没有空格：步进差在逐字累积后才明显 */
    private static final String PROBE = "HamburgefonstivMW0123456789";
    /** 步进差的容忍量（用户空间像素）：远小于 1 个设备像素，只吸收浮点误差 */
    private static final double TOLERANCE = 0.01;

    private NativeGlyphs() {
    }

    /** 编辑器画字用的就是灰度缓存：此时插件任何画法都与编辑器一致 */
    static boolean isGrayscale(Object textAntialiasing) {
        return textAntialiasing == RenderingHints.VALUE_TEXT_ANTIALIAS_ON;
    }

    /** 字族是否由 JBR 自带的字体文件提供（与系统字体文件无关） */
    static boolean isBundledFamily(Font font) {
        return Bundled.FAMILIES.contains(font.getFamily(Locale.ROOT));
    }

    /**
     * 不含中日韩时，该字体能否用灰度缓存原样重画。{@code editor} 是编辑器绘制用的 FRC（只含缩放与提示）。
     * 结果只取决于字体与 FRC，调用方可按字体缓存。
     */
    static boolean grayscaleMatches(Font font, FontRenderContext editor) {
        if (isGrayscale(editor.getAntiAliasingHint())) {
            return true;
        }
        if (!isBundledFamily(font)) {
            return false;
        }
        FontRenderContext gray = new FontRenderContext(editor.getTransform(),
                RenderingHints.VALUE_TEXT_ANTIALIAS_ON, editor.getFractionalMetricsHint());
        GlyphVector a = font.createGlyphVector(editor, PROBE);
        GlyphVector b = font.createGlyphVector(gray, PROBE);
        for (int i = 1; i <= PROBE.length(); i++) {
            if (Math.abs(a.getGlyphPosition(i).getX() - b.getGlyphPosition(i).getX()) > TOLERANCE) {
                return false;
            }
        }
        return true;
    }

    /** JBR 自带字族：类加载时扫一次 {@code java.home/lib/fonts}（约 10ms），只读文件头，不注册字体 */
    private static final class Bundled {
        static final Set<String> FAMILIES = scan();

        private static Set<String> scan() {
            Set<String> families = new HashSet<>();
            File[] files = new File(System.getProperty("java.home", ""), "lib/fonts").listFiles();
            if (files == null) {
                return Set.of(); // 不在 JBR 上运行：一律按有风险处理，效果正确只是绘制次数多一些
            }
            for (File file : files) {
                String name = file.getName().toLowerCase(Locale.ROOT);
                if (!name.endsWith(".ttf") && !name.endsWith(".otf")) {
                    continue;
                }
                try {
                    families.add(Font.createFont(Font.TRUETYPE_FONT, file).getFamily(Locale.ROOT));
                } catch (Exception | LinkageError ignored) {
                    // 读不了的文件跳过：它的字族按系统字体处理，只会更保守
                }
            }
            return Set.copyOf(families);
        }
    }
}
