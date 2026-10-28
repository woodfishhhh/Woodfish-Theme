import { CODEX_MAIN_WINDOW_URL } from '@woodfish/adapter-codex';

/** Entry of `GET /json` (DevTools HTTP protocol). */
export interface CdpTarget {
  id: string;
  type: string;
  url: string;
  title?: string;
  webSocketDebuggerUrl?: string;
}

/** `GET /json/version`. */
export interface CdpVersion {
  Browser: string;
  'Protocol-Version': string;
  webSocketDebuggerUrl: string;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const DEBUGGER_PATH = /^\/devtools\/(?:page|browser)\/[A-Za-z0-9-]+$/;

/**
 * Accepts only `ws://<loopback>:<port>/devtools/{page|browser}/<id>`, so a rogue process
 * answering on the port cannot redirect the client elsewhere.
 */
export function validateDebuggerUrl(url: string, port: number): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`调试地址无效：${url}`);
  }
  if (
    parsed.protocol !== 'ws:' ||
    !LOOPBACK_HOSTS.has(parsed.hostname) ||
    Number(parsed.port) !== port ||
    !DEBUGGER_PATH.test(parsed.pathname) ||
    parsed.search !== '' ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    throw new Error(`拒绝连接非本机或格式异常的调试地址：${url}`);
  }
  return parsed.toString();
}

/** True for the Codex main window only (not overlays, quick chat, webviews or workers). */
export function isMainWindowTarget(target: Pick<CdpTarget, 'type' | 'url'>): boolean {
  return target.type === 'page' && target.url === CODEX_MAIN_WINDOW_URL;
}

/** True when the browser behind the port is Codex (owl / Chromium). */
export function looksLikeCodexTargets(targets: readonly CdpTarget[]): boolean {
  return targets.some((target) => target.url.startsWith('app://-/'));
}
