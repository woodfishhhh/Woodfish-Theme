import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Io } from '../cli/io';
import { run } from '../cli';
import {
  listBackgrounds,
  loadDefaultBackground,
  readBackground,
  removeBackground,
  saveBackground,
} from '../codex/backgrounds';
import { WatcherBackgrounds, answerBackgroundRequest } from '../inject/watcher';
import { resolvePaths } from '../paths';
import { loadSettings } from '../store';

function png(width: number, height: number, padding = 64): Buffer {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return Buffer.concat([header, Buffer.alloc(padding, width % 251)]);
}

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
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-bg-'));
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

describe('background storage', () => {
  it('keeps one hashed copy per picture in the data folder', () => {
    const entry = saveBackground(paths, png(1920, 1080), '  我的\u0007图片  ');
    expect(entry.id).toMatch(/^[0-9a-f]{12}$/);
    expect(entry).toMatchObject({ name: '我的图片', type: 'image/png', width: 1920, height: 1080 });
    expect(fs.existsSync(path.join(paths.dataDir, 'backgrounds', `${entry.id}.png`))).toBe(true);
    saveBackground(paths, png(1920, 1080), 'again');
    expect(listBackgrounds(paths).map((item) => item.name)).toEqual(['again']);
    expect(readBackground(paths, entry.id)?.data.equals(png(1920, 1080))).toBe(true);
    expect(removeBackground(paths, entry.id)).toBe(true);
    expect(listBackgrounds(paths)).toEqual([]);
    expect(readBackground(paths, entry.id)).toBeNull();
  });

  it('validates content, size and edge before keeping anything', () => {
    expect(() => saveBackground(paths, Buffer.from('<svg/>'), 'x')).toThrow('只支持');
    expect(() => saveBackground(paths, png(4000, 3000), 'x')).toThrow('需要先缩小');
    expect(() => saveBackground(paths, Buffer.alloc(0), 'x')).toThrow('大小');
    expect(listBackgrounds(paths)).toEqual([]);
  });

  it('keeps at most 30 pictures', () => {
    for (let index = 0; index < 30; index += 1) {
      saveBackground(paths, png(100 + index, 100), `p${index}`);
    }
    expect(() => saveBackground(paths, png(999, 100), 'one more')).toThrow('最多保存 30 张');
    // Saving a picture that is already there is still fine.
    expect(saveBackground(paths, png(100, 100), 'again').name).toBe('again');
  });

  it('serves the bundled 《彩云》 as a WebP', () => {
    expect(loadDefaultBackground().subarray(8, 12).toString('ascii')).toBe('WEBP');
    expect(readBackground(paths, 'caiyun')?.type).toBe('image/webp');
  });
});

describe('background binding answers', () => {
  const store = (): WatcherBackgrounds => ({
    list: () => listBackgrounds(paths),
    get: (id) => readBackground(paths, id),
    save: (name, data) => saveBackground(paths, data, name).id,
    remove: (id) => {
      removeBackground(paths, id);
    },
  });

  it('uploads, lists, reads and removes pictures', () => {
    const upload = answerBackgroundRequest(store(), {
      type: 'upload',
      nonce: 'n-1',
      name: 'sky',
      data: png(800, 600).toString('base64'),
    });
    expect(upload?.reply.ok).toBe(true);
    const id = upload?.reply.ok ? upload.reply.id : '';
    expect(answerBackgroundRequest(store(), { type: 'list', nonce: 'n-2' })?.reply).toEqual({
      ok: true,
      entries: [{ id, name: 'sky' }],
    });
    const got = answerBackgroundRequest(store(), { type: 'get', nonce: 'n-3', id });
    expect(got?.reply).toMatchObject({ ok: true, type: 'image/png' });
    expect(answerBackgroundRequest(store(), { type: 'remove', nonce: 'n-4', id })?.reply).toEqual({
      ok: true,
    });
    expect(answerBackgroundRequest(store(), { type: 'get', nonce: 'n-5', id })?.reply.ok).toBe(
      false
    );
  });

  it('ignores malformed requests and refuses bad data', () => {
    expect(answerBackgroundRequest(store(), { type: 'list' })).toBeNull();
    expect(answerBackgroundRequest(store(), { type: 'list', nonce: '<script>' })).toBeNull();
    expect(
      answerBackgroundRequest(store(), { type: 'upload', nonce: 'a', data: '!!' })?.reply
    ).toEqual({ ok: false, error: '图片数据无效' });
    expect(
      answerBackgroundRequest(store(), { type: 'get', nonce: 'a', id: '../codex' })?.reply.ok
    ).toBe(false);
    expect(answerBackgroundRequest(store(), { type: 'eval', nonce: 'a' })?.reply.ok).toBe(false);
  });
});

/** The background effect's values as saved in its folder. */
function backgroundValues(): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(paths.effectsDir, 'background', 'params.json'), 'utf8')
  ) as Record<string, unknown>;
}

describe('woodfish codex background', () => {
  it('saves, switches, resets, clears and removes', async () => {
    const io = memoryIo();
    const context = { paths };
    const file = path.join(sandbox, 'sky.png');
    fs.writeFileSync(file, png(1280, 720));
    expect(await run(['codex', 'background', 'set', file], { io, context })).toBe(0);
    const id = loadSettings(paths).codex.backgroundImage;
    expect(id).toMatch(/^[0-9a-f]{12}$/);
    fs.rmSync(file);
    expect(readBackground(paths, id)).not.toBeNull();

    expect(await run(['codex', 'background', 'list'], { io, context })).toBe(0);
    expect(io.output.some((line) => line.startsWith(`* ${id}`))).toBe(true);

    expect(await run(['codex', 'background', 'use', 'gradient'], { io, context })).toBe(0);
    expect(loadSettings(paths).codex.backgroundImage).toBe('gradient');
    expect(await run(['codex', 'background', 'use', 'nope'], { io, context })).toBe(2);

    expect(await run(['codex', 'background', 'clear'], { io, context })).toBe(0);
    expect(backgroundValues().enabled).toBe(false);

    await run(['codex', 'background', 'use', id], { io, context });
    expect(await run(['codex', 'background', 'remove', id], { io, context })).toBe(0);
    expect(loadSettings(paths).codex.backgroundImage).toBe('caiyun');

    await run(['codex', 'settings', '--set', 'background.opacity=0.4'], { io, context });
    expect(await run(['codex', 'background', 'reset'], { io, context })).toBe(0);
    expect(loadSettings(paths).codex.backgroundImage).toBe('caiyun');
    expect(backgroundValues()).toMatchObject({ enabled: true, opacity: 0.15 });
  });

  it('refuses files that are not pictures', async () => {
    const io = memoryIo();
    const file = path.join(sandbox, 'notes.png');
    fs.writeFileSync(file, 'not a picture');
    expect(await run(['codex', 'background', 'set', file], { io, context: { paths } })).toBe(1);
    expect(io.output.join('\n')).toContain('只支持 JPG、PNG 和 WebP 图片');
  });
});
