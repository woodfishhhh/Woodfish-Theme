/**
 * Turns low-level file-system failures into actionable Chinese guidance.
 * Most “照着视频做了没效果” and Cursor/Linux reports were permission errors that
 * previously surfaced as a bare `EPERM` string.
 */
export type WriteFailureContext = {
  platform: typeof process.platform;
  targetPath: string;
  appName?: string;
};

function errorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export function isPermissionError(error: unknown): boolean {
  const code = errorCode(error);
  return code === 'EPERM' || code === 'EACCES' || code === 'EROFS';
}

function platformHint({ platform, targetPath, appName }: WriteFailureContext): string {
  const normalized = targetPath.replace(/\\/g, '/').toLowerCase();
  const product = appName && appName.length > 0 ? appName : 'VS Code';

  if (platform === 'linux' && normalized.startsWith('/snap/')) {
    return `${product} 通过 Snap 安装，安装目录是只读镜像，无法注入。请改用官方 .deb / .rpm / .tar.gz 安装包。`;
  }
  if (platform === 'linux' && normalized.includes('/app/') && normalized.includes('flatpak')) {
    return `${product} 通过 Flatpak 安装，安装目录只读，无法注入。请改用官方 .deb / .rpm / .tar.gz 安装包。`;
  }
  if (platform === 'linux') {
    return `当前用户没有 ${product} 安装目录的写权限。可执行：sudo chown -R "$USER" "<安装目录>/resources/app/out"，然后运行“修复 Woodfish 注入”。`;
  }
  if (platform === 'darwin' && normalized.includes('/apptranslocation/')) {
    return `${product} 正以“隔离运行”方式启动（未放入“应用程序”文件夹）。请把 ${product} 拖进 /Applications 后重新打开。`;
  }
  if (platform === 'darwin') {
    // macOS attributes the write to whichever app launched the editor. Starting it with
    // `code .` / `cursor .` from Terminal or iTerm makes the terminal responsible, and the
    // terminal usually lacks “App 管理”, even though the editor may modify itself.
    return `macOS 拒绝写入 ${product}.app。如果是在终端里用命令（如 code .、cursor .）启动的，请完全退出 ${product}，改从“程序坞”或“启动台”打开后运行“修复 Woodfish 注入”；否则请在“系统设置 → 隐私与安全性 → App 管理”中允许 ${product}（或你使用的终端），然后运行“修复 Woodfish 注入”。`;
  }
  if (platform === 'win32' && normalized.includes('/program files')) {
    return `${product} 安装在 Program Files（系统级安装）。请以管理员身份运行一次 ${product} 后执行“修复 Woodfish 注入”，或改用“用户安装版”。`;
  }
  if (platform === 'win32') {
    return `Windows 拒绝写入 ${product} 安装目录。请关闭占用该文件的杀毒软件或其他 ${product} 窗口，必要时以管理员身份运行一次后执行“修复 Woodfish 注入”。`;
  }
  return `当前用户没有 ${product} 安装目录的写权限。`;
}

export function describeWriteFailure(error: unknown, context: WriteFailureContext): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (!isPermissionError(error)) {
    return raw;
  }

  return `没有权限写入 ${context.targetPath}。${platformHint(context)}`;
}
