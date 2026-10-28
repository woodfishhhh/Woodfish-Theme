import * as fs from 'fs';
import * as path from 'path';

const extensionRoot = path.resolve(__dirname, '../..');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const browserRuntime = require(path.join(extensionRoot, 'scripts', 'build-browser-runtime.js')) as {
  BROWSER_ENTRIES: Array<{ source: string; output: string }>;
  buildEntry: (entry: { source: string; output: string }) => Promise<string>;
};

describe('browser runtime build', () => {
  it.each(browserRuntime.BROWSER_ENTRIES)(
    'keeps $output in sync with $source and @woodfish/theme-core',
    async (entry) => {
      const committed = fs.readFileSync(path.join(extensionRoot, entry.output), 'utf-8');
      await expect(browserRuntime.buildEntry(entry)).resolves.toBe(committed);
    }
  );

  it.each(browserRuntime.BROWSER_ENTRIES)(
    'ships $output as a self-contained script with the shared core inlined',
    (entry) => {
      const output = fs.readFileSync(path.join(extensionRoot, entry.output), 'utf-8');
      expect(output).not.toMatch(/\brequire\(|^\s*import\s|^\s*export\s/m);
      expect(output).not.toContain('@woodfish/theme-core');
      expect(output).toContain('packages/theme-core/src/gradient/tokenGradient.ts');
    }
  );
});
