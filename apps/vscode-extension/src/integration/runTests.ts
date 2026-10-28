import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

function createSpaceSafeExtensionPath(extensionPath: string): {
  path: string;
  dispose: () => void;
} {
  if (!/\s/.test(extensionPath)) {
    return {
      path: extensionPath,
      dispose: (): void => undefined,
    };
  }

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-vscode-test-'));
  const linkedExtensionPath = path.join(temporaryRoot, 'extension');
  fs.symlinkSync(
    extensionPath,
    linkedExtensionPath,
    process.platform === 'win32' ? 'junction' : 'dir'
  );

  return {
    path: linkedExtensionPath,
    dispose: (): void => {
      try {
        fs.unlinkSync(linkedExtensionPath);
      } catch {
        if (fs.existsSync(linkedExtensionPath)) {
          fs.rmdirSync(linkedExtensionPath);
        }
      }
      fs.rmdirSync(temporaryRoot);
    },
  };
}

async function main(): Promise<void> {
  const extensionPath = createSpaceSafeExtensionPath(path.resolve(__dirname, '../..'));
  const extensionDevelopmentPath = extensionPath.path;
  const extensionTestsPath = path.join(
    extensionDevelopmentPath,
    'out',
    'integration',
    'suite',
    'index'
  );

  try {
    await runTests({
      version: process.env.WOODFISH_TEST_VERSION ?? 'stable',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        '--disable-workspace-trust',
        '--skip-release-notes',
        '--skip-welcome',
      ],
      extensionTestsEnv: {
        WOODFISH_INTEGRATION_TEST: '1',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Woodfish integration test failed: ${message}`);
    process.exitCode = 1;
  } finally {
    extensionPath.dispose();
  }
}

void main();
