package com.github.yyyyolo7a79.woodfish.core.color;

import com.github.yyyyolo7a79.woodfish.core.SharedCore;
import com.github.yyyyolo7a79.woodfish.settings.SharedDefaults;
import com.google.gson.JsonArray;
import java.awt.Color;
import java.util.List;

/** Text colors and occurrence weights collected from the editor scheme. */
public final class AnchorHue {
    public static final double FALLBACK_HUE = SharedDefaults.number("anchorHue");
    public record WeightedColor(Color color, double weight) {}
    private AnchorHue() {}

    public static double resolve(List<WeightedColor> candidates, List<Color> accents) {
        var samples = new JsonArray();
        for (WeightedColor candidate : candidates) {
            if (candidate == null || candidate.color() == null || !(candidate.weight() > 0)) continue;
            var entry = new JsonArray();
            entry.add(candidate.color().getRGB());
            entry.add(Double.toString(candidate.weight()));
            samples.add(entry);
        }
        var fallback = new JsonArray();
        for (Color color : accents) if (color != null) fallback.add(color.getRGB());
        return ((Number) SharedCore.call("anchor", samples.toString(), fallback.toString())).doubleValue();
    }
}
