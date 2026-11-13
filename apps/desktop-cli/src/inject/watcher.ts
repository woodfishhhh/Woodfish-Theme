import * as fs from 'fs';
import {
  CODEX_BACKGROUND_BINDING,
  CODEX_EFFECTS_RELOAD_KEY,
  CODEX_LOG_BINDING,
  CODEX_RELOAD_BINDING,
  CODEX_SETTINGS_BINDING,
  CodexBackgroundEntry,
  CodexBackgroundReply,
  CodexSettings,
  isCodexBackgroundId,
} from '@woodfish/adapter-codex';
import { BACKGROUND_IMAGE_LIMITS } from '@woodfish/theme-core';
import { CdpConnection, CdpEvent, WebSocketConstructor, evaluate } from '../cdp/client';
import { fetchVersion } from '../cdp/http';
import { isMainWindowTarget, validateDebuggerUrl } from '../cdp/targets';
import { DISPOSE_EXPRESSION, buildInjectionScript, toScriptLiteral } from './payload';

interface TargetInfo {
  targetId: string;
  type: string;
  url: string;
}

interface AttachedPage {
  sessionId: string;
  scriptId: string | null;
}

/** A settings patch is a few hundred bytes; anything far larger is not from the panel. */
const MAX_BINDING_PAYLOAD = 4096;
/** A prepared picture in base64 plus the JSON around it. */
const MAX_BACKGROUND_PAYLOAD = Math.ceil((BACKGROUND_IMAGE_LIMITS.maxStoredBytes * 4) / 3) + 1024;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const NONCE = /^[A-Za-z0-9-]{1,64}$/;

/** Where the watcher keeps background pictures (see codex/backgrounds.ts). */
export interface WatcherBackgrounds {
  list: () => CodexBackgroundEntry[];
  get: (id: string) => { type: string; data: Buffer } | null;
  /** Validates and keeps a picture; returns its id. Throws with a message for the user. */
  save: (name: string, data: Buffer) => string;
  remove: (id: string) => void;
}

/**
 * Answers one background request from a page (untrusted JSON). Pure apart from `store`,
 * so it is tested without a browser.
 */
export function answerBackgroundRequest(
  store: WatcherBackgrounds,
  request: unknown
): { nonce: string; reply: CodexBackgroundReply } | null {
  if (request === null || typeof request !== 'object') {
    return null;
  }
  const { type, nonce, id, name, data } = request as Record<string, unknown>;
  if (typeof nonce !== 'string' || !NONCE.test(nonce)) {
    return null;
  }
  const fail = (error: string): { nonce: string; reply: CodexBackgroundReply } => ({
    nonce,
    reply: { ok: false, error },
  });
  try {
    if (type === 'list') {
      return {
        nonce,
        reply: {
          ok: true,
          entries: store
            .list()
            .map(({ id: entryId, name: entryName }) => ({ id: entryId, name: entryName })),
        },
      };
    }
    if (type === 'get') {
      const picture = isCodexBackgroundId(id) ? store.get(id) : null;
      return picture
        ? { nonce, reply: { ok: true, type: picture.type, data: picture.data.toString('base64') } }
        : fail('找不到这张背景图片');
    }
    if (type === 'upload') {
      if (typeof data !== 'string' || !BASE64.test(data)) {
        return fail('图片数据无效');
      }
      const saved = store.save(typeof name === 'string' ? name : '', Buffer.from(data, 'base64'));
      return { nonce, reply: { ok: true, id: saved } };
    }
    if (type === 'remove') {
      if (!isCodexBackgroundId(id)) {
        return fail('图片编号无效');
      }
      store.remove(id);
      return { nonce, reply: { ok: true } };
    }
  } catch (error) {
    return fail((error as Error).message);
  }
  return fail('不支持的操作');
}

export interface WatcherOptions {
  port: number;
  bundle: string;
  loadSettings: () => CodexSettings;
  /** Called with a callback to invoke when settings change; returns an unsubscribe. */
  watchSettings?: (onChange: () => void) => () => void;
  /**
   * The effect plugins as a page script (read from the effects folder on every refresh).
   * When given, pages also get the reload and log bindings.
   */
  loadEffects?: () => string;
  /** Like `watchSettings`, for the effects folder; `reload` restarts every effect. */
  watchEffects?: (onChange: (reload: boolean) => void) => () => void;
  /**
   * Saves a change made in the in-app settings panel (parsed, still untrusted JSON).
   * When given, every main window gets the settings binding.
   */
  saveSettingsPatch?: (patch: unknown) => void;
  /** Background picture storage; when given, every main window gets the background binding. */
  backgrounds?: WatcherBackgrounds;
  log?: (message: string) => void;
  WebSocketCtor?: WebSocketConstructor;
  fetchImpl?: typeof fetch;
  /** Re-checks that every main window still runs the overlay. */
  healthIntervalMs?: number;
}

export interface RunningWatcher {
  /** Number of main windows currently injected. */
  pages(): number;
  /** Re-applies the current settings to every page; skipped when nothing changed. */
  refresh(force?: boolean): Promise<void>;
  /** Re-reads the effects from disk and restarts all of them. */
  reload(): Promise<void>;
  /** Removes the overlay from every page and closes the connection. */
  stop(): Promise<void>;
  /** Resolves when Codex closes the debugging connection. */
  closed: Promise<void>;
}

/**
 * Keeps the overlay alive in every Codex main window. Scripts registered with
 * `Page.addScriptToEvaluateOnNewDocument` belong to this connection's sessions, so the
 * watcher must stay connected for reloads to be re-injected.
 */
export async function startWatcher(options: WatcherOptions): Promise<RunningWatcher> {
  const log = options.log ?? ((): void => undefined);
  const version = await fetchVersion(options.port, options.fetchImpl);
  const browserUrl = validateDebuggerUrl(version.webSocketDebuggerUrl, options.port);
  const connection = await CdpConnection.open(browserUrl, {
    WebSocketCtor: options.WebSocketCtor,
  });
  const pages = new Map<string, AttachedPage>();
  const attaching = new Set<string>();
  /** Asked-for reloads; the page restarts every effect when the number changes. */
  let reloads = 0;
  const buildScript = (): string =>
    buildInjectionScript(
      options.loadSettings(),
      options.bundle,
      options.loadEffects
        ? [
            options.loadEffects(),
            `globalThis[${toScriptLiteral(CODEX_EFFECTS_RELOAD_KEY)}] = ${reloads};`,
          ].join('\n')
        : ''
    );
  let script = buildScript();
  let stopped = false;

  /** Saves a panel change sent through the binding, then updates every window. */
  function onSettingsBinding(payload: unknown): void {
    if (!options.saveSettingsPatch || typeof payload !== 'string') {
      return;
    }
    if (payload.length > MAX_BINDING_PAYLOAD) {
      log('忽略过大的设置改动');
      return;
    }
    try {
      options.saveSettingsPatch(JSON.parse(payload));
    } catch (error) {
      log(`保存设置失败：${(error as Error).message}`);
      return;
    }
    log('已保存设置面板中的改动');
    void refresh();
  }

  /** Answers a background request from the page that sent it. */
  function onBackgroundBinding(sessionId: string, payload: unknown): void {
    if (!options.backgrounds || typeof payload !== 'string') {
      return;
    }
    if (payload.length > MAX_BACKGROUND_PAYLOAD) {
      log('忽略过大的背景图片');
      return;
    }
    let request: unknown;
    try {
      request = JSON.parse(payload);
    } catch {
      return;
    }
    const answer = answerBackgroundRequest(options.backgrounds, request);
    if (!answer) {
      return;
    }
    const kind = (request as { type?: unknown }).type;
    if (kind === 'upload' || kind === 'remove') {
      log(answer.reply.ok ? `背景图片：${String(kind)} 完成` : `背景图片：${answer.reply.error}`);
    }
    const expression = `globalThis.__woodfishCodexController?.backgroundReply?.(${toScriptLiteral(answer.nonce)}, ${toScriptLiteral(answer.reply)})`;
    void evaluate(connection, expression, sessionId).catch((error: Error) =>
      log(`回复背景图片请求失败：${error.message}`)
    );
  }

  /**
   * `Runtime.bindingCalled` arrives without Runtime.enable, but a reloaded page comes back
   * without the binding functions (measured on Codex 26.1013), so every load adds them again.
   */
  async function addBindings(sessionId: string): Promise<void> {
    if (options.saveSettingsPatch) {
      await connection.send('Runtime.addBinding', { name: CODEX_SETTINGS_BINDING }, sessionId);
    }
    if (options.backgrounds) {
      await connection.send('Runtime.addBinding', { name: CODEX_BACKGROUND_BINDING }, sessionId);
    }
    if (options.loadEffects) {
      await connection.send('Runtime.addBinding', { name: CODEX_RELOAD_BINDING }, sessionId);
      await connection.send('Runtime.addBinding', { name: CODEX_LOG_BINDING }, sessionId);
    }
  }

  /** An effect failed in the page; keep the reason in the log. */
  function onLogBinding(payload: unknown): void {
    if (typeof payload !== 'string' || payload.length > MAX_BINDING_PAYLOAD) {
      return;
    }
    try {
      const { id, message } = JSON.parse(payload) as { id?: unknown; message?: unknown };
      log(`效果 ${String(id)} 出错：${String(message)}`);
    } catch {
      // Not from the overlay.
    }
  }

  async function inject(targetId: string, page: AttachedPage): Promise<void> {
    if (page.scriptId) {
      await connection
        .send(
          'Page.removeScriptToEvaluateOnNewDocument',
          { identifier: page.scriptId },
          page.sessionId
        )
        .catch(() => undefined);
    }
    const added = await connection.send(
      'Page.addScriptToEvaluateOnNewDocument',
      { source: script },
      page.sessionId
    );
    page.scriptId = typeof added.identifier === 'string' ? added.identifier : null;
    await evaluate(connection, script, page.sessionId);
    log(`已注入窗口 ${targetId}`);
  }

  async function attach(info: TargetInfo): Promise<void> {
    if (
      stopped ||
      pages.has(info.targetId) ||
      attaching.has(info.targetId) ||
      !isMainWindowTarget(info)
    ) {
      return;
    }
    attaching.add(info.targetId);
    try {
      const attached = await connection.send('Target.attachToTarget', {
        targetId: info.targetId,
        flatten: true,
      });
      const sessionId = String(attached.sessionId);
      const page: AttachedPage = { sessionId, scriptId: null };
      pages.set(info.targetId, page);
      await connection.send('Page.enable', {}, sessionId);
      await addBindings(sessionId);
      await inject(info.targetId, page);
    } catch (error) {
      pages.delete(info.targetId);
      log(`注入窗口 ${info.targetId} 失败：${(error as Error).message}`);
    } finally {
      attaching.delete(info.targetId);
    }
  }

  function forget(predicate: (targetId: string, page: AttachedPage) => boolean): void {
    for (const [targetId, page] of pages) {
      if (predicate(targetId, page)) {
        pages.delete(targetId);
      }
    }
  }

  connection.onEvent((event: CdpEvent) => {
    if (event.method === 'Target.targetCreated' || event.method === 'Target.targetInfoChanged') {
      const info = event.params.targetInfo as TargetInfo | undefined;
      if (!info) {
        return;
      }
      if (isMainWindowTarget(info)) {
        void attach(info);
      } else if (pages.has(info.targetId)) {
        // The main window navigated somewhere else; its session will be reused on return.
        log(`窗口 ${info.targetId} 离开了主界面`);
      }
    } else if (event.method === 'Target.targetDestroyed') {
      const targetId = String(event.params.targetId);
      forget((id) => id === targetId);
    } else if (event.method === 'Target.detachedFromTarget') {
      const sessionId = String(event.params.sessionId);
      forget((_id, page) => page.sessionId === sessionId);
    } else if (
      event.method === 'Runtime.bindingCalled' &&
      event.params.name === CODEX_SETTINGS_BINDING &&
      [...pages.values()].some((page) => page.sessionId === event.sessionId)
    ) {
      onSettingsBinding(event.params.payload);
    } else if (
      event.method === 'Runtime.bindingCalled' &&
      event.params.name === CODEX_BACKGROUND_BINDING &&
      event.sessionId &&
      [...pages.values()].some((page) => page.sessionId === event.sessionId)
    ) {
      onBackgroundBinding(event.sessionId, event.params.payload);
    } else if (
      event.method === 'Runtime.bindingCalled' &&
      event.params.name === CODEX_RELOAD_BINDING &&
      [...pages.values()].some((page) => page.sessionId === event.sessionId)
    ) {
      log('页面请求刷新效果');
      void reload();
    } else if (
      event.method === 'Runtime.bindingCalled' &&
      event.params.name === CODEX_LOG_BINDING &&
      [...pages.values()].some((page) => page.sessionId === event.sessionId)
    ) {
      onLogBinding(event.params.payload);
    } else if (event.method === 'Page.loadEventFired' && event.sessionId) {
      // The new-document script normally re-injects; verify and repair if it did not.
      const entry = [...pages.entries()].find(([, page]) => page.sessionId === event.sessionId);
      if (entry) {
        void addBindings(entry[1].sessionId)
          .catch((error: Error) => log(`重新注册 binding 失败：${error.message}`))
          .then(() => ensureActive(entry[0], entry[1]));
      }
    }
  });

  async function ensureActive(targetId: string, page: AttachedPage): Promise<void> {
    try {
      const active = await evaluate(
        connection,
        'Boolean(globalThis.__woodfishCodexController)',
        page.sessionId
      );
      if (active !== true) {
        await inject(targetId, page);
      }
    } catch (error) {
      log(`检查窗口 ${targetId} 失败：${(error as Error).message}`);
    }
  }

  await connection.send('Target.setDiscoverTargets', { discover: true });
  const existing = await connection.send('Target.getTargets');
  for (const info of (existing.targetInfos as TargetInfo[] | undefined) ?? []) {
    await attach(info);
  }

  const healthTimer = setInterval(() => {
    for (const [targetId, page] of pages) {
      void ensureActive(targetId, page);
    }
  }, options.healthIntervalMs ?? 15000);
  healthTimer.unref();

  async function refresh(force = false): Promise<void> {
    let next: string;
    try {
      next = buildScript();
    } catch (error) {
      log(`读取设置或效果失败：${(error as Error).message}`);
      return;
    }
    if (next === script && !force) {
      return;
    }
    script = next;
    for (const [targetId, page] of pages) {
      await inject(targetId, page).catch((error: Error) =>
        log(`更新窗口 ${targetId} 失败：${error.message}`)
      );
    }
    log('设置已更新');
  }

  const unwatch = options.watchSettings?.(() => {
    void refresh();
  });
  /** Re-reads everything from disk and restarts every effect in every window. */
  async function reload(): Promise<void> {
    reloads += 1;
    await refresh(true);
  }

  // Scanners touching the folder fire events too; refresh() only logs when the script changed.
  const unwatchEffects = options.watchEffects?.((asked: boolean) => {
    if (asked) {
      log('收到刷新效果的请求');
    }
    void (asked ? reload() : refresh());
  });

  const closed = new Promise<void>((resolve) => {
    connection.onClose(() => {
      clearInterval(healthTimer);
      unwatch?.();
      unwatchEffects?.();
      log('Codex 已关闭调试连接，监视进程退出');
      resolve();
    });
  });

  return {
    pages: () => pages.size,
    refresh,
    reload,
    async stop(): Promise<void> {
      stopped = true;
      clearInterval(healthTimer);
      unwatch?.();
      unwatchEffects?.();
      for (const page of pages.values()) {
        if (page.scriptId) {
          await connection
            .send(
              'Page.removeScriptToEvaluateOnNewDocument',
              { identifier: page.scriptId },
              page.sessionId
            )
            .catch(() => undefined);
        }
        await evaluate(connection, DISPOSE_EXPRESSION, page.sessionId).catch(() => undefined);
      }
      connection.close();
    },
    closed,
  };
}

/** Watches the settings file by polling (reliable with atomic renames on Windows). */
export function watchFile(file: string): (onChange: () => void) => () => void {
  return (onChange) => {
    const listener = (current: fs.Stats, previous: fs.Stats): void => {
      if (current.mtimeMs !== previous.mtimeMs || current.size !== previous.size) {
        onChange();
      }
    };
    fs.watchFile(file, { interval: 1000 }, listener);
    return () => fs.unwatchFile(file, listener);
  };
}
