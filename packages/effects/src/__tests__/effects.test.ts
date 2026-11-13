import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';
import {
  EFFECTS_LEDGER_FILE,
  buildEffectsModule,
  buildEffectsScript,
  builtinEffectFiles,
  readUserEffects,
  resetEffectValues,
  restoreBuiltinEffect,
  seedEffectValues,
  syncUserEffects,
  writeEffectValues,
} from '../index';

const MANIFEST = JSON.stringify({
  name: '测试',
  version: 1,
  hosts: ['codex'],
  params: { size: { type: 'number', default: 2, min: 1, max: 9 } },
});
const SCRIPT = 'module.exports = function (ctx) { return {}; };\n';

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-effects-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(relative: string, content: string): void {
  const file = path.join(dir, ...relative.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function read(relative: string): string {
  return fs.readFileSync(path.join(dir, ...relative.split('/')), 'utf8');
}

describe('syncUserEffects', () => {
  const v1 = { 'demo/effect.json': MANIFEST, 'demo/effect.js': SCRIPT, 'AGENTS.md': '# v1\n' };

  it('seeds a new folder and is idempotent', () => {
    expect(syncUserEffects(dir, v1).created.sort()).toEqual([
      'AGENTS.md',
      'demo/effect.js',
      'demo/effect.json',
    ]);
    expect(syncUserEffects(dir, v1)).toEqual({ created: [], updated: [], kept: [] });
    expect(fs.existsSync(path.join(dir, EFFECTS_LEDGER_FILE))).toBe(true);
  });

  it('upgrades files the user never touched and keeps the ones they edited', () => {
    syncUserEffects(dir, v1);
    write('demo/effect.js', '// mine\n' + SCRIPT);
    const manifest2 = MANIFEST.replace('"version":1', '"version":2');
    const v2 = {
      'demo/effect.json': manifest2,
      'demo/effect.js': SCRIPT + '// v2\n',
      'AGENTS.md': '# v2\n',
    };
    const result = syncUserEffects(dir, v2);
    expect(result.updated.sort()).toEqual(['AGENTS.md', 'demo/effect.json']);
    expect(result.kept).toEqual(['demo/effect.js']);
    expect(read('demo/effect.js')).toContain('// mine');
    expect(read('AGENTS.md')).toBe('# v2\n');
  });

  it('does not bring back files the user deleted, and never downgrades', () => {
    const manifest2 = MANIFEST.replace('"version":1', '"version":2');
    syncUserEffects(dir, { ...v1, 'demo/effect.json': manifest2 });
    fs.rmSync(path.join(dir, 'AGENTS.md'));
    const older = syncUserEffects(dir, v1);
    expect(older.created).toEqual([]);
    expect(older.updated).toEqual([]);
    expect(read('demo/effect.json')).toBe(manifest2);
    expect(fs.existsSync(path.join(dir, 'AGENTS.md'))).toBe(false);
  });

  it('restores one shipped effect and backs up edits', () => {
    syncUserEffects(dir, v1);
    write('demo/effect.js', 'broken(');
    expect(restoreBuiltinEffect(dir, 'demo', v1).sort()).toEqual([
      'demo/effect.js',
      'demo/effect.json',
    ]);
    expect(read('demo/effect.js')).toBe(SCRIPT);
    expect(read('demo/effect.js.bak')).toBe('broken(');
    expect(() => restoreBuiltinEffect(dir, 'nope', v1)).toThrow(/没有自带/);
  });
});

describe('readUserEffects', () => {
  it('loads values, reports broken folders with a reason and skips non-effects', () => {
    write('good/effect.json', MANIFEST);
    write('good/effect.js', SCRIPT);
    write('good/params.json', JSON.stringify({ size: 50, enabled: false }));
    write('syntax/effect.json', MANIFEST);
    write('syntax/effect.js', 'module.exports = function (ctx) {\n  const a = ;\n};\n');
    write('json/effect.json', '{ nope');
    write('values/effect.json', MANIFEST);
    write('values/effect.js', SCRIPT);
    write('values/params.json', '{ "size": ');
    write('nothing/effect.json', MANIFEST);
    write('Not-An-Id/effect.json', MANIFEST);
    write('loose/readme.txt', 'not an effect');
    const effects = readUserEffects(dir);
    expect(effects.map((effect) => effect.id)).toEqual([
      'good',
      'json',
      'nothing',
      'syntax',
      'values',
    ]);
    const byId = Object.fromEntries(effects.map((effect) => [effect.id, effect]));
    expect(byId.good.values).toEqual({ enabled: false, size: 9 });
    expect(byId.good.error).toBeUndefined();
    expect(byId.syntax.error).toMatch(/effect\.js 第 2 行有语法错误/);
    expect(byId.json.error).toMatch(/effect\.json 不是有效的 JSON/);
    expect(byId.values.error).toMatch(/params\.json 不是有效的 JSON/);
    expect(byId.nothing.error).toMatch(/缺少 effect\.js/);
  });

  it('changes the hash with the code but not with the values', () => {
    write('a/effect.json', MANIFEST);
    write('a/effect.js', SCRIPT);
    const first = readUserEffects(dir)[0].hash;
    writeEffectValues(dir, 'a', { size: 3 });
    expect(readUserEffects(dir)[0].hash).toBe(first);
    write('a/effect.js', SCRIPT + '\n');
    expect(readUserEffects(dir)[0].hash).not.toBe(first);
  });
});

describe('effect values', () => {
  beforeEach(() => {
    write('a/effect.json', MANIFEST);
    write('a/effect.js', SCRIPT);
  });

  it('patches, resets and seeds params.json', () => {
    expect(writeEffectValues(dir, 'a', { size: 100, unknown: 1 })).toEqual({
      enabled: true,
      size: 9,
    });
    expect(JSON.parse(read('a/params.json'))).toEqual({ enabled: true, size: 9 });
    expect(resetEffectValues(dir, 'a')).toEqual({ enabled: true, size: 2 });
    expect(seedEffectValues(dir, 'a', { size: 5 })).toBe(false);
    fs.rmSync(path.join(dir, 'a', 'params.json'));
    expect(seedEffectValues(dir, 'a', { size: 5 })).toBe(true);
    expect(JSON.parse(read('a/params.json'))).toEqual({ enabled: true, size: 5 });
    expect(() => writeEffectValues(dir, '../x', {})).toThrow(/效果名无效/);
    expect(() => writeEffectValues(dir, 'missing', {})).toThrow(/没有名为 missing/);
  });
});

describe('page payload', () => {
  it('builds a script whose factories run and whose data matches the folders', () => {
    write('a/effect.json', MANIFEST);
    write('a/effect.js', 'module.exports = function (ctx) { return { size: ctx.params.size }; };');
    write('b/effect.json', '{ broken');
    write('c/effect.json', JSON.stringify({ name: 'VS Code 专用', hosts: ['vscode'], params: {} }));
    write('c/effect.js', SCRIPT);
    const effects = readUserEffects(dir);
    const sandbox: Record<string, unknown> = {};
    vm.runInNewContext(buildEffectsScript(effects, 'codex', '__fx'), { globalThis: sandbox });
    const list = sandbox.__fx as Array<{
      id: string;
      values: Record<string, unknown>;
      error?: string;
      factory?: (module: { exports: unknown }, exports: unknown) => void;
    }>;
    expect(list.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(list[1].error).toMatch(/JSON/);
    const module: { exports: unknown } = { exports: {} };
    list[0].factory?.(module, module.exports);
    expect((module.exports as (ctx: unknown) => unknown)({ params: { size: 7 } })).toEqual({
      size: 7,
    });

    const overridden = buildEffectsModule(effects, 'vscode', () => ({ enabled: false }));
    expect(overridden.startsWith('export default [')).toBe(true);
    expect(overridden).toContain('id: "c"');
    expect(overridden).toContain('values: {"enabled":false}');
    expect(overridden).not.toContain('id: "a"');
  });

  it('escapes data so it cannot end the script early', () => {
    write('a/effect.json', JSON.stringify({ name: '</script><b> ', hosts: ['codex'], params: {} }));
    write('a/effect.css', '.x { color: red }');
    const script = buildEffectsScript(readUserEffects(dir), 'codex', '__fx');
    expect(script).not.toContain('</script>');
    expect(script).not.toContain(' ');
  });
});

describe('the shipped effects', () => {
  it('all load without errors and keep their ids', () => {
    syncUserEffects(dir, builtinEffectFiles());
    const effects = readUserEffects(dir);
    expect(effects.map((effect) => [effect.id, effect.error ?? 'ok'])).toEqual(
      effects.map((effect) => [effect.id, 'ok'])
    );
    expect(effects.map((effect) => effect.id).sort()).toEqual([
      'accent',
      'background',
      'caret',
      'caret-trail',
      'code-gradient',
      'glass',
      'mouse-trail',
      'rainbow-text',
      'stream-cursor',
      'text-reveal',
      'thread-ring',
      'typing-particles',
    ]);
    expect(fs.existsSync(path.join(dir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(true);
  });
});
