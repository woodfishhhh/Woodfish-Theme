import * as fs from 'fs';
import * as path from 'path';

type PublishScript = {
  buildVsceArgs: (
    command: string,
    options?: { isPreRelease?: boolean; packagePath?: string }
  ) => string[];
};

const publishScript = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'scripts', 'publish.js'),
  'utf8'
);
const { buildVsceArgs } = require(
  path.resolve(__dirname, '..', '..', 'scripts', 'publish.js')
) as PublishScript;

describe('publish script safety', () => {
  it('does not delete workspace files before verification', () => {
    expect(publishScript).not.toMatch(/\b(?:unlink|rm|rmdir)Sync\s*\(/);
  });

  it('keeps an explicit Marketplace publish confirmation', () => {
    expect(publishScript).toContain("readline.question('是否继续发布到市场？(y/N): '");
  });

  it('provides a virtual display for integration tests on headless Linux', () => {
    expect(publishScript).toContain("process.platform === 'linux' && !process.env.DISPLAY");
    expect(publishScript).toContain('xvfb-run -a npm run test:integration');
  });

  it('uses the size-gated package script and reports Marketplace failures', () => {
    expect(publishScript).toContain("path.resolve('scripts', 'package.js')");
    expect(publishScript).toContain("'--packagePath'");
    expect(publishScript).toContain('process.exitCode = 1');
  });

  it('publishes the same pre-release VSIX that passed the package gate', () => {
    const packagePath = path.resolve('woodfish-theme-5.2.0.vsix');

    expect(buildVsceArgs('publish', { isPreRelease: true, packagePath })).toEqual([
      'publish',
      '--pre-release',
      '--packagePath',
      packagePath,
    ]);
  });
});
