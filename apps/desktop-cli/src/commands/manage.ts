import * as fs from 'fs';
import {
  CODEX_PALETTE_SLUGS,
  CODEX_SELECTORS,
  CodexPaletteSlug,
  TESTED_CODEX_VERSIONS,
  normalizeCodexSettings,
} from '@woodfish/adapter-codex';
import { mergeSettings, parseSetting } from '../cli/args';
import { RISK_TEXT_SHA256 } from '../cli/consent';
import { isDebugPortAlive } from '../cdp/http';
import {
  applyNativeTheme,
  readNativeThemeManifest,
  restoreNativeTheme,
} from '../codex/nativeTheme';
import {
  installUserScript,
  isCodexPlusInstalled,
  isUserScriptInstalled,
  uninstallUserScript,
} from '../codex/userScript';
import { loadUserScriptBundle } from '../inject/payload';
import { loadSettings, loadWatcherState, saveSettings } from '../store';
import { CommandContext, CommandError, EXIT, isProcessAlive } from './context';
import { readOverlayStates, restartForNativeTheme, stopInjectCommand } from './inject';

function requirePalette(value: string | undefined): CodexPaletteSlug {
  if (!value || !(CODEX_PALETTE_SLUGS as readonly string[]).includes(value)) {
    throw new CommandError(
      `请用 --palette 指定配色：${CODEX_PALETTE_SLUGS.join(' / ')}`,
      EXIT.usage
    );
  }
  return value as CodexPaletteSlug;
}

/** `woodfish codex theme apply --palette <slug>`: official chrome theme, no port. */
export async function themeApplyCommand(
  context: CommandContext,
  palette: string | undefined,
  options: { restart: boolean; assumeYes: boolean }
): Promise<number> {
  const slug = requirePalette(palette);
  const result = applyNativeTheme(context.paths, slug);
  const modeLabel = result.mode === 'dark' ? '深色' : '浅色';
  context.io.out(
    result.changed
      ? `已把 Woodfish ${slug} 写入 Codex 的${modeLabel}主题（已备份原配置）。`
      : `Codex 的${modeLabel}主题已经是 Woodfish ${slug}。`
  );
  context.io.out('撤销：woodfish codex theme restore');
  if (options.restart || options.assumeYes) {
    await restartForNativeTheme(context, options.assumeYes);
  } else {
    context.io.out('Codex 重启后生效；加上 --restart 可立即重启。');
  }
  return EXIT.ok;
}

/** `woodfish codex theme restore`. */
export async function themeRestoreCommand(
  context: CommandContext,
  options: { restart: boolean; assumeYes: boolean }
): Promise<number> {
  const outcome = restoreNativeTheme(context.paths);
  const messages = {
    'nothing-to-restore': '没有需要恢复的配色。',
    'restored-exact': '已把 config.toml 恢复为修改前的原样。',
    'restored-keys':
      'config.toml 在应用配色后被 Codex 改动过，已只恢复 Woodfish 修改的键，其余改动保留。',
  } as const;
  context.io.out(messages[outcome]);
  if (outcome !== 'nothing-to-restore' && (options.restart || options.assumeYes)) {
    await restartForNativeTheme(context, options.assumeYes);
  }
  return EXIT.ok;
}

/** `woodfish codex settings [--set a.b=v]… [--reset]`. */
export function settingsCommand(
  context: CommandContext,
  sets: readonly string[],
  options: { reset: boolean }
): number {
  const stored = loadSettings(context.paths);
  let codex: unknown = options.reset ? {} : stored.codex;
  for (const assignment of sets) {
    codex = mergeSettings(codex, parseSetting(assignment));
  }
  const normalized = normalizeCodexSettings(codex);
  if (sets.length > 0 || options.reset) {
    saveSettings(context.paths, { ...stored, codex: normalized });
    context.io.out('设置已保存；正在运行的注入会在一秒内更新。');
    if (isUserScriptInstalled(context.paths)) {
      installUserScript(context.paths, normalized, loadUserScriptBundle());
      context.io.out('已同步更新 Codex++ 用户脚本，在 Codex++ 中重新加载脚本后生效。');
    }
  }
  context.io.out(JSON.stringify(normalized, null, 2));
  return EXIT.ok;
}

/** `woodfish codex install-userscript`. */
export function installUserScriptCommand(context: CommandContext, force: boolean): number {
  if (!isCodexPlusInstalled(context.paths) && !force) {
    throw new CommandError('没有找到 Codex++（%APPDATA%\\Codex++）。已安装的话可加 --force');
  }
  const file = installUserScript(
    context.paths,
    loadSettings(context.paths).codex,
    loadUserScriptBundle()
  );
  context.io.out(`已安装 Codex++ 用户脚本：${file}`);
  context.io.out('在 Codex++ 中重新加载用户脚本（或重启 Codex++）后生效。');
  return EXIT.ok;
}

/** `woodfish codex uninstall-userscript`. */
export function uninstallUserScriptCommand(context: CommandContext): number {
  context.io.out(
    uninstallUserScript(context.paths)
      ? '已移除 Woodfish 用户脚本，其他脚本未改动。'
      : '没有安装 Woodfish 用户脚本。'
  );
  return EXIT.ok;
}

/** `woodfish codex uninstall`: undo everything Woodfish did for Codex. */
export async function uninstallCommand(
  context: CommandContext,
  options: { keepSettings: boolean }
): Promise<number> {
  await stopInjectCommand(context);
  uninstallUserScriptCommand(context);
  await themeRestoreCommand(context, { restart: false, assumeYes: false });
  if (!options.keepSettings) {
    fs.rmSync(context.paths.dataDir, { recursive: true, force: true });
  }
  fs.rmSync(context.paths.runtimeDir, { recursive: true, force: true });
  context.io.out('Woodfish 对 Codex 的修改已全部撤销。重启 Codex 即可关闭调试端口。');
  return EXIT.ok;
}

/** `woodfish codex shortcut`: Start menu entry that launches Codex with Woodfish. */
export function shortcutCommand(context: CommandContext): number {
  if (loadSettings(context.paths).consent?.riskTextSha256 !== RISK_TEXT_SHA256) {
    throw new CommandError(
      '请先运行一次 `woodfish codex launch` 并同意风险说明',
      EXIT.consentRequired
    );
  }
  const link = context
    .platform()
    .createShortcut('Woodfish Codex', context.nodePath, [
      context.cliPath,
      'codex',
      'launch',
      '--yes',
    ]);
  context.io.out(`已创建开始菜单快捷方式：${link}`);
  return EXIT.ok;
}

interface StatusReport {
  installation: { name: string; version: string; tested: boolean } | null;
  running: boolean;
  debugPort: number | null;
  debugPortAlive: boolean;
  watcher: { pid: number; port: number; alive: boolean } | null;
  nativeTheme: { palette: string; mode: string; appliedAt: string } | null;
  userScript: boolean;
  consent: boolean;
}

async function collectStatus(context: CommandContext): Promise<StatusReport> {
  const platform = context.platform();
  const installation = platform.discover();
  const state = installation ? platform.inspect(installation) : null;
  const watcher = loadWatcherState(context.paths);
  const manifest = readNativeThemeManifest(context.paths);
  const port = state?.debugPort ?? null;
  return {
    installation: installation
      ? {
          name: installation.name,
          version: installation.version,
          tested: TESTED_CODEX_VERSIONS.includes(installation.version),
        }
      : null,
    running: Boolean(state?.main),
    debugPort: port,
    debugPortAlive: port ? await isDebugPortAlive(port, context.fetchImpl) : false,
    watcher: watcher ? { ...watcher, alive: isProcessAlive(watcher.pid) } : null,
    nativeTheme: manifest
      ? { palette: manifest.palette, mode: manifest.mode, appliedAt: manifest.appliedAt }
      : null,
    userScript: isUserScriptInstalled(context.paths),
    consent: loadSettings(context.paths).consent?.riskTextSha256 === RISK_TEXT_SHA256,
  };
}

function printStatus(context: CommandContext, status: StatusReport): void {
  const io = context.io;
  io.out(
    status.installation
      ? `Codex：${status.installation.name} ${status.installation.version}${status.installation.tested ? '' : '（未经 Woodfish 测试的版本）'}`
      : 'Codex：未安装'
  );
  io.out(`运行中：${status.running ? '是' : '否'}`);
  io.out(
    `调试端口：${status.debugPort ? `${status.debugPort}${status.debugPortAlive ? '（已开启）' : '（无响应）'}` : '未开启'}`
  );
  io.out(`注入：${status.watcher?.alive ? `监视进程 ${status.watcher.pid} 运行中` : '未运行'}`);
  io.out(
    `原生配色：${status.nativeTheme ? `${status.nativeTheme.palette}（${status.nativeTheme.mode === 'dark' ? '深色' : '浅色'}）` : '未应用'}`
  );
  io.out(`Codex++ 用户脚本：${status.userScript ? '已安装' : '未安装'}`);
}

/** `woodfish codex status`. */
export async function statusCommand(context: CommandContext, json: boolean): Promise<number> {
  const status = await collectStatus(context);
  if (json) {
    context.io.out(JSON.stringify(status, null, 2));
  } else {
    printStatus(context, status);
  }
  return EXIT.ok;
}

/** `woodfish codex doctor`: status plus what the overlay sees inside Codex. */
export async function doctorCommand(context: CommandContext, json: boolean): Promise<number> {
  const status = await collectStatus(context);
  const pages =
    status.debugPort && status.debugPortAlive
      ? await readOverlayStates(context, status.debugPort)
      : [];
  const problems: string[] = [];
  if (!status.installation) {
    problems.push('没有找到 Codex 桌面端');
  } else if (!status.installation.tested) {
    problems.push(`Codex ${status.installation.version} 未经测试，部分效果可能失效`);
  }
  if (status.watcher && !status.watcher.alive) {
    problems.push('记录中的监视进程已退出，请重新运行 woodfish codex launch');
  }
  for (const page of pages) {
    if (!page.controller) {
      problems.push('主窗口中没有 Woodfish 效果');
    }
    for (const group of page.degraded) {
      const description = (CODEX_SELECTORS as Record<string, { description: string }>)[group]
        ?.description;
      problems.push(`未找到界面元素：${description ?? group}（Codex 界面可能已改版）`);
    }
  }
  if (json) {
    context.io.out(JSON.stringify({ status, pages, problems }, null, 2));
  } else {
    printStatus(context, status);
    for (const page of pages) {
      context.io.out(
        `窗口：效果${page.controller ? `已启用（${page.controller.source}）` : '未启用'}，主题 ${page.theme}，代码 token ${page.painted} 个`
      );
      if (page.probe) {
        const hits = Object.entries(page.probe)
          .map(([group, count]) => `${group}=${count}`)
          .join(' ');
        context.io.out(`  元素命中：${hits}`);
      }
    }
    context.io.out(
      problems.length === 0 ? '未发现问题。' : problems.map((p) => `· ${p}`).join('\n')
    );
  }
  return problems.length === 0 ? EXIT.ok : EXIT.failure;
}
