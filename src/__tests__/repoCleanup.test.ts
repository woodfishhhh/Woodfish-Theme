import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..');

function readPackageJson(): { main: string } {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { main: string };
}

describe('repository cleanup guardrails', () => {
  it('uses the compiled TypeScript entry directly without a legacy root shim', () => {
    const packageJson = readPackageJson();

    expect(packageJson.main).toBe('./out/extension.js');
    expect(fs.existsSync(path.join(projectRoot, 'extension.js'))).toBe(false);
  });

  it('keeps only the maintained Node-based release flow', () => {
    expect(fs.existsSync(path.join(projectRoot, 'scripts', 'release.sh'))).toBe(false);
    expect(fs.existsSync(path.join(projectRoot, 'scripts', 'publish.js'))).toBe(true);
  });
});
