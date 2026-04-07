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
      'themes/Bearded Theme/index.css',
      'themes/Bearded Theme/index-all.css',
      'themes/Bearded Theme/index-base.css',
      'themes/Bearded Theme/index-with-glow.css',
      'themes/Bearded Theme/index-with-rainbow.css',
      'themes/Bearded Theme/rainbow-cursor.css',
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
    const contributing = read('docs/CONTRIBUTING.md');
    const copilotInstructions = read('.github/copilot-instructions.md');
    const autoConfigureCommand = packageJson.contributes.commands.find(
      (command) => command.command === 'woodfish-theme.autoConfigureRainbowCursor'
    );

    expect(autoConfigureCommand?.title).toBe('开启 Woodfish 彩色光标');
    expect(readmeZh).not.toMatch(/Custom CSS|自动配置/);
    expect(readmeEn).not.toMatch(/Custom CSS|自动配置/);
    expect(troubleshooting).not.toMatch(/Custom CSS|自动配置/);
    expect(contributing).not.toMatch(/themes\/woodfish-theme\.html|浅色主题/);
    expect(copilotInstructions).not.toMatch(
      /relies on a \*\*Loader Extension\*\*|be5invis\.vscode-custom-css|bartag\.custom-css-hot-reload|src\/lib\/customCss\.ts|vscode_custom_css\.imports|transparent ui/i
    );
  });

  it('documents only the retained settings model and removes misleading runtime keys', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      contributes: {
        configuration: {
          properties: Record<string, unknown>;
        };
      };
    };
    const readmeZh = read('README.md');
    const readmeEn = read('README.en.md');
    const troubleshooting = read('docs/TROUBLESHOOTING.md');

    expect(packageJson.contributes.configuration.properties['woodfishTheme.runtime.enabled']).toBe(
      undefined
    );
    expect(
      packageJson.contributes.configuration.properties['woodfishTheme.runtime.autoSwitchTheme']
    ).toBeUndefined();
    expect(
      packageJson.contributes.configuration.properties['woodfishTheme.runtime.reapplyOnStartup']
    ).toBeUndefined();
    expect(
      packageJson.contributes.configuration.properties['woodfishTheme.syntaxGradient.preset']
    ).toBeUndefined();

    expect(readmeZh).not.toContain('woodfishTheme.runtime.enabled');
    expect(readmeZh).not.toContain('woodfishTheme.customStyles');
    expect(readmeZh).toContain('woodfishTheme.glow.intensity');
    expect(readmeZh).toContain('woodfishTheme.cursor.gradientStops');

    expect(readmeEn).not.toContain('woodfishTheme.runtime.enabled');
    expect(readmeEn).not.toContain('woodfishTheme.customStyles');
    expect(readmeEn).toContain('woodfishTheme.glow.intensity');
    expect(readmeEn).toContain('woodfishTheme.cursor.gradientStops');

    expect(troubleshooting).not.toContain('woodfishTheme.runtime.enabled');
    expect(troubleshooting).toContain('woodfishTheme.cursor.enabled');
  });

  it('updates changelog and release guidance for the integrated runtime era', () => {
    const changelog = read('docs/CHANGELOG.md');
    const prePublishScript = read('scripts/pre-publish-check.js');
    const publishScript = read('scripts/publish.js');

    expect(changelog).toMatch(/4\.x runtime 时代|integrated runtime/i);
    expect(changelog).toMatch(/旧版本 \(3\.x 及更早\)|legacy Custom CSS/i);
    expect(prePublishScript).toMatch(/integrated runtime|第三方 CSS Loader/i);
    expect(prePublishScript).not.toMatch(/themes\/Bearded Theme\/index\.css|rainbow-cursor\.css/);
    expect(publishScript).not.toMatch(/themes\/Bearded Theme\/index\.css/);
  });
});
