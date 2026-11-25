import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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

  it('rejects non-image payloads and invalid ids safely', () => {
    const store = new HostBackgroundStore(path.join(tempDir, 'backgrounds'));
    expect(() => store.save('bad.png', new Uint8Array([1, 2, 3, 4]))).toThrow(/只支持/);
    expect(store.read('../secret')).toBeNull();
    expect(store.remove('../secret')).toBe(false);
  });
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
