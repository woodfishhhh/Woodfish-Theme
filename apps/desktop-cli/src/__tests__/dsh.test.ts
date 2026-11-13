import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DEFAULT_DSH_SETTINGS, normalizeDshSettings } from '@woodfish/adapter-dsh';
import { Io } from '../cli/io';
import { run } from '../cli';
import {
  buildDshUserScript,
  defaultUserScriptFile,
  dshStateFile,
  loadDshState,
  loadDshUserScriptBundle,
  writeDshUserScript,
} from '../dsh/userScript';
import { resolvePaths } from '../paths';

function memoryIo(): Io & { output: string[] } {
  const output: string[] = [];
  return {
    output,
    interactive: false,
    out: (message) => output.push(message),
    err: (message) => output.push(`ERR ${message}`),
    ask: async () => '',
  };
}

let sandbox: string;
let paths: ReturnType<typeof resolvePaths>;

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-dsh-'));
  paths = resolvePaths({
    WOODFISH_DATA_DIR: path.join(sandbox, 'data'),
    WOODFISH_RUNTIME_DIR: path.join(sandbox, 'run'),
  });
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('dsh user script', () => {
  const bundle = loadDshUserScriptBundle();

  it('keeps the metadata block first and bakes the settings in right after it', () => {
    const script = buildDshUserScript(normalizeDshSettings({ palette: { dark: null } }), bundle);
    const lines = script.split('\n');
    const end = lines.indexOf('// ==/UserScript==');
    expect(lines[0]).toBe('// ==UserScript==');
    expect(lines.slice(0, end).every((line) => line.startsWith('// '))).toBe(true);
    expect(lines[end + 1]).toMatch(/^globalThis\["__woodfishDshUserScriptConfig"\] = \{/);
    expect(lines[end + 1]).toContain('"dark":null');
    expect(script.endsWith(bundle.slice(bundle.indexOf('// ==/UserScript==') + 19))).toBe(true);
  });

  it('refuses a bundle without a metadata block and files managers would not install', () => {
    expect(() => buildDshUserScript(DEFAULT_DSH_SETTINGS, '(() => {})();')).toThrow(/元数据/);
    expect(() =>
      writeDshUserScript(path.join(sandbox, 'woodfish.js'), DEFAULT_DSH_SETTINGS, bundle)
    ).toThrow(/\.user\.js/);
  });
});

describe('woodfish dsh', () => {
  it('writes the user script with --set, remembers the settings and resets them', async () => {
    const io = memoryIo();
    const out = path.join(sandbox, 'custom', 'mine.user.js');
    expect(
      await run(
        [
          'dsh',
          'userscript',
          '--out',
          out,
          '--set',
          'palette.dark=neon',
          '--set',
          'glass.blur=999',
        ],
        { io, context: { paths } }
      )
    ).toBe(0);
    expect(fs.readFileSync(out, 'utf8')).toContain('"dark":"neon"');
    const state = loadDshState(paths);
    expect(state.dsh.palette.dark).toBe('neon');
    expect(state.dsh.glass.blur).toBe(60);
    expect(state.userScriptFile).toBe(out);

    expect(await run(['dsh', 'userscript'], { io, context: { paths } })).toBe(0);
    expect(fs.readFileSync(defaultUserScriptFile(paths), 'utf8')).toContain('"dark":"neon"');

    expect(await run(['dsh', 'userscript', '--reset'], { io, context: { paths } })).toBe(0);
    expect(loadDshState(paths).dsh).toEqual(DEFAULT_DSH_SETTINGS);
  });

  it('uninstall removes every file it generated and nothing else', async () => {
    const io = memoryIo();
    const out = path.join(sandbox, 'elsewhere', 'mine.user.js');
    const unrelated = path.join(sandbox, 'data', 'codex.json');
    fs.mkdirSync(path.dirname(unrelated), { recursive: true });
    fs.writeFileSync(unrelated, '{}');
    await run(['dsh', 'userscript'], { io, context: { paths } });
    await run(['dsh', 'userscript', '--out', out], { io, context: { paths } });

    expect(await run(['dsh', 'uninstall'], { io, context: { paths } })).toBe(0);
    expect(fs.existsSync(out)).toBe(false);
    expect(fs.existsSync(defaultUserScriptFile(paths))).toBe(false);
    expect(fs.existsSync(dshStateFile(paths))).toBe(false);
    expect(fs.existsSync(unrelated)).toBe(true);

    expect(await run(['dsh', 'uninstall'], { io, context: { paths } })).toBe(0);
    expect(io.output.join('\n')).toContain('没有找到');
  });

  it('rejects unknown dsh commands and bad output names', async () => {
    const io = memoryIo();
    expect(await run(['dsh', 'nope'], { io, context: { paths } })).toBe(2);
    expect(
      await run(['dsh', 'userscript', '--out', path.join(sandbox, 'x.js')], {
        io,
        context: { paths },
      })
    ).toBe(1);
  });
});
