package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.color.TokenColorDeriver;
import org.junit.jupiter.api.Test;

import java.awt.Color;
import java.awt.Font;
import java.awt.RenderingHints;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GlowSpecTest {

    private static final GlowParams PARAMS = new GlowParams(1, 1, 1, false, false,
            RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB);
    private static final TokenColorDeriver DERIVER = new TokenColorDeriver(24, 0.06, 0.06, 300);

    @Test
    void chineseLineGlowsByDefault() {
        PaintFrame frame = frame("中文注释", new int[][]{{0, 4}});

        GlowSpec spec = GlowSpec.create(frame, 0, PARAMS, DERIVER, true);

        assertNotNull(spec);
        assertEquals("中文注释", new String(spec.text));
    }

    @Test
    void disablingCjkKeepsLatinPiecesOnly() {
        PaintFrame frame = frame("code中文", new int[][]{{0, 4}, {4, 6}});

        assertNull(GlowSpec.create(frame("中文注释", new int[][]{{0, 4}}), 0, PARAMS, DERIVER, false));
        GlowSpec spec = GlowSpec.create(frame, 0, PARAMS, DERIVER, false);
        assertNotNull(spec);
        assertEquals(1, spec.pieceCount());
        assertEquals("code", new String(spec.text));
    }

    @Test
    void copiesEditorGlyphPositionsAndRiskFlags() {
        PaintFrame frame = frame("ab中文", new int[][]{{0, 2}, {2, 4}});
        frame.pieceNativeRisk[1] = true;

        GlowSpec spec = GlowSpec.create(frame, 0, PARAMS, DERIVER, true);

        assertNotNull(spec);
        assertArrayEquals(new boolean[]{false, true}, spec.nativeRisk);
        // 中文字宽 13：第二个 piece 的逐字位置必须是编辑器累加出来的值，而不是按 8px 等宽推算
        assertArrayEquals(new float[]{0, 8, 16, 29}, spec.glyphX);
    }

    @Test
    void positionsAndRiskTakePartInCacheIdentity() {
        GlowSpec a = GlowSpec.create(frame("中文", new int[][]{{0, 2}}), 0, PARAMS, DERIVER, true);
        PaintFrame shifted = frame("中文", new int[][]{{0, 2}});
        shifted.charX[1] = 14;
        PaintFrame risky = frame("中文", new int[][]{{0, 2}});
        risky.pieceNativeRisk[0] = true;

        assertEquals(a, GlowSpec.create(frame("中文", new int[][]{{0, 2}}), 0, PARAMS, DERIVER, true));
        assertNotEquals(a, GlowSpec.create(shifted, 0, PARAMS, DERIVER, true));
        assertNotEquals(a, GlowSpec.create(risky, 0, PARAMS, DERIVER, true));
        assertFalse(a.nativeRisk[0]);
        assertTrue(GlowSpec.create(risky, 0, PARAMS, DERIVER, true).nativeRisk[0]);
    }

    @Test
    void gridModeCopiesCellsAndAlignment() {
        PaintFrame frame = frame("ab中文", new int[][]{{0, 2}, {2, 4}});
        frame.hasMeasuredCells = true;
        frame.charCell[0] = 8;
        frame.charCell[1] = 8;
        frame.charCell[2] = 16;
        frame.charCell[3] = 16;
        frame.pieceGridAligned[1] = true;

        GlowSpec spec = GlowSpec.create(frame, 0, PARAMS, DERIVER, true);

        assertNotNull(spec);
        assertArrayEquals(new float[]{8, 8, 16, 16}, spec.cells);
        assertArrayEquals(new boolean[]{false, true}, spec.gridAligned);
        // 不在网格模式时不带格宽；网格数据参与缓存身份
        GlowSpec plain = GlowSpec.create(frame("ab中文", new int[][]{{0, 2}, {2, 4}}), 0, PARAMS, DERIVER, true);
        assertNotNull(plain);
        assertNull(plain.cells);
        assertNotEquals(plain, spec);
        // 关闭中日韩效果时只带剩下的 piece 的格宽
        GlowSpec latin = GlowSpec.create(frame, 0, PARAMS, DERIVER, false);
        assertNotNull(latin);
        assertArrayEquals(new float[]{8, 8}, latin.cells);
        assertArrayEquals(new boolean[]{false}, latin.gridAligned);
    }

    /** 拉丁字母宽 8px，中日韩字宽 13px；charX 按编辑器的方式从 piece 起点累加 */
    private static PaintFrame frame(String text, int[][] pieces) {
        PaintFrame frame = new PaintFrame();
        frame.lineHeight = 20;
        frame.ascent = 15;
        int line = frame.addLine(0, 0);
        frame.setText(0, text.length());
        text.getChars(0, text.length(), frame.chars, 0);
        frame.fonts[0] = new Font(Font.MONOSPACED, Font.PLAIN, 14);
        frame.fontCount = 1;
        int token = frame.addToken(Color.GREEN, false, 0, 20, 14);
        float x = 0;
        for (int[] piece : pieces) {
            float start = x;
            for (int i = piece[0]; i < piece[1]; i++) {
                frame.charX[i] = x;
                x += text.charAt(i) < 0x80 ? 8 : 13;
            }
            frame.addPiece(piece[0], piece[1], start, x - start, 0, PaintFrame.SELECTION_NONE);
        }
        frame.endToken(token, 0, x);
        frame.endLine(line);
        return frame;
    }
}
