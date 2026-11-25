package com.github.yyyyolo7a79.woodfish.editor;

import java.awt.Color;
import java.awt.Font;
import java.util.Arrays;

/**
 * 按平台规则合并文字最终的前景色与字体样式（纯算法，不依赖 IDE 运行时，便于单测）。
 *
 * <p>逐项对应 {@code IterationState#setAttributes} 里与前景色、字体样式有关的部分
 * （243 / 252 / 262 三个分支的这段逻辑相同）：
 * <ol>
 *   <li>覆盖当前位置的高亮器按「层号高者优先 → 影响区短者优先 → 有前景色者优先 → 有背景色者优先」排序
 *       （{@code createByLayerThenByAttributesComparator}）</li>
 *   <li>lexer 属性作为一层虚拟高亮插在 {@code HighlighterLayer.SYNTAX}：排在第一个层号低于 SYNTAX 的高亮器之前</li>
 *   <li>任一高亮器的属性是 {@code TextAttributes.ERASE_MARKER} 时，lexer 属性整体作废</li>
 *   <li>按上述顺序取第一个非空前景色、第一个非 PLAIN 的字体样式，都没有时用配色方案默认值</li>
 * </ol>
 *
 * <p>没有建模的部分及理由：选区、光标行、只读块三层虚拟属性在平台上都不带前景色（选区前景色由调用方
 * 整段跳过处理）；折叠占位符不参与正文绘制（平台绘制正文时 {@code useFoldRegions = false}）；
 * 按 HighlightSeverity 打破平局依赖 daemon 内部类，只在同层、同长度、前后景色有无都相同的两个
 * 高亮器之间才会用到。
 *
 * <p>只收集「影响前景色或字体样式」的高亮器（与 LineLayout 构造 IterationState 时的
 * {@code useOnlyFontOrForegroundAffectingHighlighters} 同义）：去掉只带背景 / 效果的高亮器不会改变
 * 其余元素的相对顺序，也不会改变「第一个非空值」的结果。
 */
final class RunMerger {

    static final int FLAG_FOREGROUND = 1;
    static final int FLAG_BACKGROUND = 2;
    static final int FLAG_ERASE = 4;
    private static final int FLAG_CLASSIC_BOLD = 8;

    private final int syntaxLayer;

    // ===== 高亮器：结构数组，finishGathering 后按影响区起点升序 =====
    private int count;
    private int[] queryStart = new int[64];
    private int[] queryEnd = new int[64];
    private int[] start = new int[64];
    private int[] end = new int[64];
    private int[] length = new int[64];
    private int[] layer = new int[64];
    private int[] font = new int[64];
    private byte[] flags = new byte[64];
    private Color[] foreground = new Color[64];

    // ===== lexer 片段：起点升序、互不重叠 =====
    private int lexCount;
    private int[] lexStart = new int[128];
    private int[] lexEnd = new int[128];
    private int[] lexFont = new int[128];
    private Color[] lexForeground = new Color[128];

    // ===== 扫描临时数组 =====
    private long[] sorted = new long[64];
    private int[] candidates = new int[64];
    private int[] active = new int[16];

    private Color resolvedForeground;
    private int resolvedFont;

    /** @param syntaxLayer 平台的 {@code HighlighterLayer.SYNTAX}（由调用方传入，保持本类不依赖 IDE） */
    RunMerger(int syntaxLayer) {
        this.syntaxLayer = syntaxLayer;
    }

    void reset() {
        Arrays.fill(foreground, 0, count, null);
        count = 0;
        resetLexemes();
    }

    void resetLexemes() {
        Arrays.fill(lexForeground, 0, lexCount, null);
        lexCount = 0;
    }

    /**
     * 登记一个高亮器。
     *
     * @param rangeStart     高亮器自身区间起点（平台按它判断「与查询范围相交」）
     * @param rangeEnd       高亮器自身区间终点
     * @param affectedStart  影响区起点（LINES_IN_RANGE 会扩展到整行），已对齐码点边界
     * @param affectedEnd    影响区终点，已对齐码点边界
     * @param affectedLength 未对齐的影响区长度（平台排序用的就是它）
     */
    void addHighlighter(int rangeStart, int rangeEnd, int affectedStart, int affectedEnd,
                        int affectedLength, int highlighterLayer, Color fg, int fontType,
                        boolean hasBackground, boolean erase, boolean classicBold) {
        if (affectedEnd <= affectedStart) {
            return; // 空区间不覆盖任何字符
        }
        if (count == start.length) {
            growHighlighters();
        }
        int i = count++;
        queryStart[i] = rangeStart;
        queryEnd[i] = rangeEnd;
        start[i] = affectedStart;
        end[i] = affectedEnd;
        length[i] = affectedLength;
        layer[i] = highlighterLayer;
        foreground[i] = erase ? null : fg;
        font[i] = erase ? Font.PLAIN : fontType;
        flags[i] = (byte) ((fg != null && !erase ? FLAG_FOREGROUND : 0)
                | (hasBackground ? FLAG_BACKGROUND : 0)
                | (erase ? FLAG_ERASE : 0) | (classicBold ? FLAG_CLASSIC_BOLD : 0));
    }

    /** 登记一段 lexer token（必须按起点升序调用） */
    void addLexeme(int lexemeStart, int lexemeEnd, Color fg, int fontType) {
        if (lexemeEnd <= lexemeStart) {
            return;
        }
        if (lexCount == lexStart.length) {
            int n = lexCount * 2;
            lexStart = Arrays.copyOf(lexStart, n);
            lexEnd = Arrays.copyOf(lexEnd, n);
            lexFont = Arrays.copyOf(lexFont, n);
            lexForeground = Arrays.copyOf(lexForeground, n);
        }
        lexStart[lexCount] = lexemeStart;
        lexEnd[lexCount] = lexemeEnd;
        lexFont[lexCount] = fontType;
        lexForeground[lexCount] = fg;
        lexCount++;
    }

    /** 收集完毕：高亮器按影响区起点排序（平台 HighlighterSweep 同样按影响区排序后扫描） */
    void finishGathering() {
        for (int i = 0; i < count; i++) sorted[i] = (long) start[i] << 32 | i;
        Arrays.sort(sorted, 0, count);
    }

    /**
     * 为 [applyStart, applyEnd) 生成颜色段，追加到 {@code out}。
     *
     * <p>平台每个 IterationState 只认「区间与 [queryStart, queryEnd] 相交」的高亮器（含端点），
     * 再按影响区决定每个字符是否被覆盖；这里两步分开做，才能与平台在软换行续行、折叠区之后
     * 新建 IterationState 时的取舍一致。
     */
    void merge(int scopeQueryStart, int scopeQueryEnd, int applyStart, int applyEnd,
               Color defaultForeground, int defaultFont, Runs out) {
        int candidateCount = selectCandidates(scopeQueryStart, scopeQueryEnd, applyStart, applyEnd);
        int lexeme = 0;
        int activeCount = 0;
        int nextCandidate = 0;
        int pos = applyStart;
        while (pos < applyEnd) {
            while (nextCandidate < candidateCount && start[candidates[nextCandidate]] <= pos) {
                int h = candidates[nextCandidate++];
                if (end[h] > pos) {
                    if (activeCount == active.length) {
                        active = Arrays.copyOf(active, activeCount * 2);
                    }
                    active[activeCount++] = h;
                }
            }
            int kept = 0;
            for (int j = 0; j < activeCount; j++) {
                if (end[active[j]] > pos) {
                    active[kept++] = active[j];
                }
            }
            activeCount = kept;
            while (lexeme < lexCount && lexEnd[lexeme] <= pos) {
                lexeme++;
            }

            // 下一个边界：lexer token 边界、下一个高亮器起点、任一活动高亮器终点，取最近者（必然 > pos）
            int next = applyEnd;
            if (lexeme < lexCount) {
                next = Math.min(next, lexStart[lexeme] > pos ? lexStart[lexeme] : lexEnd[lexeme]);
            }
            if (nextCandidate < candidateCount) {
                next = Math.min(next, start[candidates[nextCandidate]]);
            }
            for (int j = 0; j < activeCount; j++) {
                next = Math.min(next, end[active[j]]);
            }

            int syntax = lexeme < lexCount && lexStart[lexeme] <= pos ? lexeme : -1;
            resolve(activeCount, syntax, defaultForeground, defaultFont);
            out.append(pos, next, resolvedForeground, resolvedFont);
            pos = next;
        }
    }

    private int selectCandidates(int scopeQueryStart, int scopeQueryEnd, int applyStart, int applyEnd) {
        int candidateCount = 0;
        for (int rank = 0; rank < count; rank++) {
            int i = (int) sorted[rank];
            if (start[i] >= applyEnd) break;
            if (end[i] > applyStart && queryStart[i] <= scopeQueryEnd && queryEnd[i] >= scopeQueryStart) {
                if (candidateCount == candidates.length) {
                    candidates = Arrays.copyOf(candidates, candidateCount * 2);
                }
                candidates[candidateCount++] = i;
            }
        }
        return candidateCount;
    }

    private void resolve(int activeCount, int syntax, Color defaultForeground, int defaultFont) {
        // 活动高亮器通常只有 0 ~ 3 个，插入排序即可（稳定，完全平局时保持起点顺序）
        for (int i = 1; i < activeCount; i++) {
            int h = active[i];
            int j = i - 1;
            while (j >= 0 && compare(active[j], h) > 0) {
                active[j + 1] = active[j];
                j--;
            }
            active[j + 1] = h;
        }
        boolean erase = false;
        for (int i = 0; i < activeCount; i++) {
            erase |= (flags[active[i]] & FLAG_ERASE) != 0;
        }

        boolean syntaxPending = syntax >= 0 && !erase;
        Color fg = null;
        int fontType = Font.PLAIN;
        int extraFont = Font.PLAIN;
        for (int i = 0; i < activeCount; i++) {
            int h = active[i];
            if (syntaxPending && layer[h] < syntaxLayer) {
                if (fg == null) fg = lexForeground[syntax];
                if (fontType == Font.PLAIN) fontType = lexFont[syntax];
                syntaxPending = false;
            }
            if ((flags[h] & FLAG_ERASE) != 0) {
                continue;
            }
            if (fg == null) {
                fg = foreground[h];
            }
            if ((flags[h] & FLAG_CLASSIC_BOLD) != 0) {
                extraFont = Font.BOLD;
            } else if (fontType == Font.PLAIN) {
                fontType = font[h];
            }
        }
        if (syntaxPending) {
            if (fg == null) {
                fg = lexForeground[syntax];
            }
            if (fontType == Font.PLAIN) {
                fontType = lexFont[syntax];
            }
        }
        resolvedForeground = fg != null ? fg : defaultForeground;
        resolvedFont = (fontType != Font.PLAIN ? fontType : defaultFont) | extraFont;
    }

    /** 与 IterationState.createByLayerThenByAttributesComparator 相同的前四级比较 */
    private int compare(int a, int b) {
        if (layer[a] != layer[b]) {
            return layer[a] > layer[b] ? -1 : 1;
        }
        if (length[a] != length[b]) {
            return length[a] < length[b] ? -1 : 1;
        }
        int fa = flags[a] & FLAG_FOREGROUND;
        int fb = flags[b] & FLAG_FOREGROUND;
        if (fa != fb) {
            return fa != 0 ? -1 : 1;
        }
        int ba = flags[a] & FLAG_BACKGROUND;
        int bb = flags[b] & FLAG_BACKGROUND;
        if (ba != bb) {
            return ba != 0 ? -1 : 1;
        }
        return 0;
    }

    private void growHighlighters() {
        int n = Math.max(64, count * 2);
        sorted = Arrays.copyOf(sorted, n);
        queryStart = Arrays.copyOf(queryStart, n);
        queryEnd = Arrays.copyOf(queryEnd, n);
        start = Arrays.copyOf(start, n);
        end = Arrays.copyOf(end, n);
        length = Arrays.copyOf(length, n);
        layer = Arrays.copyOf(layer, n);
        font = Arrays.copyOf(font, n);
        flags = Arrays.copyOf(flags, n);
        foreground = Arrays.copyOf(foreground, n);
    }

    /**
     * 合并结果：前景色（getRGB 相同视为同色，与平台 LineLayout 用 {@code Color.equals} 切分片段一致）
     * 与字体样式都相同的相邻段会并成一段，相当于原版的一个 token span。
     */
    static final class Runs {
        int count;
        int[] start = new int[64];
        int[] end = new int[64];
        int[] font = new int[64];
        Color[] foreground = new Color[64];

        void clear() {
            Arrays.fill(foreground, 0, count, null);
            count = 0;
        }

        void append(int s, int e, Color fg, int fontType) {
            if (count > 0) {
                int last = count - 1;
                if (end[last] == s && font[last] == fontType
                        && foreground[last].getRGB() == fg.getRGB()) {
                    end[last] = e;
                    return;
                }
            }
            if (count == start.length) {
                int n = count * 2;
                start = Arrays.copyOf(start, n);
                end = Arrays.copyOf(end, n);
                font = Arrays.copyOf(font, n);
                foreground = Arrays.copyOf(foreground, n);
            }
            start[count] = s;
            end[count] = e;
            font[count] = fontType;
            foreground[count] = fg;
            count++;
        }
    }
}
