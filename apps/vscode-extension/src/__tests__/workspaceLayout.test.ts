import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const extensionRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(extensionRoot, '../..');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const paths = require(path.join(extensionRoot, 'scripts', 'paths.js')) as {
  EXTENSION_ROOT: string;
  REPO_ROOT: string;
  STAGED_REPO_FILES: string[];
  VSCE_ENTRY: string;
  withStagedRepoFiles: <T>(task: () => T, roots?: { extensionRoot: string; repoRoot: string }) => T;
};

type PackageJson = {
  name: string;
  publisher: string;
  private?: boolean;
  workspaces?: string[];
  devDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  vsce?: { dependencies?: boolean };
};

function readJson(filePath: string): PackageJson {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PackageJson;
}

describe('monorepo layout', () => {
  it('keeps the published extension identity inside apps/vscode-extension', () => {
    const extension = readJson(path.join(extensionRoot, 'package.json'));
    expect(`${extension.publisher}.${extension.name}`).toBe('zhongjun.woodfish-theme');
    expect(extension.dependencies).toBeUndefined();
    expect(extension.devDependencies?.['@woodfish/theme-core']).toBeDefined();
    // Workspace packages are bundled by esbuild; vsce must not try to collect node_modules.
    expect(extension.vsce?.dependencies).toBe(false);
  });

  it('declares the root as a private npm workspace', () => {
    const root = readJson(path.join(repoRoot, 'package.json'));
    expect(root.private).toBe(true);
    expect(root.workspaces).toEqual(expect.arrayContaining(['packages/*', 'apps/*']));
    expect(root.name).not.toBe('woodfish-theme');
  });

  it('resolves script locations independently of the working directory', () => {
    expect(paths.EXTENSION_ROOT).toBe(extensionRoot);
    expect(paths.REPO_ROOT).toBe(repoRoot);
    expect(fs.existsSync(paths.VSCE_ENTRY)).toBe(true);
    for (const fileName of paths.STAGED_REPO_FILES) {
      expect(fs.existsSync(path.join(repoRoot, fileName))).toBe(true);
    }
  });
});

describe('withStagedRepoFiles', () => {
  let sandbox: string;
  let fakeRepo: string;
  let fakeExtension: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-stage-'));
    fakeRepo = path.join(sandbox, 'repo');
    fakeExtension = path.join(fakeRepo, 'apps', 'ext');
    fs.mkdirSync(fakeExtension, { recursive: true });
    fs.writeFileSync(path.join(fakeRepo, 'README.md'), '# readme');
    fs.writeFileSync(path.join(fakeRepo, 'LICENSE'), 'MIT');
  });

  afterEach(() => {
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  const roots = (): { extensionRoot: string; repoRoot: string } => ({
    extensionRoot: fakeExtension,
    repoRoot: fakeRepo,
  });

  it('copies repository files for the task and removes them afterwards', () => {
    const seen = paths.withStagedRepoFiles(
      () => fs.readFileSync(path.join(fakeExtension, 'README.md'), 'utf-8'),
      roots()
    );
    expect(seen).toBe('# readme');
    expect(fs.existsSync(path.join(fakeExtension, 'README.md'))).toBe(false);
    expect(fs.existsSync(path.join(fakeExtension, 'LICENSE'))).toBe(false);
  });

  it('cleans up even when the task fails', () => {
    expect(() =>
      paths.withStagedRepoFiles(() => {
        throw new Error('vsce failed');
      }, roots())
    ).toThrow('vsce failed');
    expect(fs.readdirSync(fakeExtension)).toEqual([]);
  });

  it('refuses to overwrite a different file already in the extension folder', () => {
    fs.writeFileSync(path.join(fakeExtension, 'LICENSE'), 'something else');
    expect(() => paths.withStagedRepoFiles(() => undefined, roots())).toThrow(/differs/);
    expect(fs.readFileSync(path.join(fakeExtension, 'LICENSE'), 'utf-8')).toBe('something else');
    expect(fs.existsSync(path.join(fakeExtension, 'README.md'))).toBe(false);
  });
});
