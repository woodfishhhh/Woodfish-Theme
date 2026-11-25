package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.SharedCore;
import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.NativeOptions;
import com.google.gson.JsonObject;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.geom.Ellipse2D;
import java.awt.geom.Path2D;
import java.util.Locale;

/** Per-editor state of the packaged caret-trail and typing-particles modules. EDT only. */
final class InputMotion {
    private final Object session;
    private final MotionCanvas canvas = new MotionCanvas();
    private final Path2D.Double path = new Path2D.Double();
    private final Ellipse2D.Double circle = new Ellipse2D.Double();
    private ParticleTile particles;
    private boolean moving;

    InputMotion(EffectSettings settings, Color accent, boolean dark) {
        var groups = new JsonObject();
        for (String group : new String[] {"caretTrail", "typingParticles"}) {
            var params = new JsonObject();
            for (String key : NativeOptions.KEYS) {
                if (!key.startsWith(group + ".")) continue;
                String name = key.substring(group.length() + 1);
                switch (NativeOptions.schema(key + ".type")) {
                    case "boolean" -> params.addProperty(name, settings.on(key));
                    case "number" -> params.addProperty(name, settings.number(key));
                    default -> params.addProperty(name, settings.value(key));
                }
            }
            groups.add(group, params);
        }
        String hex = String.format(Locale.ROOT, "#%06x", accent.getRGB() & 0xffffff);
        session = SharedCore.call("motionCreate", groups.toString(), hex, settings.value("cursor.gradientStops"), dark);
    }

    void event(String kind, int id, double x, double y, double height, double width, double now) {
        moving = (Boolean) SharedCore.call("motionEvent", session, kind, id, x, y, height, width, now);
        if (kind.equals("remove")) tick(now, 0);
    }

    boolean active() { return moving; }

    void tick(double now, double elapsed) {
        canvas.begin();
        moving = (Boolean) SharedCore.call("motionFrame", session, now, elapsed, canvas);
    }

    Rectangle bounds() { return canvas.bounds(); }

    void paint(Graphics2D g) {
        if (canvas.length == 0) return;
        g.translate(canvas.value("shiftX"), canvas.value("shiftY"));
        var transform = g.getTransform();
        boolean nativePixels = transform.getScaleX() == 1 && transform.getScaleY() == 1
                && transform.getShearX() == 0 && transform.getShearY() == 0;
        double[] frame = canvas.words;
        int i = 0, length = canvas.length;
        while (i < length) {
            switch ((int) frame[i++]) {
                case 0 -> path.reset();
                case 1 -> path.moveTo(frame[i++], frame[i++]);
                case 2 -> path.lineTo(frame[i++], frame[i++]);
                case 3 -> path.closePath();
                case 4 -> {
                    double x = frame[i++], y = frame[i++], r = frame[i++];
                    if (nativePixels && i < length && frame[i] == 7) {
                        if (particles == null) particles = new ParticleTile();
                        particles.dot(g, x, y, r, (int) frame[i + 1]);
                        i += 2;
                        continue;
                    }
                    circle.setFrame(x - r, y - r, r * 2, r * 2);
                    path.append(circle, false);
                }
                case 5, 7 -> {
                    if (particles != null) particles.flush(g);
                    int op = (int) frame[i - 1], argb = (int) frame[i++];
                    g.setComposite(op == 7 ? AdditiveComposite.INSTANCE : java.awt.AlphaComposite.SrcOver);
                    g.setColor(new Color(argb, true)); g.fill(path);
                }
                case 6 -> {
                    if (particles != null) particles.flush(g);
                    int argb = (int) frame[i++]; float width = (float) frame[i++];
                    g.setComposite(java.awt.AlphaComposite.SrcOver); g.setColor(new Color(argb, true));
                    g.setStroke(new BasicStroke(width, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND)); g.draw(path);
                }
                default -> throw new IllegalStateException("未知的 Woodfish 绘制命令");
            }
        }
        if (particles != null) particles.flush(g);
    }
}
