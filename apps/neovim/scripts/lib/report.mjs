// Markdown rendering of the comparison report (report.json holds the same data).
const label = (group) => `${group.lang} ${group.capture ? `@${group.capture}` : '(no capture)'}`;

export function renderMarkdown(report) {
  const out = [
    '# Woodfish Neovim colorschemes: comparison with VS Code',
    '',
    `- commit: \`${report.commit}\`, tree ${report.dirty ? `**dirty** (${report.dirtyFiles.length} files)` : 'clean'}`,
    `- generated: ${report.generatedAt} (finished ${report.finishedAt})`,
    `- ${report.neovim}; Shiki ${report.shiki}; pictures show lines 1-${report.excerptLines} of each sample, the numbers cover every line`,
    `- load check: ${report.loadCheck}`,
    '- mapping error: a capture + language combination painted in a color other than the majority color VS Code gives it in the statistics samples',
    '- unsplittable: VS Code gives the same capture + language several colors (or no capture exists), so one highlight group cannot match them all',
    '- uncovered: a combination the statistics samples never contained, so no color was chosen for it',
    '',
    '| theme | held-out match | mapping errors (stats / held-out) | unsplittable chars | uncovered chars | stats match |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...report.themes.map(
      (t) => `| ${t.label} | ${t.consistency}% | ${t.statsMappingErrors} / ${t.mappingErrors} | ${t.unsplittableChars} | ${t.uncoveredChars} | ${t.statsConsistency}% |`
    ),
    '',
  ];
  for (const t of report.themes) {
    const languages = Object.entries(t.byLanguage).map(([language, value]) => `${language} ${value.consistency}%`).join(', ');
    out.push(`## ${t.label}`, '', `held-out ${t.consistency}% of ${t.chars} characters (${languages}); statistics samples ${t.statsConsistency}% of ${t.statsChars}`, '');
    if (t.statsMappingErrorGroups.length) {
      out.push('Mapping errors on the statistics samples:', ...t.statsMappingErrorGroups.map((g) => `- ${label(g)}: chosen ${g.expected}, painted ${g.painted}`), '');
    }
    if (t.statsMixedGroupList.length) {
      out.push('Combinations Neovim painted in several colors (capture model mismatch):', ...t.statsMixedGroupList.map((g) => `- ${label(g)}: ${JSON.stringify(g.rendered)}`), '');
    }
    if (t.mappingErrorGroups.length) {
      out.push('Mapping errors on the held-out samples:', ...t.mappingErrorGroups.map((g) => `- ${label(g)}: chosen ${g.expected}, painted ${g.painted}`), '');
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
