import { DSH_PLUGIN_NAME } from '@woodfish/dsh-web';
import {
  DshCommandRunner,
  cleanupLegacyDshUserScriptFiles,
  defaultDshRunner,
  readDshProfileStatus,
  resolveDshBinary,
  stageBundledDshPlugin,
  validateDshProfile,
} from '../dsh/plugin';
import { CommandContext, CommandError, EXIT } from './context';

export interface DshCommandDeps {
  env?: NodeJS.ProcessEnv;
  runDsh?: DshCommandRunner;
}

function requireDshBinary(env: NodeJS.ProcessEnv): string {
  const binary = resolveDshBinary(env);
  if (!binary) {
    throw new CommandError(
      '未找到 dsh 命令，请先安装 DeepSeek Harness（dsh），或通过 DSH_BIN 指定可执行文件路径。',
      EXIT.failure
    );
  }
  return binary;
}

function formatProcessFailure(
  action: string,
  stdout: string,
  stderr: string,
  error?: Error
): string {
  const detail = [stderr.trim(), stdout.trim(), error?.message ?? ''].filter(Boolean).join('\n');
  return detail ? `${action}失败：\n${detail}` : `${action}失败`;
}

/**
 * `woodfish dsh install [--profile <web|desktop>] [--package <spec>]`
 * Installs the official native Woodfish dsh plugin (`woodfish-dsh-plugin`) into a dsh profile.
 */
export function dshInstallCommand(
  context: CommandContext,
  options: { profile?: string; packageSpec?: string },
  deps: DshCommandDeps = {}
): number {
  const env = deps.env ?? process.env;
  const runDsh = deps.runDsh ?? defaultDshRunner;
  let profile: string;
  try {
    profile = validateDshProfile(options.profile ?? 'web');
  } catch (error) {
    throw new CommandError((error as Error).message, EXIT.usage);
  }
  const dshBinary = requireDshBinary(env);
  const spec = options.packageSpec?.trim() || stageBundledDshPlugin(context.paths);

  const result = runDsh(dshBinary, ['plugin', '--profile', profile, 'add', spec], env);
  if (result.error || result.status !== 0) {
    const combined = `${result.stderr}\n${result.stdout}`;
    if (
      profile === 'desktop' &&
      /managed exclusively by the Electron application/i.test(combined)
    ) {
      throw new CommandError(
        `dsh desktop 的插件目录由 Electron 桌面端直接管理，请打开 dsh desktop → 插件 → 添加插件，填入包名 ${DSH_PLUGIN_NAME} 或本地目录：\n  ${spec}`,
        EXIT.failure
      );
    }
    throw new CommandError(
      formatProcessFailure(
        `为 dsh (${profile}) 安装插件`,
        result.stdout,
        result.stderr,
        result.error
      ),
      EXIT.failure
    );
  }

  const cleaned = cleanupLegacyDshUserScriptFiles(context.paths);
  const status = readDshProfileStatus(profile, env);

  context.io.out(`已为 dsh（profile: ${profile}）安装原生插件 ${DSH_PLUGIN_NAME}`);
  if (status.version) {
    context.io.out(`插件版本：${status.version}（已激活：${status.enabled ? '是' : '否'}）`);
  }
  context.io.out(`Profile 目录：${status.profileDir}`);
  if (cleaned.length > 0) {
    context.io.out(`已清理旧版 dsh 油猴残留文件：${cleaned.join('、')}`);
  }
  context.io.out(
    `启动 dsh ${profile === 'desktop' ? 'desktop' : 'web'} 后，打开左下角「设置 → Woodfish」即可切换主题、上传背景图并实时调节全部效果参数。`
  );
  return EXIT.ok;
}

/**
 * `woodfish dsh status [--profile <web|desktop>] [--json]`
 * Reports whether `woodfish-dsh-plugin` is installed and enabled in the target dsh profile.
 */
export function dshStatusCommand(
  context: CommandContext,
  options: { profile?: string; json: boolean },
  deps: DshCommandDeps = {}
): number {
  const env = deps.env ?? process.env;
  let profile: string;
  try {
    profile = validateDshProfile(options.profile ?? 'web');
  } catch (error) {
    throw new CommandError((error as Error).message, EXIT.usage);
  }
  const status = readDshProfileStatus(profile, env);
  if (options.json) {
    context.io.out(JSON.stringify(status, null, 2));
    return EXIT.ok;
  }
  context.io.out(`dsh 可执行文件：${status.dshBinary ?? '未找到'}`);
  context.io.out(`DSH_HOME：${status.dshHome}`);
  context.io.out(`Profile：${status.profile}（${status.profileDir}）`);
  const pluginState = status.installed
    ? `已安装${status.version ? ` v${status.version}` : ''}（${status.enabled ? '已启用' : '未启用'}）`
    : status.broken
      ? '已声明依赖，但实际包缺失或损坏'
      : status.dependencyDeclared
        ? '已声明依赖，但实际包不可用'
        : status.packagePresent
          ? '未声明依赖，但实际包仍存在'
          : '未安装';
  context.io.out(`Woodfish 插件（${DSH_PLUGIN_NAME}）：${pluginState}`);
  return EXIT.ok;
}

/**
 * `woodfish dsh uninstall [--profile <web|desktop>]`
 * Removes `woodfish-dsh-plugin` from the target dsh profile via `dsh plugin remove`.
 */
export function dshUninstallCommand(
  context: CommandContext,
  options: { profile?: string },
  deps: DshCommandDeps = {}
): number {
  const env = deps.env ?? process.env;
  const runDsh = deps.runDsh ?? defaultDshRunner;
  let profile: string;
  try {
    profile = validateDshProfile(options.profile ?? 'web');
  } catch (error) {
    throw new CommandError((error as Error).message, EXIT.usage);
  }
  const status = readDshProfileStatus(profile, env);
  const cleaned = cleanupLegacyDshUserScriptFiles(context.paths);

  if (!status.dependencyDeclared) {
    context.io.out(`dsh（profile: ${profile}）中未安装 ${DSH_PLUGIN_NAME}。`);
    if (cleaned.length > 0) {
      context.io.out(`已清理旧版残留文件：${cleaned.join('、')}`);
    }
    return EXIT.ok;
  }

  const dshBinary = requireDshBinary(env);
  const result = runDsh(
    dshBinary,
    ['plugin', '--profile', profile, 'remove', DSH_PLUGIN_NAME],
    env
  );
  if (result.error || result.status !== 0) {
    throw new CommandError(
      formatProcessFailure(
        `从 dsh (${profile}) 卸载插件`,
        result.stdout,
        result.stderr,
        result.error
      ),
      EXIT.failure
    );
  }

  context.io.out(`已从 dsh（profile: ${profile}）卸载原生插件 ${DSH_PLUGIN_NAME}。`);
  if (cleaned.length > 0) {
    context.io.out(`已清理旧版残留文件：${cleaned.join('、')}`);
  }
  context.io.out('重启 dsh 后即完全恢复 dsh 原生界面。');
  return EXIT.ok;
}
