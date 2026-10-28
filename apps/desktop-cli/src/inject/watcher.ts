import * as fs from 'fs';
import { CodexSettings } from '@woodfish/adapter-codex';
import { CdpConnection, CdpEvent, WebSocketConstructor, evaluate } from '../cdp/client';
import { fetchVersion } from '../cdp/http';
import { isMainWindowTarget, validateDebuggerUrl } from '../cdp/targets';
import { DISPOSE_EXPRESSION, buildInjectionScript } from './payload';

interface TargetInfo {
  targetId: string;
  type: string;
  url: string;
}

interface AttachedPage {
  sessionId: string;
  scriptId: string | null;
}

export interface WatcherOptions {
  port: number;
  bundle: string;
  loadSettings: () => CodexSettings;
  /** Called with a callback to invoke when settings change; returns an unsubscribe. */
  watchSettings?: (onChange: () => void) => () => void;
  log?: (message: string) => void;
  WebSocketCtor?: WebSocketConstructor;
  fetchImpl?: typeof fetch;
  /** Re-checks that every main window still runs the overlay. */
  healthIntervalMs?: number;
}

export interface RunningWatcher {
  /** Number of main windows currently injected. */
  pages(): number;
  /** Re-applies the current settings to every page. */
  refresh(): Promise<void>;
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
  let script = buildInjectionScript(options.loadSettings(), options.bundle);
  let stopped = false;

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
    } else if (event.method === 'Page.loadEventFired' && event.sessionId) {
      // The new-document script normally re-injects; verify and repair if it did not.
      const entry = [...pages.entries()].find(([, page]) => page.sessionId === event.sessionId);
      if (entry) {
        void ensureActive(entry[0], entry[1]);
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

  async function refresh(): Promise<void> {
    script = buildInjectionScript(options.loadSettings(), options.bundle);
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

  const closed = new Promise<void>((resolve) => {
    connection.onClose(() => {
      clearInterval(healthTimer);
      unwatch?.();
      log('Codex 已关闭调试连接，监视进程退出');
      resolve();
    });
  });

  return {
    pages: () => pages.size,
    refresh,
    async stop(): Promise<void> {
      stopped = true;
      clearInterval(healthTimer);
      unwatch?.();
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
