import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findCodexPalette } from '@woodfish/adapter-codex';
import {
  applyNativeTheme,
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

describe('native theme', () => {
  it('writes the palette into the matching chrome theme and restores exact bytes', () => {
    fs.writeFileSync(paths.codexConfig, ORIGINAL);
    const neon = findCodexPalette('neon');
    const result = applyNativeTheme(paths, 'neon');
    expect(result.mode).toBe('dark');
    const parsed = parseToml(config());
    const table = ['desktop', 'appearanceDarkChromeTheme'];
    expect(readTomlValue(parsed, table, 'accent')).toBe(neon.ui.accent.toLowerCase());
    expect(readTomlValue(parsed, table, 'surface')).toBe(neon.ui.bg.toLowerCase());
    expect(readTomlValue(parsed, table, 'accentSource')).toBe('custom');
    expect(readTomlValue(parsed, [...table, 'semanticColors'], 'skill')).toBe(
      neon.ui.accent2.toLowerCase()
    );
    expect(config()).toContain('# mine');
    expect(readTomlValue(parsed, ['desktop'], 'appearanceTheme')).toBe('system');
    expect(readNativeThemeManifest(paths)?.palette).toBe('neon');

    expect(restoreNativeTheme(paths)).toBe('restored-exact');
    expect(config()).toBe(ORIGINAL);
    expect(readNativeThemeManifest(paths)).toBeUndefined();
    expect(restoreNativeTheme(paths)).toBe('nothing-to-restore');
  });

  it('reverts only managed keys when Codex changed the file afterwards', () => {
    fs.writeFileSync(paths.codexConfig, ORIGINAL);
    applyNativeTheme(paths, 'black');
    fs.writeFileSync(paths.codexConfig, config().replace('model = "gpt-6"', 'model = "gpt-7"'));

    expect(restoreNativeTheme(paths)).toBe('restored-keys');
    expect(config()).toBe(ORIGINAL.replace('model = "gpt-6"', 'model = "gpt-7"'));
  });

  it('creates and later removes the theme tables when they did not exist', () => {
    const minimal = 'model = "gpt-6"\n';
    fs.writeFileSync(paths.codexConfig, minimal);
    applyNativeTheme(paths, 'light');
    const parsed = parseToml(config());
    const table = ['desktop', 'appearanceLightChromeTheme'];
    expect(readTomlValue(parsed, table, 'contrast')).toBe(45);
    expect(readTomlValue(parsed, table, 'fonts')).toEqual({});
    fs.appendFileSync(paths.codexConfig, '\n[extra]\nvalue = 1\n');

    expect(restoreNativeTheme(paths)).toBe('restored-keys');
    expect(parseToml(config())).toEqual({ model: 'gpt-6', extra: { value: 1 } });
  });

  it('creates the config file when missing and deletes it on exact restore', () => {
    applyNativeTheme(paths, 'neon');
    expect(fs.existsSync(paths.codexConfig)).toBe(true);
    expect(restoreNativeTheme(paths)).toBe('restored-exact');
    expect(fs.existsSync(paths.codexConfig)).toBe(false);
  });

  it('re-applying another palette first restores the previous one', () => {
    fs.writeFileSync(paths.codexConfig, ORIGINAL);
    applyNativeTheme(paths, 'neon');
    applyNativeTheme(paths, 'black');
    expect(readNativeThemeManifest(paths)?.sha256Before).toBe(sha256(ORIGINAL));
    restoreNativeTheme(paths);
    expect(config()).toBe(ORIGINAL);
  });

  it('leaves a file it cannot parse untouched', () => {
    fs.writeFileSync(paths.codexConfig, 'broken = = 1');
    expect(() => applyNativeTheme(paths, 'neon')).toThrow('无法解析');
    expect(config()).toBe('broken = = 1');
    expect(readNativeThemeManifest(paths)).toBeUndefined();
  });
});
