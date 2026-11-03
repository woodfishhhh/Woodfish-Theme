import * as path from 'path';

type PrePublishCheck = {
  calculatePackageSourceBytes: (tree: string, getSize: (packagePath: string) => number) => number;
  findForbiddenPackagePaths: (tree: string) => string[];
  findMissingReadmePreviewUrls: (readme: string) => string[];
  findMissingRequiredPackagePaths: (tree: string) => string[];
};

const {
  calculatePackageSourceBytes,
  findForbiddenPackagePaths,
  findMissingReadmePreviewUrls,
  findMissingRequiredPackagePaths,
} = require(
  path.resolve(__dirname, '..', '..', 'scripts', 'pre-publish-check.js')
) as PrePublishCheck;

describe('pre-publish package hygiene', () => {
  it('rejects internal policy and development documentation paths', () => {
    const packagePaths = [
      'AGENTS.md',
      'docs/CONTRIBUTING.md',
      'docs/superpowers/specs/design.md',
      'out/integration/smoke.js',
      'coverage/lcov-report/index.html',
      '.nyc_output/processinfo/index.json',
      'build/extension.js',
      'themes/dracula/NOTICE.md',
    ].join('\n');

    expect(findForbiddenPackagePaths(packagePaths)).toEqual([
      'AGENTS.md',
      'docs/CONTRIBUTING.md',
      'docs/superpowers/specs/design.md',
      'out/integration/smoke.js',
      'coverage/lcov-report/index.html',
      '.nyc_output/processinfo/index.json',
      'build/extension.js',
    ]);
  });

  it('allows user-facing release documentation and theme notices', () => {
    const packagePaths = [
      'README.md',
      'CHANGELOG.md',
      'docs/TROUBLESHOOTING.md',
      'themes/dracula/NOTICE.md',
    ].join('\n');

    expect(findForbiddenPackagePaths(packagePaths)).toEqual([]);
  });

  it('keeps the repository-only English README out of the extension package', () => {
    expect(findForbiddenPackagePaths('README.en.md')).toEqual(['README.en.md']);
  });

  it('never ships the install manifest written during development', () => {
    expect(findForbiddenPackagePaths('.woodfish-installations.json')).toEqual([
      '.woodfish-installations.json',
    ]);
  });

  it('keeps repository previews and unused artwork out of the extension package', () => {
    const packagePaths = [
      'assets/readme/hero.png',
      'assets/readme/hero.svg',
      'assets/readme/dracula-preview.png',
      'images/img1.png',
      'images/img2.png',
      'images/icon.svg',
      'images/head.jpg',
      'images/icon.jpg',
      'docs/feedback/2026-10-27-refactor-input.md',
      'docs/walkthrough/enable.md',
    ].join('\n');

    expect(findForbiddenPackagePaths(packagePaths)).toEqual([
      'assets/readme/hero.png',
      'assets/readme/hero.svg',
      'assets/readme/dracula-preview.png',
      'images/img1.png',
      'images/img2.png',
      'images/icon.svg',
      'images/head.jpg',
      'docs/feedback/2026-10-27-refactor-input.md',
    ]);
  });

  it('requires the README banner as a repository raw link at HEAD or a release tag', () => {
    const repository = 'https://github.com/woodfishhhh/Woodfish-Theme/raw';
    expect(
      findMissingReadmePreviewUrls(`<img src="${repository}/HEAD/assets/readme/hero.png" alt="">`)
    ).toEqual([]);
    expect(
      findMissingReadmePreviewUrls(`![Woodfish](${repository}/v7.2.0/assets/readme/hero.png)`)
    ).toEqual([]);
    // A bare path, another repository or a branch name does not count.
    expect(findMissingReadmePreviewUrls('<img src="assets/readme/hero.png">')).toEqual([
      'assets/readme/hero.png',
    ]);
    expect(
      findMissingReadmePreviewUrls(
        '<img src="https://github.com/someone/fork/raw/HEAD/assets/readme/hero.png">'
      )
    ).toEqual(['assets/readme/hero.png']);
    expect(
      findMissingReadmePreviewUrls(`<img src="${repository}/main/assets/readme/hero.png">`)
    ).toEqual(['assets/readme/hero.png']);
  });

  it('requires the runtime entry, icon, theme definitions, and injectable CSS', () => {
    const packagePaths = [
      'README.md',
      'LICENSE',
      'out/extension.js',
      'out/uninstall.js',
      'images/icon.jpg',
      'THIRD_PARTY_NOTICES.md',
      'themes/bearded/Woodfish Dark.json',
      'themes/bearded/theme.meta.json',
      'themes/bearded/NOTICE.md',
      'themes/bearded/LICENSE.txt',
      'themes/dracula/Woodfish Dracula.json',
      'themes/dracula/theme.meta.json',
      'themes/dracula/NOTICE.md',
      'themes/dracula/LICENSE.txt',
      'themes/shared/activity-bar.css',
      'themes/shared/tab-bar.css',
      'themes/shared/overlay-bootstrap.js',
      'themes/shared/cursor-core.css',
      'themes/shared/cursor-glow.css',
      'themes/shared/native-window-main.mjs',
      'themes/black/Woodfish Black.json',
      'themes/black/theme.meta.json',
      'themes/neon/Woodfish Neon.json',
      'themes/neon/theme.meta.json',
      'themes/light/Woodfish Light.json',
      'themes/light/theme.meta.json',
      'docs/walkthrough/enable.md',
    ].join('\n');

    expect(findMissingRequiredPackagePaths(packagePaths)).toEqual([]);
    expect(findMissingRequiredPackagePaths(packagePaths.replace('out/extension.js\n', ''))).toEqual(
      ['out/extension.js']
    );
    // README 与 LICENSE 由打包脚本从仓库根目录临时复制进扩展目录
    expect(
      findMissingRequiredPackagePaths(packagePaths.replace('README.md\nLICENSE\n', ''))
    ).toEqual(['README.md', 'LICENSE']);
  });

  it('calculates a deterministic source-size budget from the package manifest', () => {
    const sizes = new Map([
      ['out/extension.js', 120],
      ['images/head.jpg', 80],
      ['themes/shared/tab-bar.css', 40],
    ]);
    const packagePaths = [...sizes.keys()].join('\n');

    expect(
      calculatePackageSourceBytes(packagePaths, (packagePath) => sizes.get(packagePath) ?? 0)
    ).toBe(240);
  });
});
