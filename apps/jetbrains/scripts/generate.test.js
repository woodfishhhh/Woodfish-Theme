const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { WOODFISH_PALETTES } = require('@woodfish/theme-core');
const { main, opaque, render, themeIds, missingRegistrations } = require('./generate');
const { createResolver } = require('./themeMatch');
const scopeMap = require('./scopeMap');
const { editorKeyNames } = require('./editorMap');
const verified = require('./verified-keys.json');

const resources = path.resolve(__dirname, '../src/main/resources');
const HEX6 = /^[0-9A-F]{6}$/;

function attributesOf(xml) {
  const result = {};
  for (const match of xml.matchAll(/<option name="([^"]+)"><value>(.*?)<\/value><\/option>/g)) {
    result[match[1]] = Object.fromEntries(
      [...match[2].matchAll(/<option name="([^"]+)" value="([^"]*)"\/>/g)].map((m) => [m[1], m[2]])
    );
  }
  return result;
}

describe('scope map', () => {
  it('has no duplicate attribute and no empty scope stack', () => {
    const keys = scopeMap.map(({ key }) => key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const { scopes } of scopeMap) expect(scopes.trim()).not.toBe('');
  });

  it('only uses attribute names that were found in a real IDE distribution', () => {
    const missing = scopeMap
      .map(({ key }) => key)
      .filter((key) => !Object.keys(verified[key] ?? {}).length);
    expect(missing).toEqual([]);
  });

  it('also checks the editor, console, diff, inlay and fold names', () => {
    const missing = editorKeyNames().filter((key) => !Object.keys(verified[key] ?? {}).length);
    expect(missing).toEqual([]);
  });
});

describe('theme matching', () => {
  const resolve = createResolver([
    { scope: 'comment', settings: { foreground: '#111111', fontStyle: 'italic' } },
    { scope: 'string', settings: { foreground: '#222222' } },
    { scope: 'string.quoted', settings: { fontStyle: 'bold' } },
    { scope: 'meta.call entity.name.function', settings: { foreground: '#333333' } },
    { scope: 'entity.name', settings: { foreground: '#444444' } },
    { scope: 'meta.a meta.b x.y', settings: { foreground: '#555555' } },
    { scope: 'meta.longer.selector x.y', settings: { foreground: '#666666' } },
  ]);

  it('lets a deeper scope override only the properties it sets', () => {
    expect(resolve('source.t string.quoted.double')).toEqual({
      foreground: '#222222',
      fontStyle: 2,
    });
    expect(resolve('source.t comment.line')).toEqual({ foreground: '#111111', fontStyle: 1 });
  });

  it('needs the parent scopes of a selector to be present', () => {
    expect(resolve('source.t entity.name.function').foreground).toBe('#444444');
    expect(resolve('source.t meta.call entity.name.function').foreground).toBe('#333333');
  });

  it('prefers the parent selector with longer names when several match', () => {
    expect(resolve('source.t meta.a meta.b meta.longer.selector x.y').foreground).toBe('#666666');
  });

  it('leaves an unmatched scope without a color', () => {
    expect(resolve('source.t punctuation.other')).toEqual({ foreground: undefined, fontStyle: 0 });
  });
});

describe('generated themes', () => {
  it('flattens alpha colors over the background', () => {
    expect(opaque('#FFFFFF80', '#000000')).toBe('808080');
    expect(opaque('#123456', '#FFFFFF')).toBe('123456');
  });

  it.each(WOODFISH_PALETTES.map((palette) => [palette.slug, palette]))(
    '%s renders valid files',
    (_, palette) => {
      const files = render(palette);
      const slug = `woodfish-${palette.slug}`;
      const xml = files[`themes/${slug}.xml`];
      expect(xml).toContain(`<scheme name="${palette.label}"`);
      expect(xml).toContain(`parent_scheme="${palette.type === 'dark' ? 'Darcula' : 'Default'}"`);
      const attributes = attributesOf(xml);
      for (const { key } of scopeMap) expect(attributes[key]?.FOREGROUND).toMatch(HEX6);
      for (const [, hex] of xml.matchAll(/value="([0-9A-Fa-f]{6})"/g)) expect(hex).toMatch(HEX6);
      const ui = JSON.parse(files[`themes/${slug}.theme.json`]);
      expect(ui).toMatchObject({
        name: palette.label,
        dark: palette.type === 'dark',
        editorScheme: `/themes/${slug}.xml`,
      });
      expect(files[`licenses/${palette.slug}.txt`].length).toBeGreaterThan(100);
    }
  );

  it('ports the editor background and foreground of the VS Code theme', () => {
    const nord = WOODFISH_PALETTES.find((p) => p.slug === 'nord');
    const text = attributesOf(render(nord)['themes/woodfish-nord.xml']).TEXT;
    expect(text).toEqual({
      FOREGROUND: opaque(nord.ui.fg, nord.ui.bg),
      BACKGROUND: opaque(nord.ui.bg, nord.ui.bg),
    });
  });

  it('draws plain code with the color VS Code gives it, even where that is not editor.foreground', () => {
    // Woodfish Dark colors the `source` scope #AFBBD2 while editor.foreground is #D0D7E4
    const dark = WOODFISH_PALETTES.find((p) => p.slug === 'dark');
    const text = attributesOf(render(dark)['themes/woodfish-dark.xml']).TEXT;
    expect(text.FOREGROUND).toBe('AFBBD2');
  });

  it('keeps the committed files, plugin.xml registrations and scheme names in step', () => {
    expect(() => main(true)).not.toThrow();
    expect(missingRegistrations()).toEqual([]);
    expect(themeIds()).toHaveLength(WOODFISH_PALETTES.length);
  });
});

describe('check', () => {
  function copyResources() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-jb-'));
    fs.cpSync(resources, dir, { recursive: true });
    return dir;
  }

  it('reports a changed, a missing and a stray file', () => {
    const dir = copyResources();
    fs.appendFileSync(path.join(dir, 'themes/woodfish-dark.xml'), '<!-- edited -->');
    fs.rmSync(path.join(dir, 'licenses/nord.txt'));
    fs.writeFileSync(path.join(dir, 'themes/woodfish-old.xml'), '');
    let message = '';
    try {
      main(true, dir);
    } catch (error) {
      message = error.message;
    }
    expect(message).toContain('themes/woodfish-dark.xml');
    expect(message).toContain('licenses/nord.txt');
    expect(message).toContain('themes/woodfish-old.xml');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('reports a theme missing from plugin.xml', () => {
    const dir = copyResources();
    const file = path.join(dir, 'META-INF/plugin.xml');
    fs.writeFileSync(
      file,
      fs.readFileSync(file, 'utf8').replace(/<themeProvider id="[^"]*nord"[^>]*>/, '')
    );
    expect(missingRegistrations(dir)).toEqual([expect.stringContaining('woodfishtheme.nord')]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
