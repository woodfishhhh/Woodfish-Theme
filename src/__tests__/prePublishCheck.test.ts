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

  it('keeps repository previews and unused artwork out of the extension package', () => {
    const packagePaths = [
      'assets/readme/hero.png',
      'assets/readme/hero.svg',
      'assets/readme/dracula-preview.png',
      'images/img1.png',
      'images/img2.png',
      'images/icon.svg',
      'images/head.jpg',
    ].join('\n');

    expect(findForbiddenPackagePaths(packagePaths)).toEqual([
      'assets/readme/hero.png',
      'assets/readme/hero.svg',
      'assets/readme/dracula-preview.png',
      'images/img1.png',
      'images/img2.png',
      'images/icon.svg',
    ]);
  });

  it('requires every packaged README preview to use its canonical remote URL', () => {
    const previewUrls = [
      'https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/assets/readme/hero.png',
      'https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/assets/readme/dracula-preview.png',
      'https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/images/img1.png',
      'https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/images/img2.png',
    ];
    const readme = [
      `<img src="${previewUrls[0]}" alt="Hero">`,
      `<img src="${previewUrls[1]}" alt="Dracula">`,
      `![Woodfish Dark 彩虹光标效果](${previewUrls[2]})`,
      `![Woodfish Dark 渐变语法与发光效果](${previewUrls[3]})`,
    ].join('\n');

    expect(findMissingReadmePreviewUrls(readme)).toEqual([]);
    expect(
      findMissingReadmePreviewUrls([previewUrls[0], ...readme.split('\n').slice(1)].join('\n'))
    ).toEqual([previewUrls[0]]);
  });

  it('requires the runtime entry, icon, theme definitions, and injectable CSS', () => {
    const packagePaths = [
      'out/extension.js',
      'images/head.jpg',
      'themes/bearded/Woodfish Dark.json',
      'themes/bearded/theme.meta.json',
      'themes/bearded/syntax-highlighting.css',
      'themes/dracula/Woodfish Dracula.json',
      'themes/dracula/theme.meta.json',
      'themes/dracula/syntax-highlighting.css',
      'themes/dracula/glow-effects.css',
      'themes/shared/activity-bar.css',
      'themes/shared/tab-bar.css',
      'themes/shared/glow-effects.css',
      'themes/shared/cursor-core.css',
      'themes/shared/cursor-glow.css',
    ].join('\n');

    expect(findMissingRequiredPackagePaths(packagePaths)).toEqual([]);
    expect(findMissingRequiredPackagePaths(packagePaths.replace('out/extension.js\n', ''))).toEqual(
      ['out/extension.js']
    );
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
