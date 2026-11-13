import * as fs from 'fs';
import * as path from 'path';
import { listWoodfishThemes } from '../services/runtime/themeRegistry';

const root = path.resolve(__dirname, '../..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const generator = require(path.join(root, 'scripts', 'generate-themes.js')) as {
  PALETTES: Array<{
    slug: string;
    label: string;
    type: string;
    ui: { bg: string };
    tokens: Record<string, string>;
  }>;
  validate: (palette: unknown) => string[];
  buildTheme: (palette: unknown) => unknown;
};

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')) as {
  contributes: { themes: Array<{ label: string; uiTheme: string; path: string }> };
};

describe('bundled Woodfish themes', () => {
  it('registers every bundled theme in package.json and the runtime registry', () => {
    const contributed = packageJson.contributes.themes.map((theme) => theme.label).sort();
    const registered = listWoodfishThemes()
      .map((theme) => theme.label)
      .sort();
    expect(contributed).toEqual(registered);
    for (const theme of packageJson.contributes.themes) {
      expect(fs.existsSync(path.join(root, theme.path))).toBe(true);
    }
    expect(
      packageJson.contributes.themes.find((theme) => theme.label === 'Woodfish Light')?.uiTheme
    ).toBe('vs');
  });

  it.each(['light', 'black', 'neon'])('keeps generated %s theme files in sync', (slug) => {
    const palette = generator.PALETTES.find((entry) => entry.slug === slug);
    expect(palette).toBeDefined();
    expect(generator.validate(palette)).toEqual([]);
    const file = path.join(root, 'themes', slug, `${palette?.label}.json`);
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual(generator.buildTheme(palette));
    const meta = JSON.parse(
      fs.readFileSync(path.join(root, 'themes', slug, 'theme.meta.json'), 'utf-8')
    );
    expect(meta).toMatchObject({ label: palette?.label, slug });
    expect(meta.runtime.cursorDefaults.gradientStops.length).toBeGreaterThanOrEqual(2);
  });

  it('ships every bundled upstream theme unmodified with its license and accents', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseJsonc } = require(path.join(root, 'scripts', 'lib', 'jsonc.js')) as {
      parseJsonc: (text: string) => { colors?: object; tokenColors?: unknown[] };
    };
    expect(parseJsonc('{"url": "a//b", // note\n /* x */ "list": [1, 2,],}')).toEqual({
      url: 'a//b',
      list: [1, 2],
    });
    const upstream = listWoodfishThemes().filter((theme) =>
      fs.existsSync(path.join(root, 'themes', theme.directory, 'LICENSE.txt'))
    );
    expect(upstream.length).toBeGreaterThanOrEqual(12);
    for (const theme of upstream) {
      const folder = path.join(root, 'themes', theme.directory);
      const parsed = parseJsonc(fs.readFileSync(path.join(folder, `${theme.label}.json`), 'utf-8'));
      expect(parsed.colors).toBeDefined();
      expect(parsed.tokenColors?.length).toBeGreaterThan(0);
      expect(fs.readFileSync(path.join(folder, 'NOTICE.md'), 'utf-8')).toMatch(
        /License: (MIT|GPL)/
      );
      const meta = JSON.parse(fs.readFileSync(path.join(folder, 'theme.meta.json'), 'utf-8'));
      expect(meta).toMatchObject({ label: theme.label, slug: theme.slug });
    }
  });

  it('separates keywords from variables and functions in every generated palette (issue #6)', () => {
    for (const palette of generator.PALETTES) {
      const { keyword, variable, function: fn } = palette.tokens;
      expect(new Set([keyword, variable, fn]).size).toBe(3);
    }
  });
});
