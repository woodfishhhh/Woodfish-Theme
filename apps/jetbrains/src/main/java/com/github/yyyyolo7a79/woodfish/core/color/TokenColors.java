package com.github.yyyyolo7a79.woodfish.core.color;

import java.awt.Color;
import java.util.List;

/** The evenly spaced CSS stops and halo colors computed by theme-core. */
public record TokenColors(List<Color> stops, double angle, Color base, Color glowNear,
                          Color glowMid, Color glowFar, boolean neutral, boolean punctuation) {
    public TokenColors {
        stops = List.copyOf(stops);
    }

    public Color light() { return stops.getFirst(); }
    public Color dark() { return stops.getLast(); }

    public boolean solidBase() {
        for (Color stop : stops) if (!stop.equals(base)) return false;
        return true;
    }
}
