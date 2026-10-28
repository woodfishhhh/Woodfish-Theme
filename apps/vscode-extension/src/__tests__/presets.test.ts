jest.mock(
  'vscode',
  () => ({
    workspace: { getConfiguration: jest.fn() },
    ConfigurationTarget: { Global: 1 },
  }),
  { virtual: true }
);

import * as fs from 'fs';
import * as path from 'path';
import { BUILT_IN_PRESETS, CURSOR_PALETTES, PRESET_KEYS, parseColorList } from '../config/presets';

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
) as {
  contributes: { configuration: { properties: Record<string, { type: string; enum?: string[] }> } };
};
const properties = packageJson.contributes.configuration.properties;

describe('presets', () => {
  it('only references contributed settings with values of the declared type', () => {
    for (const key of PRESET_KEYS) {
      expect(properties[`woodfishTheme.${key}`]).toBeDefined();
    }
    for (const preset of BUILT_IN_PRESETS) {
      for (const [key, value] of Object.entries(preset.values)) {
        const schema = properties[`woodfishTheme.${key}`];
        expect(schema).toBeDefined();
        if (value === null) {
          continue;
        }
        expect(schema.type).toBe(Array.isArray(value) ? 'array' : typeof value);
        if (schema.enum) {
          expect(schema.enum).toContain(value);
        }
      }
    }
  });

  it('never touches custom CSS rules', () => {
    expect(PRESET_KEYS.some((key) => key.endsWith('customRules'))).toBe(false);
  });

  it('parses comma separated colors without splitting functional notation', () => {
    expect(parseColorList('#ff79c6, rgb(139, 233, 253)，gold')).toEqual([
      '#ff79c6',
      'rgb(139, 233, 253)',
      'gold',
    ]);
    expect(parseColorList('#fff')).toBeNull();
    expect(parseColorList('#fff, url(x)')).toBeNull();
  });

  it('ships palettes with at least two stops', () => {
    for (const palette of CURSOR_PALETTES) {
      if (palette.stops) {
        expect(palette.stops.length).toBeGreaterThanOrEqual(2);
        expect(parseColorList(palette.stops.join(','))).toEqual(palette.stops);
      }
    }
  });
});
