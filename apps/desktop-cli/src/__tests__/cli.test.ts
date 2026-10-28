import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse } from 'smol-toml';
import { mergeSettings, parseArgs, parseSetting } from '../cli/args';
import { RISK_TEXT, RISK_TEXT_SHA256 } from '../cli/consent';
import { Io } from '../cli/io';
import { HELP, run } from '../cli';
import {
  USERSCRIPT_KEY,
  buildUserScript,
  installUserScript,
  uninstallUserScript,
} from '../codex/userScript';
import { USERSCRIPT_CONFIG_KEY, buildInjectionScript, toScriptLiteral } from '../inject/payload';
import { resolvePaths } from '../paths';
import { CodexInstallation, CodexPlatform, CodexRuntimeState } from '../platform';
import { loadSettings, sha256 } from '../store';
import { normalizeCodexSettings } from '@woodfish/adapter-codex';

function memoryIo(answers: string[] = [], interactive = false): Io & { output: string[] } {
  const output: string[] = [];
  return {
    output,
    interactive,
    out: (message) => output.push(message),
    err: (message) => output.push(`ERR ${message}`),
    ask: async () => answers.shift() ?? '',
  };
}

let sandbox: string;
let paths: ReturnType<typeof resolvePaths>;

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-cli-'));
  paths = resolvePaths({
    WOODFISH_DATA_DIR: path.join(sandbox, 'data'),
    WOODFISH_RUNTIME_DIR: path.join(sandbox, 'run'),
    CODEX_HOME: path.join(sandbox, 'codex'),
    WOODFISH_CODEX_PLUS_DIR: path.join(sandbox, 'Codex++'),
  });
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('argument parsing', () => {
  it('parses flags, values and repeated --set', () => {
    const args = parseArgs(
      ['codex', 'settings', '--set', 'a.b=1', '--set=c=true', '--palette', 'neon', '--yes'],
      new Set(['palette', 'set'])
    );
    expect(args.positionals).toEqual(['codex', 'settings']);
    expect(args.sets).toEqual(['a.b=1', 'c=true']);
    expect(args.flags.get('palette')).toBe('neon');
    expect(args.flags.get('yes')).toBe(true);
    expect(() => parseArgs(['--palette'], new Set(['palette']))).toThrow('需要一个值');
  });

  it('turns dotted assignments into nested patches with JSON values', () => {
    expect(parseSetting('glass.blur=24')).toEqual({ glass: { blur: 24 } });
    expect(parseSetting('palette.dark=neon')).toEqual({ palette: { dark: 'neon' } });
    expect(parseSetting('caret.gradientStops=["#fff","#000"]')).toEqual({
      caret: { gradientStops: ['#fff', '#000'] },
    });
    expect(() => parseSetting('__proto__.x=1')).toThrow('设置名无效');
    expect(() => parseSetting('novalue')).toThrow('key=value');
    expect(mergeSettings({ a: { b: 1, c: 2 } }, { a: { b: 3 } })).toEqual({ a: { b: 3, c: 2 } });
  });
});

describe('payloads', () => {
  it('escapes settings so they cannot break out of the script', () => {
    expect(toScriptLiteral({ x: '</script>\u2028' })).toBe('{"x":"\\u003c/script>\\u2028"}');
    const script = buildInjectionScript(
      normalizeCodexSettings({ customCss: ['a{}'] }),
      'BUNDLE();'
    );
    expect(script.startsWith('globalThis["__woodfishCodexConfig"] = {')).toBe(true);
    expect(script).toContain('\nBUNDLE();\n');
  });

  it('builds a Codex++ user script with a header and baked-in settings', () => {
    const script = buildUserScript(
      normalizeCodexSettings({ palette: { dark: 'neon' } }),
      'BUNDLE();'
    );
    expect(script.startsWith('/* @codex-plus-script')).toBe(true);
    expect(script).toContain(`globalThis[${JSON.stringify(USERSCRIPT_CONFIG_KEY)}] =`);
    expect(script).toContain('"dark":"neon"');
  });

  it('records consent against the exact risk text', () => {
    expect(RISK_TEXT).toContain('127.0.0.1');
    expect(RISK_TEXT_SHA256).toBe(sha256(RISK_TEXT));
  });
});

describe('Codex++ user script install', () => {
  it('merges its entry into user_scripts.json and removes only its own entry', () => {
    fs.mkdirSync(paths.codexPlusDir, { recursive: true });
    const config = path.join(paths.codexPlusDir, 'user_scripts.json');
    fs.writeFileSync(
      config,
      JSON.stringify({ enabled: false, scripts: { 'user:other.js': true }, market: { a: 1 } })
    );
    installUserScript(paths, normalizeCodexSettings(), 'BUNDLE();');
    let json = JSON.parse(fs.readFileSync(config, 'utf8'));
    expect(json).toEqual({
      enabled: false,
      scripts: { 'user:other.js': true, [USERSCRIPT_KEY]: true },
      market: { a: 1 },
    });
    expect(fs.existsSync(path.join(paths.codexPlusDir, 'user_scripts', 'woodfish-codex.js'))).toBe(
      true
    );

    expect(uninstallUserScript(paths)).toBe(true);
    json = JSON.parse(fs.readFileSync(config, 'utf8'));
    expect(json.scripts).toEqual({ 'user:other.js': true });
    expect(uninstallUserScript(paths)).toBe(false);
  });
});

function fakePlatform(overrides: Partial<CodexPlatform> = {}): CodexPlatform & { calls: string[] } {
  const calls: string[] = [];
  const installation: CodexInstallation = {
    name: 'OpenAI.Codex',
    familyName: 'OpenAI.Codex_test',
    version: '26.1013.3656.0',
    installLocation: 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_test',
    executable: 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_test\\app\\ChatGPT.exe',
    appId: 'App',
  };
  const stopped: CodexRuntimeState = { main: null, processCount: 0, debugPort: null };
  return {
    calls,
    name: 'windows',
    discover: () => installation,
    inspect: () => stopped,
    launchWithPort: () => calls.push('launchWithPort'),
    launchNormal: () => calls.push('launchNormal'),
    stop: () => calls.push('stop'),
    isElevated: () => false,
    createShortcut: () => 'C:\\link.lnk',
    ...overrides,
  };
}

describe('run', () => {
  it('prints help and rejects unknown commands with usage errors', async () => {
    const io = memoryIo();
    expect(await run([], { io })).toBe(0);
    expect(io.output.join('\n')).toBe(HELP);
    expect(await run(['nope'], { io })).toBe(2);
    expect(await run(['codex', 'theme'], { io, context: { paths } })).toBe(2);
    expect(
      await run(['codex', 'theme', 'apply', '--palette', 'solarized'], { io, context: { paths } })
    ).toBe(2);
  });

  it('applies and restores a native theme without touching the OS', async () => {
    fs.mkdirSync(paths.codexHome, { recursive: true });
    fs.writeFileSync(paths.codexConfig, 'model = "gpt-6"\n');
    const io = memoryIo();
    expect(
      await run(['codex', 'theme', 'apply', '--palette', 'neon'], { io, context: { paths } })
    ).toBe(0);
    const parsed = parse(fs.readFileSync(paths.codexConfig, 'utf8')) as {
      desktop: { appearanceDarkChromeTheme: { accent: string } };
    };
    expect(parsed.desktop.appearanceDarkChromeTheme.accent).toBe('#ff2e97');
    expect(await run(['codex', 'theme', 'restore'], { io, context: { paths } })).toBe(0);
    expect(fs.readFileSync(paths.codexConfig, 'utf8')).toBe('model = "gpt-6"\n');
  });

  it('saves settings through --set and normalizes them', async () => {
    const io = memoryIo();
    expect(
      await run(
        ['codex', 'settings', '--set', 'glass.blur=999', '--set', 'bodyText.enabled=true'],
        {
          io,
          context: { paths },
        }
      )
    ).toBe(0);
    const stored = loadSettings(paths).codex;
    expect(stored.glass.blur).toBe(60);
    expect(stored.bodyText.enabled).toBe(true);
  });

  it('requires consent before opening a port and never launches without it', async () => {
    const platform = fakePlatform();
    const io = memoryIo();
    const code = await run(['codex', 'launch'], {
      io,
      context: { paths, platform: () => platform },
    });
    expect(code).toBe(3);
    expect(platform.calls).toEqual([]);
    expect(io.output.join('\n')).toContain('风险说明');

    const declined = memoryIo(['no'], true);
    expect(
      await run(['codex', 'launch'], { io: declined, context: { paths, platform: () => platform } })
    ).toBe(3);
    expect(loadSettings(paths).consent).toBeUndefined();
  });

  it('refuses to run elevated and refuses to restart Codex without confirmation', async () => {
    fs.mkdirSync(paths.dataDir, { recursive: true });
    fs.writeFileSync(
      paths.settingsFile,
      JSON.stringify({
        version: 1,
        codex: {},
        consent: { riskTextSha256: RISK_TEXT_SHA256, acceptedAt: 'x' },
      })
    );
    const elevated = fakePlatform({ isElevated: () => true });
    const io = memoryIo();
    expect(
      await run(['codex', 'launch'], { io, context: { paths, platform: () => elevated } })
    ).toBe(1);
    expect(io.output.join('\n')).toContain('管理员');

    const running = fakePlatform({
      inspect: () => ({
        main: { pid: 1, commandLine: 'ChatGPT.exe' },
        processCount: 3,
        debugPort: null,
      }),
    });
    const quiet = memoryIo();
    expect(
      await run(['codex', 'launch'], { io: quiet, context: { paths, platform: () => running } })
    ).toBe(1);
    expect(running.calls).toEqual([]);
    expect(quiet.output.join('\n')).toContain('已取消');
  });

  it('creates the shortcut only after consent', async () => {
    const platform = fakePlatform();
    const io = memoryIo();
    expect(
      await run(['codex', 'shortcut'], { io, context: { paths, platform: () => platform } })
    ).toBe(3);
  });
});
