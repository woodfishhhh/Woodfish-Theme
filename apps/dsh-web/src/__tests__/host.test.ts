/** @jest-environment node */

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: jest.fn(actual.readFileSync),
    writeFileSync: jest.fn(actual.writeFileSync),
    unlinkSync: jest.fn(actual.unlinkSync),
  };
});

jest.mock(
  '@deepseek-ai/schemastery',
  () => ({ object: () => ({}), string: () => ({ default: () => ({ volatile: () => ({}) }) }) }),
  { virtual: true }
);

import { apply } from '../host';
import { DSH_BACKGROUNDS_API_PATH, DSH_BACKGROUNDS_WRITE_PATH } from '../protocol';
import { spawn } from 'child_process';
import { buildSync } from 'esbuild';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BACKGROUND_IMAGE_LIMITS } from '@woodfish/theme-core';
import { DSH_PLUGIN_NAME } from '../protocol';
import { HostBackgroundStore, handleBackgroundsRequest } from '../host/backgrounds';

/** Minimal valid 1x1 PNG bytes (header + IHDR). */
function validPngBytes(extraByte = 0): Uint8Array {
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52,
    0x00,
    0x00,
    0x00,
    0x04, // width 4
    0x00,
    0x00,
    0x00,
    0x03, // height 3
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    extraByte,
  ]);
}

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-dsh-host-'));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('HostBackgroundStore and HTTP handler', () => {
  it('saves, lists, serves and removes validated images with content-hash deduplication', async () => {
    const store = new HostBackgroundStore(path.join(tempDir, 'backgrounds'));
    expect(store.list()).toEqual([]);

    const saved = store.save('sunset.png', validPngBytes(1));
    expect(saved.id).toMatch(/^[a-f0-9]{16}$/);
    expect(saved.type).toBe('image/png');
    expect(saved.width).toBe(4);
    expect(saved.height).toBe(3);

    // Re-saving identical bytes deduplicates by id instead of creating duplicates.
    const dup = store.save('sunset-renamed.png', validPngBytes(1));
    expect(dup.id).toBe(saved.id);
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].name).toBe('sunset-renamed.png');

    // Fetch handler tests (only available in Node 18+ global Response/Request).
    if (typeof Request === 'function' && typeof Response === 'function') {
      const listRes = await handleBackgroundsRequest(
        store,
        new Request('http://127.0.0.1/api/woodfish-backgrounds', { method: 'GET' })
      );
      expect(listRes.status).toBe(200);
      const listJson = (await listRes.json()) as { ok: boolean; entries: Array<{ id: string }> };
      expect(listJson.ok).toBe(true);
      expect(listJson.entries.map((entry) => entry.id)).toEqual([saved.id]);

      const imgRes = await handleBackgroundsRequest(
        store,
        new Request(`http://127.0.0.1/api/woodfish-backgrounds?id=${saved.id}`, { method: 'GET' })
      );
      expect(imgRes.status).toBe(200);
      expect(imgRes.headers.get('content-type')).toBe('image/png');

      const uploadRes = await handleBackgroundsRequest(
        store,
        new Request('http://127.0.0.1/api/woodfish-backgrounds?action=upload&name=cloud.png', {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body: new Blob([validPngBytes(2).slice().buffer]),
        })
      );
      expect(uploadRes.status).toBe(200);
      const uploaded = (await uploadRes.json()) as { ok: boolean; entry: { id: string } };
      expect(uploaded.ok).toBe(true);
      expect(store.list()).toHaveLength(2);

      const deleteRes = await handleBackgroundsRequest(
        store,
        new Request(
          `http://127.0.0.1/api/woodfish-backgrounds?action=delete&id=${uploaded.entry.id}`,
          { method: 'POST' }
        )
      );
      expect(deleteRes.status).toBe(200);
      expect(store.list()).toHaveLength(1);
    }
  });

  it('consumes JSON delete bodies before responding to repeated fetch requests', async () => {
    const store = new HostBackgroundStore(path.join(tempDir, 'backgrounds'));
    for (let index = 0; index < 3; index += 1) {
      const saved = store.save('delete-' + index, validPngBytes(20 + index));
      const response = await handleBackgroundsRequest(
        store,
        new Request('http://127.0.0.1/api/woodfish-backgrounds-write?action=delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: saved.id }),
        })
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ ok: true, removed: true });
    }
    expect(store.list()).toEqual([]);
  });

  it('rejects non-image payloads and invalid ids safely', () => {
    const store = new HostBackgroundStore(path.join(tempDir, 'backgrounds'));
    expect(() => store.save('bad.png', new Uint8Array([1, 2, 3, 4]))).toThrow(/只支持/);
    expect(store.read('../secret')).toBeNull();
    expect(store.remove('../secret')).toBe(false);
  });
});

describe('HostBackgroundStore regressions', () => {
  it('registers buffered reads and streaming writes under the authenticated connection registry', async () => {
    type Context = Parameters<typeof apply>[0];
    type Route = Parameters<NonNullable<Context['connection']>['fetch']['register']>[0];
    const routes: Route[] = [];
    const ctx: Context = {
      get: () => ({ home: tempDir }),
      inject: (_, mount) => mount(ctx),
      on: () => {},
      effect: () => {},
      connection: {
        fetch: {
          register: (route) => {
            routes.push(route);
            return async () => {};
          },
        },
      },
    };
    apply(ctx);
    expect(routes.map(({ path, methods, requestBody }) => [path, methods, requestBody])).toEqual([
      [DSH_BACKGROUNDS_API_PATH, ['GET'], 'buffered'],
      [DSH_BACKGROUNDS_WRITE_PATH, ['POST'], 'streaming'],
    ]);
    expect((await routes[0].fetch(new Request('http://test' + routes[0].path))).status).toBe(200);
    const request = new Request('http://test' + routes[1].path, {
      method: 'POST',
      headers: { 'content-length': String(BACKGROUND_IMAGE_LIMITS.maxInputBytes + 1) },
    });
    expect((await routes[1].fetch(request)).status).toBe(413);
  });

  it('rejects a request whose declared content length exceeds the input limit', async () => {
    const store = new HostBackgroundStore(path.join(tempDir, 'backgrounds'));
    const request = new Request('http://127.0.0.1/api/woodfish-backgrounds?action=upload', {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': String(BACKGROUND_IMAGE_LIMITS.maxInputBytes + 1),
      },
      body: new Blob([validPngBytes().slice().buffer]),
    });
    const response = await handleBackgroundsRequest(store, request);
    expect(response.status).toBe(413);
    expect(store.list()).toEqual([]);
  });

  it('stops reading a chunked request as soon as it exceeds the input limit', async () => {
    const store = new HostBackgroundStore(path.join(tempDir, 'backgrounds'));
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const current = pulls++;
        if (current === 0) {
          controller.enqueue(new Uint8Array(BACKGROUND_IMAGE_LIMITS.maxInputBytes));
        } else if (current === 1) {
          controller.enqueue(Uint8Array.of(1));
        } else {
          controller.close();
        }
      },
      cancel() {},
    });
    const request = new Request('http://127.0.0.1/api/woodfish-backgrounds?action=upload', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    const response = await handleBackgroundsRequest(store, request);
    expect(response.status).toBe(413);
    expect(pulls).toBeLessThanOrEqual(3);
  });

  it.each([0, 29])(
    'reclaims one stale lock across two processes with %i existing images',
    async (count) => {
      const directory = path.join(tempDir, 'backgrounds');
      const store = new HostBackgroundStore(directory);
      fs.mkdirSync(directory);
      for (let i = 0; i < count; i++) store.save(String(i), validPngBytes(i));
      const oldIds = store.list().map((entry) => entry.id);
      if (count === 29) {
        fs.writeFileSync(path.join(directory, 'aaaaaaaaaaaaaaaa.png'), validPngBytes(250));
      }
      fs.mkdirSync(path.join(directory, 'index.lock', '0_1_dead'), { recursive: true });
      const bundle = path.join(tempDir, 'backgrounds.cjs');
      buildSync({
        entryPoints: [path.resolve(__dirname, '../host/backgrounds.ts')],
        outfile: bundle,
        platform: 'node',
        bundle: true,
        conditions: ['source'],
      });
      const run = (index: number) =>
        new Promise<number>((resolve, reject) => {
          const png = path.resolve(
            __dirname,
            '../../../../docs/hosts/dsh-screenshots/squircle-' +
              (index === 1 ? 'on' : 'off') +
              '.png'
          );
          const child = spawn(
            process.execPath,
            [path.join(__dirname, 'background-worker.cjs'), bundle, directory, png, String(index)],
            { stdio: ['ignore', 'ignore', 'pipe'] }
          );
          let stderr = '';
          child.stderr.on('data', (data) => {
            stderr += String(data);
          });
          child.once('error', reject);
          child.once('close', (code) =>
            code === 0 || code === 9
              ? resolve(code)
              : reject(new Error('background worker ' + code + ': ' + stderr))
          );
        });
      expect((await Promise.all([run(1), run(2)])).sort()).toEqual(count ? [0, 9] : [0, 0]);
      const ids = store.list().map((entry) => entry.id);
      expect(ids).toEqual(expect.arrayContaining(oldIds));
      expect(ids).toHaveLength(count ? 30 : 2);
      expect(
        fs
          .readdirSync(directory)
          .filter((name) => name.endsWith('.png'))
          .sort()
      ).toEqual(ids.map((id) => id + '.png').sort());
      expect(fs.readdirSync(directory).filter((name) => name.startsWith('index.lock'))).toEqual([]);
    },
    15000
  );

  it('aborts save on index EIO or corrupt JSON and preserves the original bytes', () => {
    const store = new HostBackgroundStore(tempDir);
    store.save('old', validPngBytes());
    const index = path.join(tempDir, 'index.json');
    const before = fs.readFileSync(index, 'utf8');
    jest.mocked(fs.readFileSync).mockImplementationOnce((file) => {
      expect(file).toBe(index);
      throw Object.assign(new Error('read failure'), { code: 'EIO' });
    });
    expect(() => store.save('next', validPngBytes(2))).toThrow('read failure');
    expect(fs.readFileSync(index, 'utf8')).toBe(before);
    fs.writeFileSync(index, '{');
    expect(() => store.save('next', validPngBytes(2))).toThrow(SyntaxError);
    expect(fs.readFileSync(index, 'utf8')).toBe('{');
  });

  it('cleans the new lock when owner initialization fails with ENOSPC', () => {
    jest.mocked(fs.writeFileSync).mockImplementationOnce(() => {
      throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
    });
    expect(() => new HostBackgroundStore(tempDir).save('image', validPngBytes())).toThrow(
      'disk full'
    );
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it('removes the raw index row when the image is already missing', () => {
    const store = new HostBackgroundStore(tempDir);
    const { id } = store.save('gone', validPngBytes());
    fs.unlinkSync(path.join(tempDir, id + '.png'));
    expect(store.remove(id)).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(tempDir, 'index.json'), 'utf8')).entries).toEqual(
      []
    );
  });

  it('enforces the host-side stored image count and allows replacement after deletion', async () => {
    const store = new HostBackgroundStore(path.join(tempDir, 'backgrounds'));
    for (let index = 1; index <= BACKGROUND_IMAGE_LIMITS.maxStoredCount; index += 1) {
      store.save('image-' + index, validPngBytes(index));
    }
    expect(store.list()).toHaveLength(BACKGROUND_IMAGE_LIMITS.maxStoredCount);
    expect(() => store.save('too-many', validPngBytes(200))).toThrow(/最多保存/);
    const response = await handleBackgroundsRequest(
      store,
      new Request('http://127.0.0.1/api/woodfish-backgrounds?action=upload', {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: new Blob([validPngBytes(201).slice().buffer]),
      })
    );
    expect(response.status).toBe(409);
    expect(store.remove(store.list()[0].id)).toBe(true);
    expect(() => store.save('after-delete', validPngBytes(202))).not.toThrow();
    expect(store.list()).toHaveLength(BACKGROUND_IMAGE_LIMITS.maxStoredCount);
  });

  it('reclaims a missing disk image before accepting a replacement upload', async () => {
    const directory = path.join(tempDir, 'backgrounds');
    const store = new HostBackgroundStore(directory);
    for (let index = 1; index <= BACKGROUND_IMAGE_LIMITS.maxStoredCount; index += 1) {
      store.save('image-' + index, validPngBytes(300 + index));
    }
    const missing = store.list()[0];
    fs.unlinkSync(path.join(directory, missing.id + '.png'));
    const response = await handleBackgroundsRequest(
      store,
      new Request('http://127.0.0.1/api/woodfish-backgrounds-write?action=upload', {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: new Blob([validPngBytes(400).slice().buffer]),
      })
    );
    expect(response.status).toBe(200);
    expect(store.list()).toHaveLength(BACKGROUND_IMAGE_LIMITS.maxStoredCount);
    expect(fs.readdirSync(directory).filter((name) => name.endsWith('.png'))).toHaveLength(
      BACKGROUND_IMAGE_LIMITS.maxStoredCount
    );
  });

  it.each(['EBUSY', 'EPERM'])(
    'keeps the index entry when deleting the image fails with %s',
    (code) => {
      const store = new HostBackgroundStore(path.join(tempDir, 'backgrounds'));
      const saved = store.save('locked', validPngBytes(203));
      const unlink = fs.unlinkSync as jest.MockedFunction<typeof fs.unlinkSync>;
      const originalUnlink = jest.requireActual<typeof import('fs')>('fs').unlinkSync;
      unlink.mockImplementation((file) => {
        if (String(file).endsWith('.png')) {
          const error = new Error('locked') as NodeJS.ErrnoException;
          error.code = code;
          throw error;
        }
        return originalUnlink(file);
      });
      try {
        expect(() => store.remove(saved.id)).toThrow('locked');
      } finally {
        unlink.mockImplementation(originalUnlink);
      }
      expect(store.list().map((entry) => entry.id)).toEqual([saved.id]);
    }
  );
});

describe('committed native dsh plugin package', () => {
  const pluginDir = path.resolve(__dirname, '../../plugin');

  it('declares valid dsh.bundle, dsh.client, exports and is self-contained', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf8')) as {
      name: string;
      type: string;
      exports: Record<string, string>;
      engines: { dsh: string };
      dependencies?: Record<string, string>;
      dsh: {
        manifestVersion: number;
        bundle: { patch: string };
        client: { platform: string; immediately: boolean; inject: string[] };
      };
    };
    expect(pkg.name).toBe(DSH_PLUGIN_NAME);
    expect(pkg.type).toBe('module');
    expect(pkg.exports['.']).toBe('./lib/index.js');
    expect(pkg.exports['./client']).toBe('./lib/client.js');
    expect(pkg.exports['./assets/*']).toBe('./lib/assets/*');
    expect(pkg.dsh.manifestVersion).toBe(1);
    expect(pkg.dsh.bundle.patch).toBe('./cordis.patch.yml');
    expect(pkg.dsh.client.platform).toBe('web');
    expect(pkg.dsh.client.immediately).toBe(true);
    expect(pkg.dependencies).toBeUndefined();
    expect(JSON.stringify(pkg)).not.toContain('workspace:');

    const hostCode = fs.readFileSync(path.join(pluginDir, 'lib', 'index.js'), 'utf8');
    const clientCode = fs.readFileSync(path.join(pluginDir, 'lib', 'client.js'), 'utf8');
    expect(hostCode).not.toContain('@woodfish/');
    expect(clientCode).not.toContain('@woodfish/');
    expect(clientCode).toContain(`window.__ModuleLoader__.load({`);
    expect(clientCode).toContain(`id: "${DSH_PLUGIN_NAME}"`);
    expect(clientCode).not.toContain('GM_registerMenuCommand');
    expect(clientCode).not.toContain('GM_getValue');

    const assets = fs.readdirSync(path.join(pluginDir, 'lib', 'assets'));
    expect(assets.some((file) => /^caiyun-[a-f0-9]{12}\.webp$/.test(file))).toBe(true);
  });
});
