import * as fs from 'fs';
import * as path from 'path';

describe('theme registry resolution', () => {
  it('resolves built-in Woodfish theme labels to their runtime slugs', () => {
    const { resolveWoodfishTheme } = require('../services/runtime/themeRegistry') as {
      resolveWoodfishTheme: (
        themeName: string
      ) => { slug: string; directory: string; themeFile: string } | undefined;
    };

    expect(resolveWoodfishTheme('Woodfish Dark')).toMatchObject({
      slug: 'bearded',
      directory: 'bearded',
      themeFile: 'Woodfish Dark.json',
    });
    expect(resolveWoodfishTheme('Woodfish Dracula')).toMatchObject({
      slug: 'dracula',
      directory: 'dracula',
      themeFile: 'Woodfish Dracula.json',
    });
    expect(resolveWoodfishTheme('One Dark Pro')).toBeUndefined();
  });

  it('keeps package theme contributions aligned with the built-in registry', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
    ) as {
      contributes: {
        themes: Array<{ label: string; path: string }>;
      };
    };

    expect(packageJson.contributes.themes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Woodfish Dark',
          path: './themes/bearded/Woodfish Dark.json',
        }),
        expect.objectContaining({
          label: 'Woodfish Dracula',
          path: './themes/dracula/Woodfish Dracula.json',
        }),
      ])
    );
  });
});
