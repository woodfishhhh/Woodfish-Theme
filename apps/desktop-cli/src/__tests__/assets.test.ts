import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../..');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const build = require(path.join(APP_ROOT, 'scripts', 'build.js')) as {
  ASSETS: Array<{ output: string; entry: string; banner: string }>;
  buildAsset: (
    asset: { output: string; entry: string; banner: string },
    buildId: string
  ) => Promise<string>;
  computeBuildId: () => string;
};

describe('committed Codex renderer bundles', () => {
  it.each(build.ASSETS)('$output matches a fresh build of the shared packages', async (asset) => {
    const committed = fs.readFileSync(path.join(APP_ROOT, asset.output), 'utf-8');
    await expect(build.buildAsset(asset, build.computeBuildId())).resolves.toBe(committed);
  });

  it.each(build.ASSETS)('$output is self-contained browser code', (asset) => {
    const code = fs.readFileSync(path.join(APP_ROOT, asset.output), 'utf-8');
    expect(code).not.toMatch(/\brequire\(|^\s*import\s|^\s*export\s/m);
    expect(code).not.toContain('@woodfish/');
    expect(code).toContain('packages/adapter-codex/src/renderer/overlay.ts');
  });
});
