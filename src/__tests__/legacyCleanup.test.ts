import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

describe('legacy Custom CSS cleanup', () => {
  it('does not keep the retired Custom CSS source chain in the extension runtime', () => {
    const retiredPaths = [
      'src/services/customCss',
      'src/services/dependency.ts',
      'src/services/themePaths.ts',
      'src/services/uninstall.ts',
      'scripts/debug-css-config.js',
      'scripts/install-custom-css.sh',
    ];

    for (const retiredPath of retiredPaths) {
      expect(fs.existsSync(path.join(repoRoot, retiredPath))).toBe(false);
    }
  });

  it('updates user-facing docs and commands to the integrated runtime wording', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      contributes: {
        commands: Array<{ command: string; title: string }>;
      };
    };
    const readmeZh = read('README.md');
    const readmeEn = read('README.en.md');
    const troubleshooting = read('docs/TROUBLESHOOTING.md');
    const autoConfigureCommand = packageJson.contributes.commands.find(
      (command) => command.command === 'woodfish-theme.autoConfigureRainbowCursor'
    );

    expect(autoConfigureCommand?.title).toBe('开启 Woodfish 彩色光标');
    expect(readmeZh).not.toMatch(/Custom CSS|自动配置/);
    expect(readmeEn).not.toMatch(/Custom CSS|自动配置/);
    expect(troubleshooting).not.toMatch(/Custom CSS|自动配置/);
  });

  it('updates changelog and release guidance for the integrated runtime era', () => {
    const changelog = read('docs/CHANGELOG.md');
    const prePublishScript = read('scripts/pre-publish-check.js');

    expect(changelog).toMatch(/4\.x runtime 时代|integrated runtime/i);
    expect(changelog).toMatch(/旧版本 \(3\.x 及更早\)|legacy Custom CSS/i);
    expect(prePublishScript).toMatch(/integrated runtime|第三方 CSS Loader/i);
  });
});
