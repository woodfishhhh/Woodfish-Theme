package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.SharedCore;
import com.github.yyyyolo7a79.woodfish.settings.EffectSettings;
import com.github.yyyyolo7a79.woodfish.settings.NativeOptions;
import com.google.gson.JsonObject;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.geom.Ellipse2D;
import java.awt.geom.Path2D;
import java.util.Locale;

/** Per-editor state of the packaged caret-trail and typing-particles modules. EDT only. */
final class InputMotion {
    private final Object session;
    private double[] frame = {0, 0, 0};
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

    void event(String kind, double x, double y, double height, double width, double now) {
        moving = (Boolean) SharedCore.call("motionEvent", session, kind, x, y, height, width, now);
    }

    boolean active() { return moving; }

    void tick(double now, double elapsed) {
        frame = SharedCore.numbers("motionFrame", session, now, elapsed);
        moving = frame[0] != 0;
    }

    void paint(Graphics2D g) {
        var path = new Path2D.Double();
        g.translate(frame[1], frame[2]);
        int i = 3;
        while (i < frame.length) {
            switch ((int) frame[i++]) {
                case 0 -> path.reset();
                case 1 -> path.moveTo(frame[i++], frame[i++]);
                case 2 -> path.lineTo(frame[i++], frame[i++]);
                case 3 -> path.closePath();
                case 4 -> {
                    double x = frame[i++], y = frame[i++], r = frame[i++];
                    path.append(new Ellipse2D.Double(x - r, y - r, r * 2, r * 2), false);
                }
                case 5 -> { g.setColor(new Color((int) frame[i++], true)); g.fill(path); }
                case 6 -> {
                    g.setColor(new Color((int) frame[i++], true));
                    g.setStroke(new BasicStroke((float) frame[i++], BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
                    g.draw(path);
                }
                default -> throw new IllegalStateException("未知的 Woodfish 绘制命令");
            }
        }
    }
}
