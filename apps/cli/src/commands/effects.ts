import {
  EFFECTS_RELOAD_FILE,
  USER_CSS_FILE,
  requestEffectsReload,
  resetEffectValues,
  restoreBuiltinEffect,
} from '@woodfish/effects';
import { isEffectId } from '@woodfish/theme-core';
import { isDebugPortAlive } from '../cdp/http';
import { ensureEffects, loadCodexEffects, userCssPath } from '../codex/effects';
import { evaluateInMainWindows } from '../inject/pages';
import { loadWatcherState, migrateSettings } from '../store';
import { CommandContext, CommandError, EXIT, isProcessAlive, sleep } from './context';
import { OverlayState, readOverlayStates } from './inject';

/** What a running Codex window reports about each effect. */
type PageEffect = OverlayState['effects'][number];

const STATE_LABELS: Readonly<Record<string, string>> = {
  running: '运行中',
  core: '运行中（核心）',
  off: '已关闭',
  failed: '失败',
};

/** The port of a running, injected Codex, if any. */
async function livePort(context: CommandContext): Promise<number | null> {
  const watcher = loadWatcherState(context.paths);
  if (!watcher || !isProcessAlive(watcher.pid)) {
    return null;
  }
  return (await isDebugPortAlive(watcher.port, context.fetchImpl)) ? watcher.port : null;
}

async function pageEffects(
  context: CommandContext,
  port: number | null
): Promise<PageEffect[] | null> {
  if (port === null) {
    return null;
  }
  try {
    const states = await readOverlayStates(context, port);
    return states.find((state) => state.controller)?.effects ?? null;
  } catch {
    return null;
  }
}

/** One line per effect: what is on disk, and what the running Codex says about it. */
function printEffects(context: CommandContext, live: PageEffect[] | null): number {
  const effects = loadCodexEffects(context.paths);
  context.io.out(`效果文件夹：${context.paths.effectsDir}`);
  let failed = 0;
  for (const effect of effects) {
    const page = live?.find((entry) => entry.id === effect.id);
    const runsHere = !effect.manifest || effect.manifest.hosts.includes('codex');
    const error = effect.error ?? page?.error ?? null;
    const enabled = effect.values?.enabled ?? false;
    let state: string;
    if (error) {
      state = `失败：${error}`;
      failed += 1;
    } else if (!runsHere) {
      state = '只在 VS Code 里运行';
    } else if (page) {
      state = STATE_LABELS[page.state] ?? page.state;
    } else {
      state = enabled ? '已开启' : '已关闭';
    }
    const mark = error ? '✗' : enabled ? '●' : '○';
    context.io.out(
      `${mark} ${(effect.manifest?.name ?? effect.id).padEnd(8, '　')} ${effect.id.padEnd(18)} ${state}`
    );
  }
  if (live === null) {
    context.io.out('（Codex 没有在运行 Woodfish 注入，上面是文件里的状态）');
  }
  context.io.out(
    `改样子：在 ${userCssPath(context.paths)} 里写 CSS 变量（清单见文件夹里的 README.md），或编辑各文件夹的 params.json、Codex 设置 → 外观 → Woodfish；给 AI 的说明在 AGENTS.md`
  );
  return failed;
}

/** `woodfish codex effects [list | path | reset <名字>|--all | restore <名字>]`. */
export async function effectsCommand(
  context: CommandContext,
  action: string | undefined,
  argument: string | undefined,
  options: { all: boolean }
): Promise<number> {
  migrateSettings(context.paths);
  const synced = ensureEffects(context.paths);
  if (synced.created.length > 0) {
    context.io.out(`已把 Woodfish 自带的效果放进效果文件夹（${synced.created.length} 个文件）。`);
  }
  switch (action ?? 'list') {
    case 'list': {
      const failed = printEffects(context, await pageEffects(context, await livePort(context)));
      return failed > 0 ? EXIT.failure : EXIT.ok;
    }
    case 'path':
      context.io.out(context.paths.effectsDir);
      return EXIT.ok;
    case 'reset': {
      const ids = options.all
        ? loadCodexEffects(context.paths)
            .filter((effect) => effect.manifest)
            .map((effect) => effect.id)
        : [argument];
      for (const id of ids) {
        if (!id || !isEffectId(id)) {
          throw new CommandError('用法：woodfish codex effects reset <效果名> | --all', EXIT.usage);
        }
        resetEffectValues(context.paths.effectsDir, id);
      }
      context.io.out(`已恢复默认参数：${ids.join('、')}（正在运行的 Codex 一秒内更新）`);
      return EXIT.ok;
    }
    case 'restore': {
      if (!argument || (!isEffectId(argument) && argument !== USER_CSS_FILE)) {
        throw new CommandError(
          `用法：woodfish codex effects restore <效果名> | ${USER_CSS_FILE}`,
          EXIT.usage
        );
      }
      const restored = restoreBuiltinEffect(context.paths.effectsDir, argument);
      context.io.out(
        `已恢复 Woodfish 自带的 ${argument}：${restored.join('、')}（改过的文件留了一份 .bak）`
      );
      return EXIT.ok;
    }
    default:
      throw new CommandError(
        '用法：woodfish codex effects [list | path | reset <效果名>|--all | restore <效果名>]',
        EXIT.usage
      );
  }
}

/**
 * `woodfish reload` / `woodfish codex reload [--hard]`: every running Woodfish (the Codex
 * watcher and the VS Code extension) re-reads the effects folder and restarts all effects.
 * `--hard` reloads the Codex window itself, like VS Code's Reload Window.
 */
export async function reloadCommand(context: CommandContext, hard: boolean): Promise<number> {
  migrateSettings(context.paths);
  ensureEffects(context.paths);
  requestEffectsReload(context.paths.effectsDir);
  context.io.out(`已请求刷新效果（${EFFECTS_RELOAD_FILE}），VS Code 里的 Woodfish 也会一起刷新。`);
  const port = await livePort(context);
  if (port === null) {
    context.io.out('Codex 没有在运行 Woodfish 注入；效果会在 Codex 下次带效果启动时加载。');
    return printEffects(context, null) > 0 ? EXIT.failure : EXIT.ok;
  }
  if (hard) {
    await evaluateInMainWindows(port, 'location.reload()', { fetchImpl: context.fetchImpl });
    context.io.out('已重新加载 Codex 窗口，效果几秒内回来。');
    await sleep(4000);
  } else {
    // The watcher sees the request within ~250 ms and re-injects every window.
    await sleep(1500);
  }
  const failed = printEffects(context, await pageEffects(context, port));
  return failed > 0 ? EXIT.failure : EXIT.ok;
}
