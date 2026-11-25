package com.github.yyyyolo7a79.woodfish.editor;

import org.mozilla.javascript.*;
import java.awt.Rectangle;
import java.util.Arrays;
import java.util.HashMap;

/** A JS canvas with native drawing commands: no boxed command stream or per-frame copy. */
final class MotionCanvas extends NativeObject {
    private final HashMap<String, Integer> colors = new HashMap<>();
    double[] words = new double[256];
    int length;
    private double minX, minY, maxX, maxY, pad;

    MotionCanvas() {
        op("beginPath", a -> write(0));
        op("moveTo", a -> point(1, a));
        op("lineTo", a -> point(2, a));
        op("closePath", a -> write(3));
        op("translate", a -> {}); // Shared-canvas trail coordinates are already editor-local.
        op("arc", a -> {
            double x = number(a[0]), y = number(a[1]), r = number(a[2]);
            write(4); write(x); write(y); write(r);
            cover(x - r, y - r); cover(x + r, y + r);
        });
        op("fill", a -> { write("lighter".equals(get("globalCompositeOperation", this)) ? 7 : 5); write(ink("fillStyle")); });
        op("stroke", a -> {
            double width = value("lineWidth"); write(6); write(ink("strokeStyle")); write(width);
            pad = Math.max(pad, width / 2);
        });
    }

    private void op(String name, java.util.function.Consumer<Object[]> fn) {
        put(name, this, new BaseFunction() {
            @Override public Object call(Context cx, Scriptable scope, Scriptable self, Object[] args) {
                fn.accept(args); return Undefined.instance;
            }
        });
    }

    void begin() {
        length = 0; pad = 0;
        minX = minY = Double.POSITIVE_INFINITY;
        maxX = maxY = Double.NEGATIVE_INFINITY;
    }

    Rectangle bounds() {
        if (maxX < minX) return new Rectangle(0, 0, -1, -1);
        double x = value("shiftX"), y = value("shiftY");
        int left = (int) Math.floor(minX + x - pad) - 2, top = (int) Math.floor(minY + y - pad) - 2;
        return new Rectangle(left, top, (int) Math.ceil(maxX + x + pad) + 2 - left,
                (int) Math.ceil(maxY + y + pad) + 2 - top);
    }

    private static double number(Object n) { return ((Number) n).doubleValue(); }
    double value(String key) { return number(get(key, this)); }

    private void point(int opcode, Object[] args) {
        double x = number(args[0]), y = number(args[1]);
        write(opcode); write(x); write(y); cover(x, y);
    }

    private void cover(double x, double y) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }

    private void write(double n) {
        if (length == words.length) words = Arrays.copyOf(words, length * 2);
        words[length++] = n;
    }

    private int ink(String key) {
        String color = get(key, this).toString();
        int rgb = colors.computeIfAbsent(color, s -> Integer.parseInt(s, 1, s.length(), 16));
        return ((int) Math.round(255 * value("globalAlpha")) << 24) | rgb;
    }
}
