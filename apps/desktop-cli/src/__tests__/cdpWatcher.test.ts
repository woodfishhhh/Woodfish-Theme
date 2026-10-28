import * as http from 'http';
import { AddressInfo } from 'net';
import { WebSocket, WebSocketServer } from 'ws';
import {
  CODEX_SETTINGS_BINDING,
  applyCodexSettingsPatch,
  normalizeCodexSettings,
} from '@woodfish/adapter-codex';
import { CdpConnection, WebSocketConstructor, evaluate } from '../cdp/client';
import { fetchTargets, fetchVersion, isDebugPortAlive } from '../cdp/http';
import { isMainWindowTarget, looksLikeCodexTargets, validateDebuggerUrl } from '../cdp/targets';
import { startWatcher } from '../inject/watcher';

interface Page {
  targetId: string;
  url: string;
  type: string;
  scripts: Map<string, string>;
  evaluated: string[];
  bindings?: string[];
  sessionId?: string;
}

/** A tiny fake of the Chromium DevTools endpoint: HTTP discovery plus a browser socket. */
class FakeBrowser {
  public readonly pages: Page[] = [
    {
      targetId: 'MAIN',
      url: 'app://-/index.html',
      type: 'page',
      scripts: new Map(),
      evaluated: [],
    },
    {
      targetId: 'AVATAR',
      url: 'app://-/index.html?initialRoute=%2Favatar-overlay',
      type: 'page',
      scripts: new Map(),
      evaluated: [],
    },
  ];
  private server!: http.Server;
  private wss!: WebSocketServer;
  private sockets = new Set<WebSocket>();
  private nextScript = 1;
  public port = 0;
  public commands: string[] = [];

  public async start(): Promise<void> {
    this.server = http.createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      if (request.url === '/json/version') {
        response.end(
          JSON.stringify({
            Browser: 'Chrome/155.0.0.0',
            'Protocol-Version': '1.3',
            webSocketDebuggerUrl: `ws://127.0.0.1:${this.port}/devtools/browser/abc-123`,
          })
        );
        return;
      }
      if (request.url === '/json/list') {
        response.end(
          JSON.stringify(
            this.pages.map((page) => ({
              id: page.targetId,
              type: page.type,
              url: page.url,
              webSocketDebuggerUrl: `ws://127.0.0.1:${this.port}/devtools/page/${page.targetId}`,
            }))
          )
        );
        return;
      }
      response.statusCode = 404;
      response.end('{}');
    });
    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on('connection', (socket) => {
      this.sockets.add(socket);
      socket.on('message', (raw) => this.handle(socket, JSON.parse(String(raw))));
      socket.on('close', () => this.sockets.delete(socket));
    });
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.port = (this.server.address() as AddressInfo).port;
  }

  public async stop(): Promise<void> {
    for (const socket of this.sockets) {
      socket.terminate();
    }
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  public broadcast(message: unknown): void {
    for (const socket of this.sockets) {
      socket.send(JSON.stringify(message));
    }
  }

  public closeAll(): void {
    for (const socket of this.sockets) {
      socket.close();
    }
  }

  private page(sessionId?: string): Page | undefined {
    return this.pages.find((page) => page.sessionId === sessionId);
  }

  private handle(
    socket: WebSocket,
    message: { id: number; method: string; params: Record<string, unknown>; sessionId?: string }
  ): void {
    this.commands.push(message.method);
    const reply = (result: Record<string, unknown>): void =>
      socket.send(JSON.stringify({ id: message.id, result, sessionId: message.sessionId }));
    switch (message.method) {
      case 'Target.setDiscoverTargets':
      case 'Page.enable':
        reply({});
        return;
      case 'Target.getTargets':
        reply({
          targetInfos: this.pages.map((page) => ({
            targetId: page.targetId,
            type: page.type,
            url: page.url,
          })),
        });
        return;
      case 'Target.attachToTarget': {
        const page = this.pages.find((candidate) => candidate.targetId === message.params.targetId);
        if (page) {
          page.sessionId = `session-${page.targetId}`;
        }
        reply({ sessionId: page?.sessionId });
        return;
      }
      case 'Page.addScriptToEvaluateOnNewDocument': {
        const identifier = String(this.nextScript++);
        this.page(message.sessionId)?.scripts.set(identifier, String(message.params.source));
        reply({ identifier });
        return;
      }
      case 'Runtime.addBinding': {
        const page = this.page(message.sessionId);
        if (page) {
          page.bindings = [...(page.bindings ?? []), String(message.params.name)];
        }
        reply({});
        return;
      }
      case 'Page.removeScriptToEvaluateOnNewDocument':
        this.page(message.sessionId)?.scripts.delete(String(message.params.identifier));
        reply({});
        return;
      case 'Runtime.evaluate': {
        const expression = String(message.params.expression);
        this.page(message.sessionId)?.evaluated.push(expression);
        if (expression === 'throw') {
          socket.send(
            JSON.stringify({
              id: message.id,
              result: {
                result: {},
                exceptionDetails: { text: 'Uncaught', exception: { description: 'Error: boom' } },
              },
            })
          );
          return;
        }
        reply({ result: { type: 'boolean', value: expression.includes('Boolean(') ? true : 42 } });
        return;
      }
      default:
        socket.send(
          JSON.stringify({ id: message.id, error: { message: `unknown ${message.method}` } })
        );
    }
  }
}

const WebSocketCtor = WebSocket as unknown as WebSocketConstructor;
let browser: FakeBrowser;

beforeEach(async () => {
  browser = new FakeBrowser();
  await browser.start();
});

afterEach(async () => {
  await browser.stop();
});

describe('targets', () => {
  it('accepts only loopback DevTools URLs on the expected port', () => {
    expect(validateDebuggerUrl('ws://127.0.0.1:9333/devtools/page/AB-12', 9333)).toBe(
      'ws://127.0.0.1:9333/devtools/page/AB-12'
    );
    for (const url of [
      'ws://10.0.0.5:9333/devtools/page/AB',
      'ws://127.0.0.1:9334/devtools/page/AB',
      'wss://127.0.0.1:9333/devtools/page/AB',
      'ws://127.0.0.1:9333/devtools/page/AB?x=1',
      'ws://user:pw@127.0.0.1:9333/devtools/page/AB',
      'ws://127.0.0.1:9333/evil',
      'not a url',
    ]) {
      expect(() => validateDebuggerUrl(url, 9333)).toThrow();
    }
  });

  it('recognises the main window and Codex targets', () => {
    expect(isMainWindowTarget({ type: 'page', url: 'app://-/index.html' })).toBe(true);
    expect(isMainWindowTarget({ type: 'page', url: 'app://-/index.html?initialRoute=x' })).toBe(
      false
    );
    expect(isMainWindowTarget({ type: 'webview', url: 'app://-/index.html' })).toBe(false);
    expect(looksLikeCodexTargets([{ id: '1', type: 'page', url: 'https://example.com' }])).toBe(
      false
    );
  });
});

describe('CDP HTTP and client', () => {
  it('reads version and targets and detects a dead port', async () => {
    expect((await fetchVersion(browser.port)).Browser).toContain('Chrome');
    expect((await fetchTargets(browser.port)).map((target) => target.id)).toEqual([
      'MAIN',
      'AVATAR',
    ]);
    expect(await isDebugPortAlive(browser.port)).toBe(true);
    await browser.stop();
    browser = new FakeBrowser();
    await browser.start();
    expect(await isDebugPortAlive(1)).toBe(false);
  });

  it('sends commands, surfaces page exceptions and rejects pending calls on close', async () => {
    const connection = await CdpConnection.open(
      `ws://127.0.0.1:${browser.port}/devtools/browser/abc-123`,
      { WebSocketCtor, timeoutMs: 2000 }
    );
    expect(await evaluate(connection, '1 + 1')).toBe(42);
    await expect(evaluate(connection, 'throw')).rejects.toThrow('Error: boom');
    await expect(connection.send('Nope.method')).rejects.toThrow('unknown Nope.method');
    const closed = new Promise<void>((resolve) => connection.onClose(resolve));
    browser.closeAll();
    await closed;
    expect(connection.isClosed).toBe(true);
    await expect(connection.send('Target.getTargets')).rejects.toThrow('调试连接已关闭');
  });
});

describe('startWatcher', () => {
  const settings = normalizeCodexSettings({ palette: { dark: 'neon' } });

  it('injects only the main window, re-injects new main windows and stops cleanly', async () => {
    let current = settings;
    let notify: () => void = () => undefined;
    const watcher = await startWatcher({
      port: browser.port,
      bundle: '/* bundle */',
      loadSettings: () => current,
      watchSettings: (onChange) => {
        notify = onChange;
        return () => undefined;
      },
      WebSocketCtor,
      healthIntervalMs: 60000,
    });
    const [main, avatar] = browser.pages;
    expect(watcher.pages()).toBe(1);
    expect(main.scripts.size).toBe(1);
    expect([...main.scripts.values()][0]).toContain('"dark":"neon"');
    expect(main.evaluated.some((expression) => expression.includes('/* bundle */'))).toBe(true);
    expect(avatar.scripts.size).toBe(0);

    current = normalizeCodexSettings({ palette: { dark: 'black' } });
    notify();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(main.scripts.size).toBe(1);
    expect([...main.scripts.values()][0]).toContain('"dark":"black"');

    const second: Page = {
      targetId: 'SECOND',
      url: 'app://-/index.html',
      type: 'page',
      scripts: new Map(),
      evaluated: [],
    };
    browser.pages.push(second);
    browser.broadcast({
      method: 'Target.targetCreated',
      params: { targetInfo: { targetId: 'SECOND', type: 'page', url: 'app://-/index.html' } },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(watcher.pages()).toBe(2);
    expect(second.scripts.size).toBe(1);

    await watcher.stop();
    expect(main.scripts.size).toBe(0);
    expect(main.evaluated.some((expression) => expression.includes('dispose()'))).toBe(true);
  });

  it('saves panel changes sent through the settings binding and updates every window', async () => {
    let current = settings;
    const patches: unknown[] = [];
    const watcher = await startWatcher({
      port: browser.port,
      bundle: '/* bundle */',
      loadSettings: () => current,
      saveSettingsPatch: (patch) => {
        patches.push(patch);
        current = applyCodexSettingsPatch(current, patch);
      },
      WebSocketCtor,
      healthIntervalMs: 60000,
    });
    const [main, avatar] = browser.pages;
    expect(main.bindings).toEqual([CODEX_SETTINGS_BINDING]);
    expect(avatar.bindings).toBeUndefined();

    const call = (
      payload: string,
      name = CODEX_SETTINGS_BINDING,
      sessionId = main.sessionId
    ): void =>
      browser.broadcast({ method: 'Runtime.bindingCalled', sessionId, params: { name, payload } });
    call(JSON.stringify({ palette: { dark: 'dracula' } }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(patches).toEqual([{ palette: { dark: 'dracula' } }]);
    expect([...main.scripts.values()][0]).toContain('"dark":"dracula"');

    // Other bindings, unknown sessions, oversized and malformed payloads are ignored.
    call(JSON.stringify({ glass: { enabled: false } }), 'somethingElse');
    call(JSON.stringify({ glass: { enabled: false } }), CODEX_SETTINGS_BINDING, 'session-unknown');
    call(JSON.stringify({ customCss: ['x'.repeat(5000)] }));
    call('{not json');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(patches).toHaveLength(1);
    await watcher.stop();
  });

  it('skips re-injection when the settings did not change', async () => {
    let notify: () => void = () => undefined;
    const watcher = await startWatcher({
      port: browser.port,
      bundle: '/* bundle */',
      loadSettings: () => settings,
      watchSettings: (onChange) => {
        notify = onChange;
        return () => undefined;
      },
      WebSocketCtor,
      healthIntervalMs: 60000,
    });
    const [main] = browser.pages;
    const evaluations = main.evaluated.length;
    notify();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(main.evaluated).toHaveLength(evaluations);
    await watcher.refresh(true);
    expect(main.evaluated.length).toBeGreaterThan(evaluations);
    await watcher.stop();
  });

  it('resolves `closed` when Codex goes away', async () => {
    const watcher = await startWatcher({
      port: browser.port,
      bundle: '',
      loadSettings: () => settings,
      WebSocketCtor,
    });
    browser.closeAll();
    await expect(watcher.closed).resolves.toBeUndefined();
  });

  it('refuses a browser endpoint that points elsewhere', async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          Browser: 'x',
          'Protocol-Version': '1.3',
          webSocketDebuggerUrl: 'ws://evil.example:80/devtools/browser/x',
        })
      )) as unknown as typeof fetch;
    await expect(
      startWatcher({
        port: browser.port,
        bundle: '',
        loadSettings: () => settings,
        WebSocketCtor,
        fetchImpl,
      })
    ).rejects.toThrow('拒绝连接');
  });
});
