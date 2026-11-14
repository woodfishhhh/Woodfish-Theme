import { isSea } from 'node:sea';
import { CODEX_PALETTE_SLUGS, codexPaletteMode } from '@woodfish/adapter-codex';
import { booleanFlag, parseArgs, stringFlag } from './cli/args';
import { Io, confirm, createConsoleIo } from './cli/io';
import { autostartCommand, daemonCommand } from './commands/autostart';
import { backgroundCommand } from './commands/background';
import { CommandContext, CommandError, EXIT } from './commands/context';
import { dshUninstallCommand, dshUserScriptCommand } from './commands/dsh';
import { effectsCommand, reloadCommand } from './commands/effects';
import {
  launchCommand,
  relaunchNormalCommand,
  stopInjectCommand,
  watchCommand,
} from './commands/inject';
import {
  doctorCommand,
  installUserScriptCommand,
  settingsCommand,
  shortcutCommand,
  statusCommand,
  themeApplyCommand,
  themeRestoreCommand,
  uninstallCommand,
  uninstallUserScriptCommand,
} from './commands/manage';
import { resolvePaths } from './paths';
import { currentPlatform } from './platform';

declare const __WOODFISH_CLI_VERSION__: string | undefined;
export const VERSION =
  typeof __WOODFISH_CLI_VERSION__ === 'string' ? __WOODFISH_CLI_VERSION__ : 'dev';

const VALUE_FLAGS = new Set([
  'palette',
  'dark',
  'light',
  'appearance',
  'mode',
  'port',
  'set',
  'out',
]);

function themesFor(mode: 'dark' | 'light'): string {
  return CODEX_PALETTE_SLUGS.filter((slug) => codexPaletteMode(slug) === mode).join(' ');
}
const DARK_THEMES = themesFor('dark');
const LIGHT_THEMES = themesFor('light');

export const HELP = `Woodfish 桌面工具

用法：woodfish codex <命令> [选项]
      woodfish dsh <命令> [选项]
      woodfish reload        刷新效果（Codex 和 VS Code 一起），同 codex reload

配色（不开调试端口）
  theme apply [--dark <深色主题>] [--light <浅色主题>]
              [--appearance <system|light|dark>]
              [--palette <名称>] [--restart]
                         把 Woodfish 配色写入 Codex 官方主题设置（自动备份）；
                         深色与浅色可同时设置，--appearance 切换 Codex 外观
  theme restore [--mode <dark|light|appearance>] [--restart]
                         撤销写入的配色与外观（默认全部）

注入效果（代码渐变、发光、毛玻璃、强调色、彩色光标）
  launch [--yes] [--accept-risk]
                         以本机调试端口启动 Codex 并保持效果
  stop-inject            立即撤下注入效果
  relaunch --normal [--yes]
                         不带调试端口重启 Codex（关闭端口）
  autostart [on|off] [--accept-risk]
                         登录后常驻：Codex 重启、商店更新后自动恢复效果；
                         不带参数时查看状态
  settings [--set 键=值]… [--reset]
                         查看或修改效果设置，例如：
                           --set palette.dark=neon --set bodyText.enabled=true
                           --set glass.blur=24 --set caret.enabled=false

效果插件（每个效果一个文件夹：%APPDATA%\\Woodfish\\effects，说明见其中的 AGENTS.md）
  effects [list]         列出每个效果和状态（运行中 / 已关闭 / 失败原因）
  effects path           效果文件夹的位置
  effects reset <名字>|--all
                         参数恢复默认（写回 params.json）
  effects restore <名字> 恢复 Woodfish 自带的效果文件（改过的留一份 .bak）
  reload [--hard]        从磁盘重新加载所有效果，不用重启 Codex（Codex 里也可按 Ctrl+Alt+R）；
                         --hard 连 Codex 窗口一起重新加载
                         效果参数也能用 settings 改，例如：
                           --set caret-trail.length=20 --set typing-particles.colors=rainbow

窗口背景（图片铺在窗口底下，侧栏和输入框用毛玻璃叠在上面）
  background [list]      查看背景设置和保存的图片
  background set <路径>  保存一张 JPG / PNG / WebP 并使用（超大图片借助 Codex 页面缩小）
  background use <编号>  切换到保存的图片；caiyun 是默认《彩云》，gradient 是彩云渐变
  background reset       恢复默认背景《彩云》和默认数值
  background clear       关闭窗口背景
  background remove <编号>
                         删除保存的图片
                         透明度等数值：settings --set background.opacity=0.2

Codex++
  install-userscript [--force]
  uninstall-userscript

主题
  深色：${DARK_THEMES}
  浅色：${LIGHT_THEMES}

其他
  --version              版本号
  status [--json]        当前状态
  doctor [--json]        检查效果与界面元素是否正常
  shortcut               创建开始菜单快捷方式“Woodfish Codex”
  uninstall [--keep-settings]
                         撤销 Woodfish 对 Codex 的全部修改

DeepSeek Harness（dsh）Web 版：油猴用户脚本
  dsh userscript [--out <文件.user.js>] [--set 键=值]… [--reset]
                         生成带当前设置的用户脚本（默认写到 Woodfish 数据目录），
                         在 Tampermonkey / Violentmonkey 中导入即可，例如：
                           --set palette.dark=neon --set glass.blur=24
  dsh uninstall          删除 woodfish dsh 生成的脚本与设置

选项
  --yes                  需要重启 Codex 时不再询问
  --accept-risk          非交互运行时同意调试端口的风险说明
`;

export interface RunOptions {
  io?: Io;
  context?: Partial<CommandContext>;
}

/** Runs the CLI and returns the exit code (never calls process.exit itself). */
export async function run(argv: readonly string[], options: RunOptions = {}): Promise<number> {
  const io = options.io ?? createConsoleIo();
  let args;
  try {
    args = parseArgs(argv, VALUE_FLAGS);
  } catch (error) {
    io.err((error as Error).message);
    return EXIT.usage;
  }
  // `woodfish reload` and `woodfish effects` are short for the codex commands.
  if (args.positionals[0] === 'reload' || args.positionals[0] === 'effects') {
    args.positionals.unshift('codex');
  }
  const [scope, command, subcommand] = args.positionals;
  if (booleanFlag(args, 'version') || scope === 'version') {
    io.out(VERSION);
    return EXIT.ok;
  }
  if (!scope || scope === 'help' || booleanFlag(args, 'help')) {
    io.out(HELP);
    return EXIT.ok;
  }
  if ((scope !== 'codex' && scope !== 'dsh') || !command) {
    io.err(`未知命令：${args.positionals.join(' ')}\n\n${HELP}`);
    return EXIT.usage;
  }

  const paths = options.context?.paths ?? resolvePaths();
  const context: CommandContext = {
    paths,
    io,
    platform: () => currentPlatform(paths),
    // The single-file exe is its own runtime: argv[1] repeats the exe path.
    cliPath: isSea() ? '' : (process.argv[1] ?? ''),
    nodePath: process.execPath,
    electronRunAsNode: Boolean(process.versions.electron),
    ...options.context,
  };
  const assumeYes = booleanFlag(args, 'yes');
  const restart = booleanFlag(args, 'restart');
  const json = booleanFlag(args, 'json');

  try {
    if (scope === 'dsh') {
      switch (command) {
        case 'userscript':
          return dshUserScriptCommand(context, args.sets, {
            reset: booleanFlag(args, 'reset'),
            out: stringFlag(args, 'out'),
          });
        case 'uninstall':
          return dshUninstallCommand(context);
        default:
          throw new CommandError(`未知命令：dsh ${command}\n\n${HELP}`, EXIT.usage);
      }
    }
    switch (command) {
      case 'theme':
        if (subcommand === 'apply') {
          return await themeApplyCommand(context, {
            palette: stringFlag(args, 'palette'),
            dark: stringFlag(args, 'dark'),
            light: stringFlag(args, 'light'),
            appearance: stringFlag(args, 'appearance'),
            restart,
            assumeYes,
          });
        }
        if (subcommand === 'restore') {
          return await themeRestoreCommand(context, {
            mode: stringFlag(args, 'mode'),
            restart,
            assumeYes,
          });
        }
        throw new CommandError('用法：woodfish codex theme apply|restore', EXIT.usage);
      case 'launch':
        return await launchCommand(context, {
          assumeYes,
          acceptRisk: booleanFlag(args, 'accept-risk'),
        });
      case 'stop-inject':
        return await stopInjectCommand(context);
      case 'relaunch':
        if (!booleanFlag(args, 'normal')) {
          throw new CommandError('用法：woodfish codex relaunch --normal', EXIT.usage);
        }
        return await relaunchNormalCommand(context, assumeYes);
      case 'settings':
        return settingsCommand(context, args.sets, { reset: booleanFlag(args, 'reset') });
      case 'background':
        return await backgroundCommand(context, subcommand, args.positionals[3]);
      case 'effects':
        return await effectsCommand(context, subcommand, args.positionals[3], {
          all: booleanFlag(args, 'all'),
        });
      case 'reload':
        return await reloadCommand(context, booleanFlag(args, 'hard'));
      case 'install-userscript':
        return installUserScriptCommand(context, booleanFlag(args, 'force'));
      case 'uninstall-userscript':
        return uninstallUserScriptCommand(context);
      case 'status':
        return await statusCommand(context, json);
      case 'doctor':
        return await doctorCommand(context, json);
      case 'shortcut':
        return shortcutCommand(context);
      case 'uninstall':
        return await uninstallCommand(context, {
          keepSettings: booleanFlag(args, 'keep-settings'),
        });
      case 'autostart':
        return await autostartCommand(context, subcommand, {
          acceptRisk: booleanFlag(args, 'accept-risk'),
        });
      case 'daemon':
        return await daemonCommand(context);
      case 'watch': {
        const port = Number(stringFlag(args, 'port'));
        if (!Number.isInteger(port) || port < 1024 || port > 65535) {
          throw new CommandError('用法：woodfish codex watch --port <端口>', EXIT.usage);
        }
        return await watchCommand(context, port);
      }
      default:
        throw new CommandError(`未知命令：codex ${command}\n\n${HELP}`, EXIT.usage);
    }
  } catch (error) {
    const exitCode = error instanceof CommandError ? error.exitCode : EXIT.failure;
    io.err(`错误：${(error as Error).message}`);
    return exitCode;
  }
}

/**
 * The single-file exe opened without arguments, usually by a double-click: start Codex with
 * the effects, offer to keep them after restarts, and keep the window open to read.
 */
export async function guidedLaunch(io: Io, options: RunOptions = {}): Promise<number> {
  io.out(`Woodfish ${VERSION}：为 Codex 桌面端换上 Woodfish 的配色和效果。全部命令：woodfish help`);
  io.out('');
  let code = await run(['codex', 'launch'], { ...options, io });
  if (code === EXIT.ok) {
    io.out('');
    if (
      await confirm(io, '登录 Windows 后自动恢复效果吗（Codex 重启、更新后也一直生效）？', false)
    ) {
      code = await run(['codex', 'autostart', 'on'], { ...options, io });
    }
  }
  io.out('');
  await io.ask('按回车键关闭窗口');
  return code;
}

if (require.main === module) {
  // VS Code runs this file on its own Electron with ELECTRON_RUN_AS_NODE=1. Nothing else the
  // CLI starts may inherit it (an Electron editor opening user.css would start as Node); the
  // CLI's own children get it back (selfEnv).
  delete process.env.ELECTRON_RUN_AS_NODE;
  const argv = process.argv.slice(2);
  const io = createConsoleIo();
  void (argv.length === 0 && isSea() && io.interactive ? guidedLaunch(io) : run(argv, { io })).then(
    (code) => {
      process.exitCode = code;
    }
  );
}
