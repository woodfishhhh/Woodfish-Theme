package com.github.yyyyolo7a79.woodfish.editor;

import java.util.function.IntToDoubleFunction;

/** Convert public editor caret boundaries into cell widths and centered glyph origins. */
final class EditorGrid {
    private EditorGrid() {}

    static int fit(int from, int to, float left, float[] origins, float[] widths,
                       IntToDoubleFunction boundary) {
        int adjusted = 0;
        for (int i = from; i < to; i++) {
            float right = (float) boundary.applyAsDouble(i + 1);
            if (right < left) return -1; // A visual discontinuity cannot be repainted as an LTR run.
            float cell = right - left;
            float difference = cell - widths[i];
            origins[i] = Math.abs(difference) < TextPieces.GRID_TOLERANCE ? left : left + difference / 2;
            if (Math.abs(difference) >= TextPieces.GRID_TOLERANCE) adjusted = 1;
            widths[i] = cell;
            left = right;
        }
        return adjusted;
    }
}
