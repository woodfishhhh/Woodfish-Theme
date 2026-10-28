import { WoodfishPaths } from '../paths';
import { CodexPlatform, PlatformError } from './types';
import { createWindowsPlatform } from './windows';

/**
 * The platform implementation for this machine. macOS is designed for (see CodexPlatform)
 * but not implemented yet: it could not be verified on a real machine.
 */
export function currentPlatform(paths: WoodfishPaths): CodexPlatform {
  if (process.platform === 'win32') {
    return createWindowsPlatform({ runtimeDir: paths.runtimeDir });
  }
  throw new PlatformError(
    process.platform === 'darwin'
      ? 'macOS 版 Codex 暂未支持，目前只支持 Windows'
      : `不支持的系统：${process.platform}，目前只支持 Windows`
  );
}

export type { CodexInstallation, CodexPlatform, CodexRuntimeState } from './types';
export { PlatformError } from './types';
