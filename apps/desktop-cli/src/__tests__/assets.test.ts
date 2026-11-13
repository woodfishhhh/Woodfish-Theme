import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../..');

interface Asset {
  output: string;
  entry: string;
  banner: string;
  header?: string;
  /** Shared packages the bundle is built from; the last one is the adapter. */
  packages: string[];
  buildDefine: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const build = require(path.join(APP_ROOT, 'scripts', 'build.js')) as {
  ASSETS: Asset[];
  buildAsset: (asset: Asset, buildId: string) => Promise<string>;
  computeBuildId: (packages?: string[]) => string;
};

describe('committed renderer bundles', () => {
  it.each(build.ASSETS)('$output matches a fresh build of the shared packages', async (asset) => {
    const committed = fs.readFileSync(path.join(APP_ROOT, asset.output), 'utf-8');
    await expect(build.buildAsset(asset, build.computeBuildId(asset.packages))).resolves.toBe(
      committed
    );
  });

  it.each(build.ASSETS)('$output is self-contained browser code', (asset) => {
    const code = fs.readFileSync(path.join(APP_ROOT, asset.output), 'utf-8');
    const adapter = asset.packages[asset.packages.length - 1];
    expect(code).not.toMatch(/\brequire\(|^\s*import\s|^\s*export\s/m);
    expect(code).not.toContain('@woodfish/');
    expect(code).toContain(`packages/${adapter}/src/renderer/overlay.ts`);
  });

  it('starts the dsh user script with its metadata block', () => {
    const asset = build.ASSETS.find((candidate) => candidate.output.endsWith('.user.js'));
    const code = fs.readFileSync(path.join(APP_ROOT, asset?.output ?? ''), 'utf-8');
    expect(asset?.header).toBeDefined();
    expect(code.startsWith(`${asset?.header ?? ''}\n`)).toBe(true);
    expect(code).toMatch(/^\/\/ @noframes$/m);
  });
});
