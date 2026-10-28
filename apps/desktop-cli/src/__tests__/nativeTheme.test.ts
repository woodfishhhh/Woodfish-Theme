import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findCodexPalette } from '@woodfish/adapter-codex';
import {
  applyAppearance,
  applyNativeTheme,
  listNativeThemeManifests,
  readNativeThemeManifest,
  restoreNativeTheme,
} from '../codex/nativeTheme';
import { parseToml, readTomlValue } from '../codex/tomlEdit';
import { resolvePaths } from '../paths';
import { sha256 } from '../store';

const ORIGINAL = [
  'model = "gpt-6"',
  '',
  '[desktop]',
  'appearanceTheme = "system"',
  '',
  '[desktop.appearanceLightChromeTheme]',
  'accent = "#007acc"',
  'contrast = 45',
  'ink = "#000000"',
  'opaqueWindows = false',
  'surface = "#ffffff"',
  '',
  '[desktop.appearanceLightChromeTheme.fonts]',
  'ui = "Inter"',
  '',
  '[desktop.appearanceLightChromeTheme.semanticColors]',
  'diffAdded = "#008000"',
  'diffRemoved = "#ee0000"',
  'skill = "#0000ff"',
  '',
  '[desktop.appearanceDarkChromeTheme]',
  'accent = "#339cff" # mine',
  'contrast = 60',
  'ink = "#ffffff"',
  'opaqueWindows = false',
  'surface = "#181818"',
  '',
  '[desktop.appearanceDarkChromeTheme.fonts]',
  '',
  '[desktop.appearanceDarkChromeTheme.semanticColors]',
  'diffAdded = "#40c977"',
  'diffRemoved = "#fa423e"',
  'skill = "#ad7bf9"',
  '',
].join('\n');

const DARK = ['desktop', 'appearanceDarkChromeTheme'];
const LIGHT = ['desktop', 'appearanceLightChromeTheme'];

let sandbox: string;
let paths: ReturnType<typeof resolvePaths>;

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-native-'));
  paths = resolvePaths({
    WOODFISH_DATA_DIR: path.join(sandbox, 'data'),
    WOODFISH_RUNTIME_DIR: path.join(sandbox, 'run'),
    CODEX_HOME: path.join(sandbox, 'codex'),
  });
  fs.mkdirSync(paths.codexHome, { recursive: true });
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

function config(): string {
  return fs.readFileSync(paths.codexConfig, 'utf8');
}

function value(table: string[], key: string): unknown {
  return readTomlValue(parseToml(config()), table, key);
}

describe('native theme', () => {
  it('writes a dark palette with a custom accent source and restores exact bytes', () => {
    fs.writeFileSync(paths.codexConfig, ORIGINAL);
    const neon = findCodexPalette('neon');
    const result = applyNativeTheme(paths, 'neon');
    expect(result.id).toBe('dark');
    expect(value(DARK, 'accent')).toBe(neon.ui.accent.toLowerCase());
    expect(value(DARK, 'accentSource')).toBe('custom');
    expect(value(DARK, 'surface')).toBe(neon.ui.bg.toLowerCase());
    expect(value([...DARK, 'semanticColors'], 'skill')).toBe(neon.ui.accent2.toLowerCase());
    expect(value(LIGHT, 'accent')).toBe('#007acc');
    expect(config()).toContain('# mine');
    expect(readNativeThemeManifest(paths, 'dark')?.value).toBe('neon');

    expect(restoreNativeTheme(paths).restored).toEqual([{ id: 'dark', outcome: 'restored-exact' }]);
    expect(config()).toBe(ORIGINAL);
    expect(listNativeThemeManifests(paths)).toEqual([]);
    expect(restoreNativeTheme(paths).restored).toEqual([]);
  });

  it('keeps dark and light palettes side by side and undoes both byte for byte', () => {
    fs.writeFileSync(paths.codexConfig, ORIGINAL);
    applyNativeTheme(paths, 'neon');
    applyNativeTheme(paths, 'light');
    applyAppearance(paths, 'dark');
    expect(value(DARK, 'accent')).toBe(findCodexPalette('neon').ui.accent.toLowerCase());
    expect(value(LIGHT, 'accent')).toBe(findCodexPalette('light').ui.accent.toLowerCase());
    expect(value(['desktop'], 'appearanceTheme')).toBe('dark');
    expect(listNativeThemeManifests(paths).map((manifest) => manifest.id)).toEqual([
      'appearance',
      'light',
      'dark',
    ]);

    const { restored } = restoreNativeTheme(paths);
    expect(restored.map((entry) => entry.outcome)).toEqual([
      'restored-exact',
      'restored-exact',
      'restored-exact',
    ]);
    expect(config()).toBe(ORIGINAL);
  });

  it('restores a single mode and leaves the other applied', () => {
    fs.writeFileSync(paths.codexConfig, ORIGINAL);
    applyNativeTheme(paths, 'black');
    applyNativeTheme(paths, 'light');
    restoreNativeTheme(paths, ['dark']);
    expect(value(DARK, 'accent')).toBe('#339cff');
    expect(value(DARK, 'accentSource')).toBeUndefined();
    expect(value(LIGHT, 'accent')).toBe(findCodexPalette('light').ui.accent.toLowerCase());
    restoreNativeTheme(paths);
    expect(parseToml(config())).toEqual(parseToml(ORIGINAL));
  });

  it('reverts only managed keys when Codex changed the file afterwards', () => {
    fs.writeFileSync(paths.codexConfig, ORIGINAL);
    applyNativeTheme(paths, 'black');
    fs.writeFileSync(paths.codexConfig, config().replace('model = "gpt-6"', 'model = "gpt-7"'));

    expect(restoreNativeTheme(paths).restored).toEqual([{ id: 'dark', outcome: 'restored-keys' }]);
    expect(config()).toBe(ORIGINAL.replace('model = "gpt-6"', 'model = "gpt-7"'));
  });

  it('creates and later removes the theme tables when they did not exist', () => {
    fs.writeFileSync(paths.codexConfig, 'model = "gpt-6"\n');
    applyNativeTheme(paths, 'light');
    expect(value(LIGHT, 'contrast')).toBe(45);
    expect(value(LIGHT, 'fonts')).toEqual({});
    fs.appendFileSync(paths.codexConfig, '\n[extra]\nvalue = 1\n');

    restoreNativeTheme(paths);
    expect(parseToml(config())).toEqual({ model: 'gpt-6', extra: { value: 1 } });
  });

  it('creates the config file when missing and deletes it on exact restore', () => {
    applyNativeTheme(paths, 'neon');
    expect(fs.existsSync(paths.codexConfig)).toBe(true);
    restoreNativeTheme(paths);
    expect(fs.existsSync(paths.codexConfig)).toBe(false);
  });

  it('re-applying a mode first restores that mode only', () => {
    fs.writeFileSync(paths.codexConfig, ORIGINAL);
    applyNativeTheme(paths, 'neon');
    applyNativeTheme(paths, 'black');
    expect(readNativeThemeManifest(paths, 'dark')?.sha256Before).toBe(sha256(ORIGINAL));
    restoreNativeTheme(paths);
    expect(config()).toBe(ORIGINAL);
  });

  it('leaves a file it cannot parse untouched', () => {
    fs.writeFileSync(paths.codexConfig, 'broken = = 1');
    expect(() => applyNativeTheme(paths, 'neon')).toThrow('无法解析');
    expect(config()).toBe('broken = = 1');
    expect(listNativeThemeManifests(paths)).toEqual([]);
  });
});
