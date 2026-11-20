package com.github.yyyyolo7a79.woodfish.ui;

import com.intellij.ui.components.JBLabel;
import com.intellij.util.ui.JBUI;

import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.JSlider;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.util.function.IntFunction;

/**
 * 带数值标签的滑块：滑块走整数刻度，读写时按 {@code ticksPerUnit} 换算成实际值。
 * 例如明度变化以 0.001 为一格（ticksPerUnit = 1000），发光强度以 0.01 为一格（= 100）。
 */
final class ValueSlider {

    private final JSlider slider;
    private final JBLabel label = new JBLabel();
    private final JPanel component = new JPanel(new BorderLayout(JBUI.scale(8), 0));
    private final double ticksPerUnit;
    private final IntFunction<String> text;

    /**
     * @param min  实际值下限（取自 WoodfishState 的范围常量）
     * @param max  实际值上限
     * @param text 刻度 → 显示文本
     */
    ValueSlider(double min, double max, double ticksPerUnit, IntFunction<String> text) {
        this.ticksPerUnit = ticksPerUnit;
        this.text = text;
        int minTick = toTick(min);
        int maxTick = toTick(max);
        this.slider = new JSlider(minTick, maxTick, minTick);

        // 按最宽的文本定宽，避免数值变化时滑块被挤得忽长忽短
        int width = 0;
        for (int tick : new int[]{minTick, maxTick, (minTick + maxTick) / 2}) {
            label.setText(text.apply(tick));
            width = Math.max(width, label.getPreferredSize().width);
        }
        Dimension d = label.getPreferredSize();
        label.setPreferredSize(new Dimension(Math.max(width, JBUI.scale(56)), d.height));

        slider.addChangeListener(e -> label.setText(text.apply(slider.getValue())));
        component.add(slider, BorderLayout.CENTER);
        component.add(label, BorderLayout.EAST);
    }

    void set(double value) {
        slider.setValue(toTick(value));
        label.setText(text.apply(slider.getValue()));
    }

    /**
     * 读出实际值。滑块仍停在 original 对应的刻度上时原样返回 original ——
     * 否则手改过的配置（如 24.4°）会被取整成 24°，一打开设置页就显示「已修改」。
     */
    double get(double original) {
        int tick = slider.getValue();
        return tick == toTick(original) ? original : tick / ticksPerUnit;
    }

    /** 每次刻度变化（含拖动过程中）都会回调 */
    void onChange(Runnable listener) {
        slider.addChangeListener(e -> listener.run());
    }

    void setEnabled(boolean enabled) {
        slider.setEnabled(enabled);
        label.setEnabled(enabled);
    }

    /** 读屏软件念的名称：表单左侧的标签只关联到外层面板，滑块本身需要单独命名 */
    ValueSlider named(String accessibleName) {
        slider.getAccessibleContext().setAccessibleName(accessibleName);
        return this;
    }

    JComponent getComponent() {
        return component;
    }

    private int toTick(double value) {
        return (int) Math.round(value * ticksPerUnit);
    }
}
