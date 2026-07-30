import * as path from 'path';

type VsixSizeCheck = {
  MAX_VSIX_BYTES: number;
  assertVsixSize: (size: number, filePath: string) => void;
  buildPackageInvocation: (
    args: string[],
    packageMetadata: { name: string; version: string },
    cwd?: string,
    isDirectory?: (candidate: string) => boolean
  ) => { outputPath: string; vsceArgs: string[] };
  findOutputPath: (args: string[]) => string;
};

const { MAX_VSIX_BYTES, assertVsixSize, buildPackageInvocation, findOutputPath } = require(
  path.resolve(__dirname, '..', '..', 'scripts', 'package.js')
) as VsixSizeCheck;

describe('VSIX size budget', () => {
  it('accepts compact release artifacts', () => {
    expect(() => assertVsixSize(MAX_VSIX_BYTES, 'woodfish-theme-test.vsix')).not.toThrow();
  });

  it('rejects release artifacts that exceed the package budget', () => {
    expect(() => assertVsixSize(MAX_VSIX_BYTES + 1, 'woodfish-theme-oversized.vsix')).toThrow(
      /exceeds the .* byte budget/i
    );
  });

  it('tracks explicit package output paths in both supported CLI forms', () => {
    expect(findOutputPath(['--out', 'artifacts/custom.vsix'])).toBe(
      path.resolve('artifacts/custom.vsix')
    );
    expect(findOutputPath(['--out=artifacts/custom-equals.vsix'])).toBe(
      path.resolve('artifacts/custom-equals.vsix')
    );
  });

  it('pins target packages to the exact artifact that will be measured', () => {
    const invocation = buildPackageInvocation(
      ['--target', 'win32-x64'],
      { name: 'woodfish-theme', version: '5.2.0' },
      path.resolve('package-test'),
      () => false
    );

    expect(invocation.outputPath).toBe(
      path.resolve('package-test', 'woodfish-theme-win32-x64-5.2.0.vsix')
    );
    expect(invocation.vsceArgs).toEqual([
      'package',
      '--target',
      'win32-x64',
      '--out',
      invocation.outputPath,
    ]);

    expect(
      buildPackageInvocation(
        ['-t', 'linux-x64'],
        { name: 'woodfish-theme', version: '5.2.0' },
        path.resolve('package-test'),
        () => false
      ).outputPath
    ).toBe(path.resolve('package-test', 'woodfish-theme-linux-x64-5.2.0.vsix'));
  });

  it('writes into an output directory and honors a positional package version', () => {
    const cwd = path.resolve('package-test');
    const outputDirectory = path.join(cwd, 'artifacts');
    const invocation = buildPackageInvocation(
      ['5.3.0', '--no-update-package-json', '--out', outputDirectory],
      { name: 'woodfish-theme', version: '5.2.0' },
      cwd,
      (candidate) => candidate === outputDirectory
    );

    expect(invocation.outputPath).toBe(path.join(outputDirectory, 'woodfish-theme-5.3.0.vsix'));
    expect(invocation.vsceArgs).toEqual([
      'package',
      '5.3.0',
      '--no-update-package-json',
      '--out',
      invocation.outputPath,
    ]);
  });
});
