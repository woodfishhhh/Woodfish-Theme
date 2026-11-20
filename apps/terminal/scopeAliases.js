// Only distinctions observed in bat's grammar. In particular, a plain parameter is not necessarily self.
const aliases = [
  [
    'meta.annotation.python punctuation.definition.annotation.python',
    'meta.function.decorator.python entity.name.function.decorator.python punctuation.definition.decorator.python',
  ],
  [
    'variable.annotation.python meta.generic-name.python',
    'meta.function.decorator.python entity.name.function.decorator.python',
  ],
  [
    'entity.name.class.python meta.generic-name.python',
    'meta.class.python entity.name.type.class.python',
  ],
  [
    'meta.interpolation.python punctuation.section.interpolation.begin.python, meta.interpolation.python punctuation.section.interpolation.end.python',
    'meta.fstring.python constant.character.format.placeholder.other.python',
  ],
  [
    'meta.interpolation.python variable.language.python',
    'meta.fstring.python variable.language.special.self.python',
  ],
  [
    'meta.interpolation.python punctuation.accessor.dot.python',
    'meta.fstring.python meta.member.access.python punctuation.separator.period.python',
  ],
  [
    'meta.string.interpolated.python punctuation.definition.string.begin.python',
    'meta.fstring.python punctuation.definition.string.begin.python string.interpolated.python string.quoted.single.python',
  ],
  [
    'meta.string.interpolated.python punctuation.definition.string.end.python',
    'meta.fstring.python punctuation.definition.string.end.python string.interpolated.python string.quoted.single.python',
  ],
  [
    'meta.template.expression.ts support.variable.property.dom.ts',
    'meta.template.expression.ts meta.embedded.line.ts variable.other.property.ts',
  ],
  ['storage.type.keyword.type.go', 'keyword.type.go'],
  ['storage.type.keyword.struct.go', 'keyword.struct.go'],
  ['storage.type.keyword.function.go', 'keyword.function.go'],
  ['keyword.other.package.go', 'keyword.package.go'],
  ['source.go storage.type.go', 'entity.name.type.go'],
  ['storage.type.go support.type.builtin.go', 'storage.type.go'],
  ['variable.other.member.declaration.go', 'variable.other.property.go'],
  ['meta.block.go variable.other.member.go', 'variable.other.go'],
  ['punctuation.accessor.dot.go', 'punctuation.other.period.go'],
  ['entity.name.struct.rust', 'entity.name.type.struct.rust'],
  ['entity.name.impl.rust', 'entity.name.type.rust'],
  ['storage.type.impl.rust', 'keyword.other.rust'],
  ['storage.type.function.rust', 'meta.function.definition.rust keyword.other.fn.rust'],
  ['punctuation.separator.type.rust', 'keyword.operator.key-value.rust'],
  [
    'meta.function.return-type.rust punctuation.separator.rust',
    'meta.function.definition.rust keyword.operator.arrow.skinny.rust',
  ],
  [
    'meta.function.return-type.rust storage.type.rust',
    'meta.function.definition.rust entity.name.type.primitive.rust',
  ],
  ['punctuation.accessor.dot.rust', 'keyword.operator.access.dot.rust'],
  ['meta.struct.rust variable.other.member.rust', 'variable.other.rust'],
];

const matches = (scope, selector) => scope === selector || scope.startsWith(selector + '.');

function aliasColors(tokenColors, fallback) {
  const rules = tokenColors.flatMap(({ scope, settings }) =>
    !scope || !settings.foreground
      ? []
      : [scope].flat().flatMap((group) =>
          group.split(',').map((selector) => ({
            parts: selector.trim().split(/\s+/).reverse(),
            color: settings.foreground,
          }))
        )
  );
  return aliases.map(([scope, target]) => {
    const language = target.split('.').at(-1);
    const stack = ['source.' + language, ...target.split(' ')];
    let color = fallback;
    // Each nested scope inherits its parent's ink. Prefer the longest matching leaf,
    // then the most specific parent selectors; a later equally specific rule wins.
    for (const [i, leaf] of stack.entries()) {
      let best = [];
      for (const { parts, color: ink } of rules) {
        if (!matches(leaf, parts[0])) continue;
        let j = i;
        if (
          !parts.slice(1).every((parent) => {
            while (--j >= 0 && !matches(stack[j], parent)) {
              /* ascend */
            }
            return j >= 0;
          })
        )
          continue;
        const rank = [parts[0].split('.').length, ...parts.slice(1).map((p) => p.length)];
        const different = rank.findIndex((n, k) => n !== best[k]);
        if (different < 0 ? rank.length < best.length : rank[different] < (best[different] ?? 0))
          continue;
        best = rank;
        color = ink;
      }
    }
    return { scope, settings: { foreground: color } };
  });
}

module.exports = { aliasColors };
