package com.github.yyyyolo7a79.woodfish.core.color;

/**
 * CSS {@code linear-gradient(<angle>, …)} 的几何，用来把原版的渐变搬到 Java2D 的渐变画笔上。
 */
public final class CssGradient {

    private CssGradient() {
    }

    /**
     * {@code linear-gradient(<angleDeg>)} 作用在矩形 (x, y, w, h) 上时 0% 与 100% 的位置。
     *
     * <p>CSS 角度：0deg 指向上方，90deg 指向右方，顺时针；屏幕坐标 y 向下。渐变线过矩形中心，
     * 长度为 {@code |w·sin a| + |h·cos a|}，使矩形的角点恰好落在 0% / 100% 线上。
     * 90 度的整数倍直接用精确的 sin / cos，避免 {@code cos(π/2) ≈ 6e-17} 这类残差让水平渐变微微倾斜。
     *
     * <p>宽高都为 0（或方向上的投影长度为 0）时两端点重合；Java2D 的 LinearGradientPaint
     * 不接受重合的端点，调用方应改用纯色。角度为 NaN / 无穷时结果为 NaN。
     *
     * @return {@code {x0, y0, x1, y1}}
     */
    public static double[] endpoints(double x, double y, double width, double height,
                                     double angleDeg) {
        double degrees = angleDeg % 360;
        if (degrees < 0) {
            degrees += 360;
        }
        double sin;
        double cos;
        if (degrees % 90 == 0) {
            // 极小的负角加 360 后会舍入成 360，& 3 把它归回 0
            int quadrant = (int) (degrees / 90) & 3;
            sin = quadrant == 1 ? 1 : quadrant == 3 ? -1 : 0;
            cos = quadrant == 0 ? 1 : quadrant == 2 ? -1 : 0;
        } else {
            double radians = Math.toRadians(degrees);
            sin = Math.sin(radians);
            cos = Math.cos(radians);
        }

        double half = (Math.abs(width * sin) + Math.abs(height * cos)) / 2;
        double centerX = x + width / 2;
        double centerY = y + height / 2;
        // CSS 的「向上」在屏幕坐标里是 -y
        double dx = sin * half;
        double dy = -cos * half;
        return new double[] {centerX - dx, centerY - dy, centerX + dx, centerY + dy};
    }

    /**
     * 点 (x, y) 在渐变线 (x0, y0) → (x1, y1) 上的位置，钳到 [0, 1]（与 NO_CYCLE 的端色延伸一致）。
     * 两端点重合时没有方向，返回中点 0.5（调用方此时本应改用纯色）。
     */
    public static double positionAt(double x0, double y0, double x1, double y1, double x, double y) {
        double dx = x1 - x0;
        double dy = y1 - y0;
        double lengthSquared = dx * dx + dy * dy;
        if (!(lengthSquared > 0)) {
            return 0.5;
        }
        double t = ((x - x0) * dx + (y - y0) * dy) / lengthSquared;
        return t <= 0 ? 0 : t >= 1 ? 1 : t;
    }

    /**
     * 三色标渐变（light 0%、base 50%、dark 100%）在位置 t 的颜色，按 sRGB 各通道线性插值，
     * 与 Java2D LinearGradientPaint 默认的插值方式相同。参数与返回值都是非预乘 ARGB。
     */
    public static int colorAt(int light, int base, int dark, double t) {
        if (!(t > 0)) {
            return light;
        }
        if (t >= 1) {
            return dark;
        }
        return t < 0.5 ? lerp(light, base, t * 2) : lerp(base, dark, t * 2 - 1);
    }

    public static int colorAt(java.util.List<java.awt.Color> stops, double t) {
        if (!(t > 0)) return stops.getFirst().getRGB();
        if (t >= 1) return stops.getLast().getRGB();
        double index = t * (stops.size() - 1);
        int from = (int) index;
        return lerp(stops.get(from).getRGB(), stops.get(from + 1).getRGB(), index - from);
    }

    private static int lerp(int from, int to, double u) {
        int argb = 0;
        for (int shift = 24; shift >= 0; shift -= 8) {
            int a = (from >>> shift) & 0xFF;
            int b = (to >>> shift) & 0xFF;
            argb |= (int) Math.round(a + (b - a) * u) << shift;
        }
        return argb;
    }
}
