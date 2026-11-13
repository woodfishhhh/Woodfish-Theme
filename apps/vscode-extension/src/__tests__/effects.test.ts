jest.mock('vscode', () => ({}), { virtual: true });

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { builtinEffectFiles } from '@woodfish/effects';
import { normalizeEffectManifest } from '@woodfish/theme-core';
import {
  VSCODE_EFFECT_SECTIONS,
  vscodeEffectValues,
  writeEffectsPayload,
} from '../services/effects';

interface SettingSchema {
  type: string;
  default: unknown;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  format?: string;
}

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8')
) as {
  contributes: { configuration: Array<{ properties: Record<string, SettingSchema> }> };
};
const settings: Record<string, SettingSchema> = Object.assign(
  {},
  ...packageJson.contributes.configuration.map((section) => section.properties)
);
const files = builtinEffectFiles();

describe('VS Code effect settings', () => {
  it.each(Object.entries(VSCODE_EFFECT_SECTIONS))(
    '%s: every parameter has a VS Code setting with the same name, default and range',
    (id, section) => {
      const manifest = normalizeEffectManifest(JSON.parse(files[`${id}/effect.json`]));
      expect(manifest.hosts).toContain('vscode');
      expect(settings[`woodfishTheme.${section}.enabled`]).toMatchObject({
        type: 'boolean',
        default: false,
      });
      const keys = Object.keys(settings).filter((key) =>
        key.startsWith(`woodfishTheme.${section}.`)
      );
      expect(keys.sort()).toEqual(
        ['enabled', ...Object.keys(manifest.params)]
          .map((key) => `woodfishTheme.${section}.${key}`)
          .sort()
      );
      for (const [key, spec] of Object.entries(manifest.params)) {
        const setting = settings[`woodfishTheme.${section}.${key}`];
        expect({ key, value: setting.default }).toEqual({ key, value: spec.default });
        if (spec.type === 'number') {
          expect({ key, min: setting.minimum, max: setting.maximum }).toEqual({
            key,
            min: spec.min,
            max: spec.max,
          });
        } else if (spec.type === 'select') {
          expect(setting.enum).toEqual(spec.options?.map((option) => option.value));
        } else if (spec.type === 'color') {
          expect(setting.format).toBe('color-hex');
        }
      }
    }
  );

  it('reads VS Code settings for Woodfish effects and params.json for the rest', () => {
    const manifest = normalizeEffectManifest(JSON.parse(files['mouse-trail/effect.json']));
    const read = (key: string): unknown =>
      ({ 'mouseTrail.enabled': true, 'mouseTrail.length': 30 })[key];
    expect(vscodeEffectValues({ id: 'mouse-trail', manifest, values: null }, read)).toMatchObject({
      enabled: true,
      length: 30,
      color: undefined,
    });
    const own = { enabled: true, size: 3 };
    expect(vscodeEffectValues({ id: 'my-sparkles', manifest, values: own }, read)).toBe(own);
  });
});

describe('writeEffectsPayload', () => {
  it('writes the module and version, and only when something changed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-vscode-effects-'));
    try {
      expect(writeEffectsPayload(dir, 'export default [];\n', 0)).toBe(true);
      expect(writeEffectsPayload(dir, 'export default [];\n', 0)).toBe(false);
      expect(writeEffectsPayload(dir, 'export default [];\n', 1)).toBe(true);
      const version = JSON.parse(fs.readFileSync(path.join(dir, 'effects.json'), 'utf8')) as {
        hash: string;
        reload: number;
      };
      expect(version.reload).toBe(1);
      expect(version.hash).toMatch(/^[0-9a-f]{16}$/);
      expect(fs.readFileSync(path.join(dir, 'effects.mjs'), 'utf8')).toBe('export default [];\n');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
