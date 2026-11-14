import * as path from 'path';

type VsixPackaging = {
  buildPackageInvocation: (
    args: string[],
    packageMetadata: { name: string; version: string },
    cwd?: string,
    isDirectory?: (candidate: string) => boolean
  ) => { outputPath: string; vsceArgs: string[] };
  describeVsix: (
    size: number,
    entries: Array<{ name: string; compressed: number }>,
    top?: number
  ) => string;
  findOutputPath: (args: string[]) => string;
  readZipEntries: (buffer: Buffer) => Array<{ name: string; compressed: number }>;
};

const { buildPackageInvocation, describeVsix, findOutputPath, readZipEntries } = require(
  path.resolve(__dirname, '..', '..', 'scripts', 'package.js')
) as VsixPackaging;

/** The central directory and end record of a zip; that is all the size report reads. */
function zipDirectory(entries: Array<[string, number]>): Buffer {
  const records = entries.map(([name, compressed]) => {
    const record = Buffer.alloc(46 + Buffer.byteLength(name));
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt32LE(compressed, 20);
    record.writeUInt16LE(Buffer.byteLength(name), 28);
    record.write(name, 46);
    return record;
  });
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(4, 16);
  return Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), ...records, end]);
}

describe('VSIX packaging', () => {
  it('reports the size and the biggest entries without any limit', () => {
    const entries = readZipEntries(
      zipDirectory([
        ['extension/out/extension.js', 300],
        ['extension/themes/shared/backgrounds/caiyun.webp', 600],
        ['extension/package.json', 50],
        ['extension/readme.md', 50],
      ])
    );
    expect(entries[1]).toEqual({
      name: 'extension/themes/shared/backgrounds/caiyun.webp',
      compressed: 600,
    });
    const report = describeVsix(1000, entries, 2).split('\n');
    expect(report[0]).toBe('VSIX 1.0 KB, 4 files:');
    expect(report[1]).toMatch(
      /0\.6 KB +60\.0% +extension\/themes\/shared\/backgrounds\/caiyun\.webp$/
    );
    expect(report[2]).toMatch(/30\.0% +extension\/out\/extension\.js$/);
    expect(report[3]).toMatch(/10\.0% +2 other files$/);
    expect(() => readZipEntries(Buffer.from('not a zip'))).toThrow(/not a zip/);
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
