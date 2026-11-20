package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.color.GlowBlur;

import java.awt.RenderingHints;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;

/**
 * 发光栅格化的全局参数（不可变，可跨线程传递），对应原版 overlay.ts 的 text-shadow 规则。
 *
 * <ul>
 *   <li>深色主题：普通 token 三层 4 / 10 / 20 px（near / mid / far），纯标点两层 2 / 6 px</li>
 *   <li>浅色主题：所有 token 只画一层 2 px 的 mid（同样的发光在亮底上读作模糊，原版因此减弱）</li>
 * </ul>
 * 半径都按 {@code scaleGlowRadius} 乘发光强度、下限 0.5 px；CSS 模糊半径 B 对应高斯 σ = B / 2，
 * 再乘设备缩放换成设备像素。
 *
 * @param scaleX            用户空间到设备像素的缩放（HiDPI）
 * @param scaleY            同上，纵向
 * @param intensity         发光强度倍率
 * @param light             编辑器背景是否偏亮
 * @param fractionalMetrics 编辑器是否开启小数字宽（决定字形位置的取整方式）
 * @param textAntialiasing  编辑器的文字抗锯齿提示（RenderingHints 的单例值，按身份比较）；
 *                          重建编辑器的 FontRenderContext，让有风险的 piece 与编辑器一致地排字
 */
record GlowParams(double scaleX, double scaleY, double intensity, boolean light, boolean fractionalMetrics,
                  Object textAntialiasing) {

    // 原版的模糊半径（CSS px），顺序即合成顺序：半径大的在下层
    static final double FAR = 20;
    static final double MID = 10;
    static final double PUNCTUATION_FAR = 6;
    static final double NEAR = 4;
    static final double PUNCTUATION_NEAR = 2;
    static final double LIGHT = 2;

    /** 原版 scaleGlowRadius：半径乘强度，下限 0.5 px */
    double radius(double base) {
        return Math.max(0.5, base * intensity);
    }

    /** 设备像素下的高斯 σ */
    double sigma(double base) {
        return radius(base) * scaleX / 2;
    }

    /** 最大一层发光在设备像素下的扩散距离（含 2px 余量） */
    int padDevice() {
        double largest = light ? LIGHT : FAR;
        return GlowBlur.kernelRadius(sigma(largest)) + 2;
    }

    /**
     * 发光向四周溢出的距离（用户空间像素，向上取整）。重绘一行时，上下各这么远的邻行发光也会落进来，
     * 必须一起参与绘制；某行发光变化时也要按这个范围补发重绘，才不会留下残影。
     */
    int padUser() {
        return (int) Math.ceil(padDevice() / Math.min(scaleX, scaleY));
    }

    /**
     * 编辑器画字用的 FontRenderContext（只含缩放）。发光图是透明底，只能画灰度；有风险的 piece 用它排版，
     * 字形位置就与编辑器（LCD 下由原生光栅化）一致，不会随灰度字形的步进逐字偏移。
     */
    FontRenderContext editorContext() {
        AffineTransform scale = AffineTransform.getScaleInstance(scaleX, scaleY);
        Object fm = fractionalMetrics ? RenderingHints.VALUE_FRACTIONALMETRICS_ON
                : RenderingHints.VALUE_FRACTIONALMETRICS_OFF;
        try {
            return new FontRenderContext(scale, textAntialiasing, fm);
        } catch (IllegalArgumentException e) {
            return new FontRenderContext(scale, RenderingHints.VALUE_TEXT_ANTIALIAS_ON, fm);
        }
    }
}
