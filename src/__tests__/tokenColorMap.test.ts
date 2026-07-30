import * as fs from 'fs';
import * as path from 'path';
import {
  buildTokenColorIndex,
  compileTokenColorSelectors,
  resolveEditorColorOverrides,
  TokenColorTheme,
} from '../services/runtime/tokenColorMap';

describe('token color selector compilation', () => {
  const extensionRoot = path.resolve(__dirname, '../..');
  const draculaTheme = require('../../themes/dracula/Woodfish Dracula.json') as TokenColorTheme;

  it('derives the current Dracula mtk classes from theme colors', () => {
    const colorIndex = buildTokenColorIndex(draculaTheme);

    expect(colorIndex.get('F8F8F2')).toBe(1);
    expect(colorIndex.get('282A36')).toBe(2);
    expect(colorIndex.get('BD93F9')).toBe(3);
    expect(colorIndex.get('50FA7B')).toBe(5);
    expect(colorIndex.get('FFB86C')).toBe(7);
    expect(colorIndex.get('F1FA8C')).toBe(8);
    expect(colorIndex.get('8BE9FD')).toBe(9);
    expect(colorIndex.get('FF79C6')).toBe(10);
  });

  it('recompiles selectors when token color order changes', () => {
    const template =
      '.__WOODFISH_TOKEN_AA0000__ { color: red; } .__WOODFISH_TOKEN_00AA00__ { color: green; }';
    const redFirst: TokenColorTheme = {
      colors: {
        'editor.foreground': '#ffffff',
        'editor.background': '#000000',
      },
      tokenColors: [
        { scope: 'red', settings: { foreground: '#aa0000' } },
        { scope: 'green', settings: { foreground: '#00aa00' } },
      ],
    };
    const greenFirst: TokenColorTheme = {
      ...redFirst,
      tokenColors: [...(redFirst.tokenColors ?? [])].reverse(),
    };

    expect(compileTokenColorSelectors(template, redFirst)).toContain('.mtk3 { color: red; }');
    expect(compileTokenColorSelectors(template, redFirst)).toContain('.mtk4 { color: green; }');
    expect(compileTokenColorSelectors(template, greenFirst)).toContain('.mtk4 { color: red; }');
    expect(compileTokenColorSelectors(template, greenFirst)).toContain('.mtk3 { color: green; }');
  });

  it('ignores extra default rules like VS Code and keeps the synthetic editor defaults first', () => {
    const colorIndex = buildTokenColorIndex({
      colors: {
        'editor.foreground': '#111111',
        'editor.background': '#222222',
      },
      tokenColors: [
        { settings: { foreground: '#aaaaaa', background: '#bbbbbb' } },
        { scope: 'accent', settings: { foreground: '#333333' } },
      ],
    });

    expect(colorIndex.get('111111')).toBe(1);
    expect(colorIndex.get('222222')).toBe(2);
    expect(colorIndex.get('333333')).toBe(3);
    expect(colorIndex.has('AAAAAA')).toBe(false);
    expect(colorIndex.has('BBBBBB')).toBe(false);
  });

  it('accounts for editor foreground overrides that shift later color ids', () => {
    const theme: TokenColorTheme = {
      colors: {
        'editor.foreground': '#111111',
        'editor.background': '#222222',
      },
      tokenColors: [
        { scope: 'default-again', settings: { foreground: '#111111' } },
        { scope: 'accent', settings: { foreground: '#333333' } },
      ],
    };
    const template = '.__WOODFISH_TOKEN_333333__ { color: accent; }';

    expect(compileTokenColorSelectors(template, theme)).toContain('.mtk3');
    expect(
      compileTokenColorSelectors(template, theme, {
        foreground: '#444444',
      })
    ).toContain('.mtk4');
  });

  it('keeps the effective editor foreground role on mtk1 when its color changes', () => {
    const theme: TokenColorTheme = {
      colors: {
        'editor.foreground': '#111111',
        'editor.background': '#222222',
      },
      tokenColors: [{ scope: 'accent', settings: { foreground: '#333333' } }],
    };
    const template =
      '.__WOODFISH_EDITOR_FOREGROUND__ { color: default; } .__WOODFISH_TOKEN_333333__ { color: accent; }';

    const compiled = compileTokenColorSelectors(template, theme, {
      foreground: '#444444',
    });

    expect(compiled).toContain('.mtk1 { color: default; }');
    expect(compiled).toContain('.mtk3 { color: accent; }');
  });

  it('resolves general and theme-scoped editor color customizations', () => {
    expect(
      resolveEditorColorOverrides(
        {
          'editor.foreground': '#123',
          'editor.background': 'not-a-color',
          '[Woodfish Dark][Woodfish Dracula]': {
            'editor.foreground': '#4567',
            'editor.background': '#282A36',
          },
        },
        'Woodfish Dracula'
      )
    ).toEqual({
      foreground: '#44556677',
      background: '#282A36',
    });

    expect(
      resolveEditorColorOverrides(
        {
          '[*Dracula]': {
            'editor.foreground': '#FF79C6FF',
          },
        },
        'Woodfish Dracula'
      )
    ).toEqual({
      foreground: '#FF79C6',
    });

    expect(
      resolveEditorColorOverrides(
        {
          'editor.foreground': '#123456',
          'editor.background': '#654321',
          '[Woodfish Dracula]': {
            'editor.foreground': 'default',
            'editor.background': 'default',
          },
        },
        'Woodfish Dracula'
      )
    ).toEqual({
      foreground: '#BBBBBB',
      background: '#1E1E1E',
    });
  });

  it('fails closed when a gradient color is absent from the theme', () => {
    expect(() =>
      compileTokenColorSelectors('.__WOODFISH_TOKEN_FF0000__ {}', {
        colors: {
          'editor.foreground': '#ffffff',
          'editor.background': '#000000',
        },
        tokenColors: [],
      })
    ).toThrow('Runtime token colors are missing from the active theme: #FF0000');
  });

  it('keeps source templates color-driven instead of number-driven', () => {
    for (const directory of ['bearded', 'dracula']) {
      for (const fileName of ['syntax-highlighting.css', 'glow-effects.css']) {
        const template = fs.readFileSync(
          path.join(extensionRoot, 'themes', directory, fileName),
          'utf8'
        );

        expect(template).toContain('__WOODFISH_TOKEN_');
        expect(template).not.toMatch(/\.mtk\d+\b/);
      }
    }

    const sharedGlowTemplate = fs.readFileSync(
      path.join(extensionRoot, 'themes', 'shared', 'glow-effects.css'),
      'utf8'
    );
    expect(sharedGlowTemplate).not.toContain('__WOODFISH_TOKEN_');
    expect(sharedGlowTemplate).not.toMatch(/\.mtk\d+\b/);
  });
});
