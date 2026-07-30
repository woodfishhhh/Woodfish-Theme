import * as path from 'path';

type PrePublishCheck = {
  findForbiddenPackagePaths: (tree: string) => string[];
};

const { findForbiddenPackagePaths } = require(
  path.resolve(__dirname, '..', '..', 'scripts', 'pre-publish-check.js')
) as PrePublishCheck;

describe('pre-publish package hygiene', () => {
  it('rejects internal policy and development documentation paths', () => {
    const packagePaths = [
      'AGENTS.md',
      'docs/CONTRIBUTING.md',
      'docs/superpowers/specs/design.md',
      'out/integration/smoke.js',
      'themes/dracula/NOTICE.md',
    ].join('\n');

    expect(findForbiddenPackagePaths(packagePaths)).toEqual([
      'AGENTS.md',
      'docs/CONTRIBUTING.md',
      'docs/superpowers/specs/design.md',
      'out/integration/smoke.js',
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
});
