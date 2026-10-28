import * as fs from 'fs';
import * as path from 'path';
import {
  CURSOR_RANGES,
  DEFAULT_CURSOR,
  DEFAULT_GLASS,
  DEFAULT_GLOW,
  DEFAULT_NATIVE_WINDOW,
  DEFAULT_TEXT_GRADIENT,
  GLASS_MODES,
  GLASS_RANGES,
  GLOW_RANGES,
  NATIVE_MAC_VIBRANCY,
  NATIVE_WINDOWS_MATERIALS,
  NATIVE_WINDOW_RANGES,
  NumericRange,
  TEXT_GRADIENT_RANGES,
} from '@woodfish/theme-core';
import { DEFAULT_RUNTIME_SETTINGS } from '../types/features';

type SettingSchema = {
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: string[];
};

const properties = (
  JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')) as {
    contributes: { configuration: { properties: Record<string, SettingSchema> } };
  }
).contributes.configuration.properties;

function setting(key: string): SettingSchema {
  const schema = properties[`woodfishTheme.${key}`];
  if (!schema) {
    throw new Error(`missing setting woodfishTheme.${key}`);
  }
  return schema;
}

const NUMERIC_SETTINGS: Array<[string, NumericRange, unknown]> = [
  ['overlay.hueShift', TEXT_GRADIENT_RANGES.hueShift, DEFAULT_TEXT_GRADIENT.hueShift],
  [
    'overlay.lightnessDelta',
    TEXT_GRADIENT_RANGES.lightnessDelta,
    DEFAULT_TEXT_GRADIENT.lightnessDelta,
  ],
  [
    'overlay.neutralChroma',
    TEXT_GRADIENT_RANGES.neutralChroma,
    DEFAULT_TEXT_GRADIENT.neutralChroma,
  ],
  ['overlay.angle', TEXT_GRADIENT_RANGES.angle, DEFAULT_TEXT_GRADIENT.angle],
  ['glow.intensity', GLOW_RANGES.intensity, DEFAULT_GLOW.intensity],
  ['cursor.animationDuration', CURSOR_RANGES.animationDuration, DEFAULT_CURSOR.animationDuration],
  ['cursor.borderRadius', CURSOR_RANGES.borderRadius, DEFAULT_CURSOR.borderRadius],
  ['cursor.glowBlur', CURSOR_RANGES.glowBlur, DEFAULT_CURSOR.glowBlur],
  ['cursor.glowOpacity', CURSOR_RANGES.glowOpacity, DEFAULT_CURSOR.glowOpacity],
  ['glass.blur', GLASS_RANGES.blur, DEFAULT_GLASS.blur],
  ['glass.saturate', GLASS_RANGES.saturate, DEFAULT_GLASS.saturate],
  ['glass.opacity', GLASS_RANGES.opacity, DEFAULT_GLASS.opacity],
  ['glass.noise', GLASS_RANGES.noise, DEFAULT_GLASS.noise],
  ['glass.borderRadius', GLASS_RANGES.borderRadius, DEFAULT_GLASS.borderRadius],
  ['glass.nativeWindow.opacity', NATIVE_WINDOW_RANGES.opacity, DEFAULT_NATIVE_WINDOW.opacity],
];

describe('settings schema follows the shared effect parameters', () => {
  it.each(NUMERIC_SETTINGS)(
    'woodfishTheme.%s uses the core range and default',
    (key, range, value) => {
      const schema = setting(key);
      expect({ minimum: schema.minimum, maximum: schema.maximum }).toEqual(range);
      expect(schema.default).toBe(value);
    }
  );

  it('declares the core enum values and defaults', () => {
    expect(setting('glass.mode').enum).toEqual([...GLASS_MODES]);
    expect(setting('glass.mode').default).toBe(DEFAULT_GLASS.mode);
    expect(setting('glass.nativeWindow.windowsMaterial').enum).toEqual([
      ...NATIVE_WINDOWS_MATERIALS,
    ]);
    expect(setting('glass.nativeWindow.macVibrancy').enum).toEqual([...NATIVE_MAC_VIBRANCY]);
    expect(setting('cursor.gradientStops').default).toEqual([...DEFAULT_CURSOR.gradientStops]);
  });

  it('builds the extension defaults from the shared core without changing them', () => {
    expect(DEFAULT_RUNTIME_SETTINGS.overlay).toEqual({ enabled: true, ...DEFAULT_TEXT_GRADIENT });
    expect(DEFAULT_RUNTIME_SETTINGS.cursor.gradientStops).toEqual([
      ...DEFAULT_CURSOR.gradientStops,
    ]);
    expect(DEFAULT_RUNTIME_SETTINGS.cursor.gradientStops).not.toBe(DEFAULT_CURSOR.gradientStops);
  });
});
