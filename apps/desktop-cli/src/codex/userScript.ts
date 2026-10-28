import * as fs from 'fs';
import * as path from 'path';
import {
  CODEX_ADAPTER_VERSION,
  CodexSettings,
  normalizeCodexSettings,
} from '@woodfish/adapter-codex';
import { USERSCRIPT_CONFIG_KEY, toScriptLiteral } from '../inject/payload';
import { WoodfishPaths } from '../paths';
import { readJson, writeFileAtomic, writeJson } from '../store';

export const USERSCRIPT_FILE = 'woodfish-codex.js';
export const USERSCRIPT_KEY = `user:${USERSCRIPT_FILE}`;

interface CodexPlusConfig {
  enabled?: boolean;
  scripts?: Record<string, boolean>;
  [key: string]: unknown;
}

function scriptsDir(paths: WoodfishPaths): string {
  return path.join(paths.codexPlusDir, 'user_scripts');
}

function configFile(paths: WoodfishPaths): string {
  return path.join(paths.codexPlusDir, 'user_scripts.json');
}

/** True when Codex++ has created its data folder on this machine. */
export function isCodexPlusInstalled(paths: WoodfishPaths): boolean {
  return fs.existsSync(paths.codexPlusDir);
}

export function isUserScriptInstalled(paths: WoodfishPaths): boolean {
  return fs.existsSync(path.join(scriptsDir(paths), USERSCRIPT_FILE));
}

/** The user script source: a header, the baked-in settings and the overlay bundle. */
export function buildUserScript(settings: CodexSettings, bundle: string): string {
  return [
    '/* @codex-plus-script',
    ' * name: Woodfish',
    ` * version: ${CODEX_ADAPTER_VERSION}`,
    ' * author: Woodfish',
    ' * description: 为 Codex 加上 OKLCH 代码渐变、发光、毛玻璃浮层、强调色与彩色光标',
    ' * homepage: https://github.com/woodfishhhh/Woodfish-Theme',
    ' * 由 `woodfish codex install-userscript` 生成；修改设置后重新运行该命令。',
    ' */',
    `globalThis[${toScriptLiteral(USERSCRIPT_CONFIG_KEY)}] = ${toScriptLiteral(normalizeCodexSettings(settings))};`,
    bundle,
    '',
  ].join('\n');
}

/** Writes the user script and enables it in `user_scripts.json`, keeping other entries. */
export function installUserScript(
  paths: WoodfishPaths,
  settings: CodexSettings,
  bundle: string
): string {
  const file = path.join(scriptsDir(paths), USERSCRIPT_FILE);
  writeFileAtomic(file, buildUserScript(settings, bundle));
  const config = readJson<CodexPlusConfig>(configFile(paths)) ?? { enabled: true };
  writeJson(configFile(paths), {
    ...config,
    scripts: { ...(config.scripts ?? {}), [USERSCRIPT_KEY]: true },
  });
  return file;
}

/** Removes the user script and its entry; other scripts and the global switch stay as they are. */
export function uninstallUserScript(paths: WoodfishPaths): boolean {
  const file = path.join(scriptsDir(paths), USERSCRIPT_FILE);
  const existed = fs.existsSync(file);
  fs.rmSync(file, { force: true });
  const config = readJson<CodexPlusConfig>(configFile(paths));
  if (config?.scripts && USERSCRIPT_KEY in config.scripts) {
    const scripts = { ...config.scripts };
    delete scripts[USERSCRIPT_KEY];
    writeJson(configFile(paths), { ...config, scripts });
  }
  return existed;
}
