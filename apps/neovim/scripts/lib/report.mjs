// Markdown rendering of the comparison report (report.json holds the same data).
const label = (group) => `${group.lang} ${group.capture ? `@${group.capture}` : '(no capture)'}`;
const style = (bits) => (bits ? `style ${bits}` : 'plain');

export function renderMarkdown(report) {
  const out = [
    '# Woodfish Neovim colorschemes: comparison with VS Code',
    '',
    `- commit: \`${report.commit}\`, tree ${report.dirty ? `**dirty** (${report.dirtyFiles.length} files)` : 'clean'}`,
    `- generated: ${report.generatedAt} (finished ${report.finishedAt})`,
    `- ${report.neovim}; Shiki ${report.shiki}; pictures show the first ${report.excerptLines} lines of each sample, the numbers cover every line`,
    `- load check: ${report.loadCheck}`,
    '- match: share of non-blank characters Neovim paints in the same color (or font style) as VS Code, on held-out samples the statistics never saw; "7 base" are typescript, python, lua, go, rust, json, markdown; "web" are javascript, jsx, tsx, each measured on its own statistics samples (Neovim parses jsx files with its javascript parser, so jsx and javascript share their highlight groups)',
    '- mapping error: a capture + language combination painted in another color than the majority one VS Code gives it in the statistics samples, or without the font style chosen for it',
    '- unsplittable: VS Code gives the same capture + language several colors (or no capture exists), so one highlight group cannot match them all',
    '- font styles: Neovim merges the attributes of overlapping highlights and a group cannot switch a style off, so a combination can show an extra style inherited from a capture painted underneath it (listed per theme); a missing chosen style would be a mapping error',
    '- uncovered: a combination the statistics samples never contained, so nothing was chosen for it',
    '',
    '| theme | color, 7 base | font style, 7 base | color, web | font style, web | color, all 10 | mapping errors (stats / held-out) | unsplittable chars | uncovered chars | stats color / style |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...report.themes.map(
      (t) =>
        `| ${t.label} | ${t.baseConsistency}% | ${t.baseStyleConsistency}% | ${t.webConsistency}% | ${t.webStyleConsistency}% | ${t.allConsistency}% | ${t.statsMappingErrors} / ${t.mappingErrors} | ${t.unsplittableChars} | ${t.uncoveredChars} | ${t.statsConsistency}% / ${t.statsStyleConsistency}% |`
    ),
    '',
  ];
  for (const t of report.themes) {
    const languages = Object.entries(t.byLanguage)
      .map(([language, value]) => `${language} ${value.consistency}% / ${value.styleConsistency}%`)
      .join(', ');
    out.push(
      `## ${t.label}`,
      '',
      `held-out, color / font style per sample: ${languages}; statistics samples ${t.statsConsistency}% of ${t.statsChars} characters`,
      ''
    );
    const wrong = (g) => `- ${label(g)}: chosen ${g.expected} ${style(g.expectedStyle)}, painted ${g.painted} ${style(g.paintedStyle)}`;
    if (t.statsMappingErrorGroups.length) out.push('Mapping errors on the statistics samples:', ...t.statsMappingErrorGroups.map(wrong), '');
    if (t.statsMixedGroupList.length) {
      out.push('Combinations Neovim painted in several colors (capture model mismatch):', ...t.statsMixedGroupList.map((g) => `- ${label(g)}: ${JSON.stringify(g.rendered)}`), '');
    }
    if (t.mappingErrorGroups.length) out.push('Mapping errors on the held-out samples:', ...t.mappingErrorGroups.map(wrong), '');
    if (t.styleOverlaps.length) {
      out.push(
        'Font styles inherited from a capture painted underneath (Neovim merges overlapping highlights and a group cannot switch a style off), held-out samples:',
        ...t.styleOverlaps.map((g) => `- ${label(g)}: chose ${style(g.expectedStyle)}, painted ${style(g.paintedStyle)}`),
        ''
      );
    }
    if (t.uncovered.length) {
      out.push('Combinations the statistics samples never contained:', ...t.uncovered.map((g) => `- ${label(g)}: ${g.distribution}; painted ${g.painted}`), '');
    }
    out.push(
      'Unsplittable (shares of the combination\'s characters in the held-out samples; "flipped" = its majority differs from the chosen color):',
      ...t.unsplittable.map((g) => `- ${label(g)}: ${g.distribution}; ${g.misses} of ${g.chars} characters differ${g.flipped ? ' (flipped)' : ''}`),
      ''
    );
  }
  return `${out.join('\n')}\n`;
}
