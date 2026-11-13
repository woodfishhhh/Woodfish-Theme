import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  BackgroundImportError,
  buildBackgroundCss,
  importBackgroundImage,
  resolveBackgroundFile,
  toWorkbenchFileUrl,
} from '../services/runtime/background';
import { buildRuntimeCss } from '../services/runtime/payloadBuilder';
import {
  DEFAULT_RUNTIME_SETTINGS,
  normalizeRuntimeSettings,
  sanitizeBackgroundImage,
} from '../types/features';

function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

const enabled = normalizeRuntimeSettings({ background: { enabled: true } }).background;

let sandbox: string;
beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-vsbg-'));
});
afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('background settings', () => {
  it('is off by default with the shared defaults', () => {
    expect(DEFAULT_RUNTIME_SETTINGS.background).toMatchObject({
      enabled: false,
      image: '',
      opacity: 0.15,
      blur: 10,
      mask: 0.35,
    });
  });

  it('only accepts values the extension writes itself', () => {
    expect(sanitizeBackgroundImage('gradient')).toBe('gradient');
    expect(sanitizeBackgroundImage('0123456789ab.webp')).toBe('0123456789ab.webp');
    expect(sanitizeBackgroundImage('../../settings.json')).toBe('');
    expect(sanitizeBackgroundImage('C:\\pic.png')).toBe('');
  });
});

describe('background CSS', () => {
  it('is empty when off and absent from the runtime payload', () => {
    expect(buildBackgroundCss(DEFAULT_RUNTIME_SETTINGS.background, 'x')).toBe('');
  });

  it('lays the picture under the workbench, clears the editor and frosts the side bars', () => {
    const css = buildBackgroundCss(enabled, 'vscode-file://vscode-app/c:/x/caiyun.webp');
    expect(css).toContain('.monaco-workbench::before {');
    expect(css).toContain('url("vscode-file://vscode-app/c:/x/caiyun.webp")');
    expect(css).toContain('background-color: var(--vscode-editor-background);');
    expect(css).toMatch(
      /\.monaco-editor-background[^{]*\{\n {2}background-color: transparent !important;/
    );
    expect(css).toMatch(
      /\.monaco-workbench \.part\.sidebar[^{]*\{[^}]*var\(--vscode-sideBar-background\) 35%[^}]*blur\(10px\) saturate\(150%\)/
    );
    expect(css.startsWith('@media not (prefers-reduced-transparency: reduce) {')).toBe(true);
  });

  it('uses the gradient instead of a file', () => {
    const css = buildBackgroundCss({ ...enabled, image: 'gradient' }, null);
    expect(css).toContain('linear-gradient(180deg, #2990bd, #e2ab5b, #e384be)');
    expect(css).not.toContain('vscode-file');
  });

  it('is part of the runtime CSS when enabled', () => {
    const assets = {
      activityBar: '',
      tabBar: '',
      overlayBootstrap: '',
      nativeWindowHook: '',
      cursorCore: '',
      cursorGlow: '',
      backgroundImage: 'vscode-file://vscode-app/c:/bg.webp',
    };
    const settings = normalizeRuntimeSettings({ background: { enabled: true } });
    expect(buildRuntimeCss(settings, assets)).toContain(
      'url("vscode-file://vscode-app/c:/bg.webp")'
    );
    expect(buildRuntimeCss(normalizeRuntimeSettings(), assets)).not.toContain('vscode-file');
  });
});

describe('background files', () => {
  it('builds vscode-file URLs from Windows paths', () => {
    expect(toWorkbenchFileUrl('C:\\Users\\木鱼\\a b#1.webp')).toBe(
      'vscode-file://vscode-app/C:/Users/%E6%9C%A8%E9%B1%BC/a%20b%231.webp'
    );
  });

  it('falls back to 《彩云》 when an import is missing', () => {
    const extensionPath = path.join(sandbox, 'ext');
    const bundled = path.join(extensionPath, 'themes', 'shared', 'backgrounds', 'caiyun.webp');
    fs.mkdirSync(path.dirname(bundled), { recursive: true });
    fs.writeFileSync(bundled, 'webp');
    const locations = { extensionPath, storagePath: path.join(sandbox, 'storage') };
    expect(resolveBackgroundFile({ ...enabled, image: '0123456789ab.png' }, locations)).toBe(
      bundled
    );
    expect(resolveBackgroundFile({ ...enabled, image: 'gradient' }, locations)).toBeNull();
  });

  it('copies small pictures, compresses large ones and keeps only the latest import', async () => {
    const storage = path.join(sandbox, 'storage');
    const small = path.join(sandbox, 'small.png');
    fs.writeFileSync(small, png(1600, 900));
    const compress = jest.fn(async () => png(2560, 1707));
    const first = await importBackgroundImage(small, storage, compress);
    expect(first).toMatch(/^[0-9a-f]{12}\.png$/);
    expect(compress).not.toHaveBeenCalled();

    const large = path.join(sandbox, 'large.png');
    fs.writeFileSync(large, png(6000, 4000));
    const second = await importBackgroundImage(large, storage, compress);
    expect(compress).toHaveBeenCalledWith(expect.any(Buffer), {
      type: 'image/png',
      width: 6000,
      height: 4000,
    });
    expect(fs.readdirSync(path.join(storage, 'backgrounds'))).toEqual([second]);
  });

  it('refuses files that are not pictures or cannot be compressed', async () => {
    const storage = path.join(sandbox, 'storage');
    const text = path.join(sandbox, 'notes.png');
    fs.writeFileSync(text, 'hello');
    await expect(importBackgroundImage(text, storage, jest.fn())).rejects.toThrow(
      BackgroundImportError
    );
    const large = path.join(sandbox, 'large.png');
    fs.writeFileSync(large, png(6000, 4000));
    await expect(
      importBackgroundImage(large, storage, async () => png(6000, 4000))
    ).rejects.toThrow('无法压缩');
  });
});
