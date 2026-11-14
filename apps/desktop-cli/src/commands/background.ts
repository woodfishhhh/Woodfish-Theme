import * as fs from 'fs';
import * as path from 'path';
import {
  CODEX_DEFAULT_BACKGROUND_ID,
  CODEX_GRADIENT_BACKGROUND_ID,
  isSavedBackgroundId,
  normalizeCodexSettings,
} from '@woodfish/adapter-codex';
import { resetEffectValues, writeEffectValues } from '@woodfish/effects';
import {
  BACKGROUND_IMAGE_LIMITS,
  needsBackgroundCompression,
  readBackgroundImageInfo,
} from '@woodfish/theme-core';
import { CdpConnection, evaluate } from '../cdp/client';
import { fetchTargets, isDebugPortAlive } from '../cdp/http';
import { isMainWindowTarget, validateDebuggerUrl } from '../cdp/targets';
import {
  BackgroundError,
  listBackgrounds,
  removeBackground,
  saveBackground,
} from '../codex/backgrounds';
import { installUserScript, isUserScriptInstalled } from '../codex/userScript';
import { loadUserScriptBundle, toScriptLiteral } from '../inject/payload';
import { ensureEffects, loadCodexEffects } from '../codex/effects';
import { loadSettings, loadWatcherState, migrateSettings, saveSettings } from '../store';
import { CommandContext, CommandError, EXIT } from './context';

/** The effect folder whose switch and numbers the background uses. */
const BACKGROUND_EFFECT = 'background';

const BUILT_IN_NAMES: Readonly<Record<string, string>> = {
  [CODEX_DEFAULT_BACKGROUND_ID]: '《彩云》（默认）',
  [CODEX_GRADIENT_BACKGROUND_ID]: '彩云渐变（蓝、金、粉）',
};

interface BackgroundChange {
  enabled?: boolean;
  image?: string;
  opacity?: number;
  blur?: number;
  mask?: number;
}

/**
 * The picture lives in codex.json; the switch and the numbers are the `background` effect's
 * params.json (the settings page and the AI edit the same file).
 */
function updateBackground(context: CommandContext, change: BackgroundChange): void {
  migrateSettings(context.paths);
  ensureEffects(context.paths);
  const { image, ...values } = change;
  const stored = loadSettings(context.paths);
  const codex = normalizeCodexSettings({
    ...stored.codex,
    ...(image !== undefined ? { backgroundImage: image } : {}),
  });
  if (image !== undefined) {
    saveSettings(context.paths, { ...stored, codex });
  }
  if (Object.keys(values).length > 0) {
    writeEffectValues(context.paths.effectsDir, BACKGROUND_EFFECT, values);
  }
  if (isUserScriptInstalled(context.paths)) {
    installUserScript(context.paths, codex, loadUserScriptBundle());
  }
}

/** The background effect's values as they are on disk. */
function backgroundValues(context: CommandContext): Record<string, unknown> | null {
  return (
    loadCodexEffects(context.paths).find((effect) => effect.id === BACKGROUND_EFFECT)?.values ??
    null
  );
}

/**
 * Deletes a saved picture; if it was in use, the background goes back to 《彩云》. Shared by
 * the command and the watcher (the in-app panel's delete button).
 */
export function forgetBackground(context: Pick<CommandContext, 'paths'>, id: string): boolean {
  const removed = removeBackground(context.paths, id);
  const stored = loadSettings(context.paths);
  if (stored.codex.backgroundImage === id) {
    saveSettings(context.paths, {
      ...stored,
      codex: normalizeCodexSettings({
        ...stored.codex,
        backgroundImage: CODEX_DEFAULT_BACKGROUND_ID,
      }),
    });
  }
  return removed;
}

/**
 * Scales a large picture inside the running Codex page (canvas, WebP), the same way the
 * in-app upload does. Node has no image codec, and Woodfish adds no native dependency.
 */
async function compressInCodex(context: CommandContext, data: Buffer): Promise<Buffer> {
  const port = loadWatcherState(context.paths)?.port;
  if (!port || !(await isDebugPortAlive(port, context.fetchImpl))) {
    throw new CommandError(
      '这张图片需要先缩小。请在 Woodfish 注入运行时再执行（借助 Codex 页面压缩），或在 Codex 设置 → 外观 → Woodfish 里上传'
    );
  }
  const target = (await fetchTargets(port, context.fetchImpl)).find(isMainWindowTarget);
  if (!target?.webSocketDebuggerUrl) {
    throw new CommandError('没有找到 Codex 主窗口');
  }
  const connection = await CdpConnection.open(
    validateDebuggerUrl(target.webSocketDebuggerUrl, port)
  );
  try {
    const info = readBackgroundImageInfo(data);
    const result = await evaluate(
      connection,
      `globalThis.__woodfishCodexController?.resizeBackground?.(${toScriptLiteral(data.toString('base64'))}, ${toScriptLiteral(info?.type ?? '')})`,
      undefined,
      true
    );
    if (typeof result !== 'string' || result.length === 0) {
      throw new CommandError('Codex 里的 Woodfish 版本较旧，无法压缩图片；请先重新注入');
    }
    return Buffer.from(result, 'base64');
  } finally {
    connection.close();
  }
}

async function setCommand(context: CommandContext, file: string | undefined): Promise<number> {
  if (!file) {
    throw new CommandError('用法：woodfish codex background set <图片路径>', EXIT.usage);
  }
  const resolved = path.resolve(file);
  let data: Buffer;
  try {
    if (fs.statSync(resolved).size > BACKGROUND_IMAGE_LIMITS.maxInputBytes) {
      throw new CommandError('图片太大（超过 40 MB）');
    }
    data = fs.readFileSync(resolved);
  } catch (error) {
    if (error instanceof CommandError) {
      throw error;
    }
    throw new CommandError(`读取图片失败：${(error as Error).message}`);
  }
  const info = readBackgroundImageInfo(data);
  if (!info) {
    throw new CommandError('只支持 JPG、PNG 和 WebP 图片');
  }
  if (needsBackgroundCompression(info, data.length)) {
    context.io.out(`图片较大（${info.width}×${info.height}），正在借助 Codex 页面缩小……`);
    data = await compressInCodex(context, data);
  }
  try {
    const entry = saveBackground(context.paths, data, path.parse(resolved).name);
    updateBackground(context, { enabled: true, image: entry.id });
    context.io.out(
      `已保存并使用背景“${entry.name}”（编号 ${entry.id}，${entry.width}×${entry.height}，${Math.round(entry.bytes / 1024)} KB）。`
    );
    context.io.out('原图可以删除或移动，Woodfish 保留了自己的副本。');
  } catch (error) {
    if (error instanceof BackgroundError) {
      throw new CommandError(error.message);
    }
    throw error;
  }
  return EXIT.ok;
}

function listCommand(context: CommandContext): number {
  ensureEffects(context.paths);
  const image = loadSettings(context.paths).codex.backgroundImage;
  const values = backgroundValues(context);
  context.io.out(`窗口背景：${values?.enabled ? '开' : '关'}`);
  const rows: Array<[string, string]> = [
    ...Object.entries(BUILT_IN_NAMES),
    ...listBackgrounds(context.paths).map((entry): [string, string] => [
      entry.id,
      `${entry.name}（${entry.width}×${entry.height}，${Math.round(entry.bytes / 1024)} KB）`,
    ]),
  ];
  for (const [id, label] of rows) {
    context.io.out(`${id === image ? '*' : ' '} ${id.padEnd(12)}  ${label}`);
  }
  context.io.out(
    `透明度 ${String(values?.opacity)}，模糊 ${String(values?.blur)}px，遮罩 ${String(values?.mask)}（其余参数在 ${path.join(context.paths.effectsDir, BACKGROUND_EFFECT, 'params.json')}）`
  );
  return EXIT.ok;
}

function useCommand(context: CommandContext, id: string | undefined): number {
  const known =
    id !== undefined &&
    (id in BUILT_IN_NAMES ||
      (isSavedBackgroundId(id) && listBackgrounds(context.paths).some((entry) => entry.id === id)));
  if (!id || !known) {
    throw new CommandError(
      '用法：woodfish codex background use <编号>（编号见 woodfish codex background list）',
      EXIT.usage
    );
  }
  updateBackground(context, { enabled: true, image: id });
  context.io.out(`已切换背景：${BUILT_IN_NAMES[id] ?? id}`);
  return EXIT.ok;
}

/** `woodfish codex background <set|list|use|reset|clear|remove>`. */
export async function backgroundCommand(
  context: CommandContext,
  action: string | undefined,
  argument: string | undefined
): Promise<number> {
  switch (action ?? 'list') {
    case 'set':
      return setCommand(context, argument);
    case 'list':
      return listCommand(context);
    case 'use':
      return useCommand(context, argument);
    case 'reset':
      updateBackground(context, { image: CODEX_DEFAULT_BACKGROUND_ID });
      resetEffectValues(context.paths.effectsDir, BACKGROUND_EFFECT);
      context.io.out('已恢复默认背景《彩云》和默认数值。');
      return EXIT.ok;
    case 'clear':
      updateBackground(context, { enabled: false });
      context.io.out(
        '已关闭窗口背景（保存的图片仍在，woodfish codex background use <编号> 可再打开）。'
      );
      return EXIT.ok;
    case 'remove':
      if (!argument || !isSavedBackgroundId(argument)) {
        throw new CommandError('用法：woodfish codex background remove <编号>', EXIT.usage);
      }
      if (!forgetBackground(context, argument)) {
        throw new CommandError(`没有编号为 ${argument} 的背景图片`);
      }
      context.io.out('已删除这张背景图片。');
      return EXIT.ok;
    default:
      throw new CommandError(
        '用法：woodfish codex background set <路径> | list | use <编号> | reset | clear | remove <编号>',
        EXIT.usage
      );
  }
}
