package com.github.yyyyolo7a79.woodfish.core.color;

import com.github.yyyyolo7a79.woodfish.settings.SharedDefaults;
import org.junit.jupiter.api.Test;
import java.awt.Color;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class SharedGradientTest {
    @Test void keepsBothKeywordStopsAndEveryForegroundStop() {
        Color bg = new Color(0x1c2433);
        Color fg = SharedDefaults.editorForeground(bg, new Color(0xafbbd2));
        var deriver = new TokenColorDeriver(32, .12, .075, 300, bg, fg);
        var keyword = deriver.derive(new Color(0xeacd61), false);
        assertEquals(List.of(new Color(0xeacd61), new Color(0xea618e)), keyword.stops());
        assertEquals(45, keyword.angle());
        var body = deriver.derive(fg, false);
        assertEquals(9, body.stops().size());
        assertEquals(135, body.angle());
        for (int i = 0; i < body.stops().size(); i++)
            assertEquals(body.stops().get(i).getRGB(), CssGradient.colorAt(body.stops(), i / 8.0));
    }

    @Test void lightThemeGetsAColorfulHaloAndPunctuationKeepsLessAlpha() {
        var color = new Color(0xb4235a);
        var deriver = new TokenColorDeriver(32, .12, .075, 300, new Color(0xfbfaf7), new Color(0x24292f));
        var word = deriver.derive(color, false);
        var punctuation = deriver.derive(color, true);
        assertNotEquals(color.getRGB() & 0xffffff, word.glowNear().getRGB() & 0xffffff);
        assertTrue(word.glowNear().getAlpha() > punctuation.glowNear().getAlpha());
    }
}
