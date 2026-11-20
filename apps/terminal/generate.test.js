const { WOODFISH_PALETTES } = require('@woodfish/theme-core');
const { opaque, render, tmTheme } = require('./generate');
const { aliasColors } = require('./scopeAliases');

test('aliases inherit the winning VS Code foreground, without styling all parameters as self', () => {
  const rule = (scope, foreground) => ({ scope, settings: { foreground } });
  const result = aliasColors(
    [
      rule('entity.name', '#111111'),
      rule('meta.class.python entity.name.type.class', '#222222'),
      rule('meta.class.python entity.name.type.class', '#333333'),
      rule('entity.name.type.class', '#444444'),
      rule('meta.function.python entity.name.type.class', '#555555'),
    ],
    '#999999'
  );
  expect(
    result.find((r) => r.scope.startsWith('entity.name.class.python')).settings.foreground
  ).toBe('#333333');
  expect(
    result.find((r) => r.scope.includes('punctuation.section.interpolation.begin.python')).settings
      .foreground
  ).toBe('#999999');
  expect(result.some((r) => r.scope.includes('variable.parameter.python'))).toBe(false);
});

test('composites translucent terminal colors over their actual background', () => {
  expect(opaque('#ffffff80', '#000000')).toBe('#808080');
  expect(opaque('#abcd', '#abc')).toBe('#aabbcc');
});

test('preserves rule order, comma selectors, XML escaping and style resets', () => {
  const syntax = tmTheme(
    'A&B',
    {
      tokenColors: [
        { settings: { foreground: '#112233' } },
        { scope: ['string', 'meta.tag'], settings: { fontStyle: 'italic' } },
        { scope: 'string & other', settings: { fontStyle: '' } },
      ],
    },
    { background: '#123456' }
  );
  expect(syntax).toContain('A&amp;B');
  expect(syntax).toContain('<key>foreground</key><string>#112233</string>');
  expect(syntax.indexOf('string, meta.tag')).toBeLessThan(syntax.indexOf('string &amp; other'));
  expect(syntax).toContain('<key>fontStyle</key><string></string>');
});

test.each(WOODFISH_PALETTES)('maps $label to all hosts without swapping the bright colors', (p) => {
  const name = 'woodfish-' + p.slug;
  const files = render(p, { colors: {}, tokenColors: [] });
  const wt = JSON.parse(files[`windows-terminal/${name}.json`]);
  expect(wt.brightPurple).toBe(p.ansi[13]);
  expect(wt.brightWhite).toBe(p.ansi[15]);
  expect(files[`ghostty/${name}`]).toContain(`palette = 13=${wt.brightPurple}\n`);
  expect(files[`yazi/${name}.yazi/tmtheme.xml`]).toBe(files[`bat/${p.label}.tmTheme`]);
  expect(Object.keys(files)).toHaveLength(8);
});
