import { CODEX_CONFIG_KEY, CODEX_CONTROLLER_KEY, CODEX_PLUS_NODE_ATTRIBUTE } from '../protocol';
import {
  CodexOverlayController,
  bootCodexOverlay,
  bootFromCdp,
  bootFromUserScript,
  startCodexOverlay,
} from '../renderer';

type Host = Record<string, unknown>;
const host = globalThis as unknown as Host;

function controller(): CodexOverlayController | undefined {
  return host[CODEX_CONTROLLER_KEY] as CodexOverlayController | undefined;
}

function mountCodexDom(): void {
  document.documentElement.setAttribute('data-theme', 'dark');
  document.body.innerHTML = `
    <main data-app-shell-main-surface>
      <div data-codex-composer-root><div contenteditable="true"></div></div>
      <div data-app-action-timeline-scroll>
        <div data-markdown-text-style="assistant-message">
          <p style="color: rgb(220, 220, 220)">Hello</p>
          <div data-code-block="true" data-markdown-copy="code-block">
            <div data-code-block-source="true"><code>
              <span class="hljs-keyword" style="color: rgb(255, 46, 151)">const</span>
              <span class="hljs-string" style="color: rgb(184, 255, 90)">'x'</span>
            </code></div>
          </div>
        </div>
      </div>
    </main>`;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback: FrameRequestCallback) =>
      Number(setTimeout(() => callback(0), 0))
    );
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => clearTimeout(id));
  mountCodexDom();
});

afterEach(() => {
  controller()?.dispose?.();
  delete host[CODEX_CONTROLLER_KEY];
  delete host[CODEX_CONFIG_KEY];
  delete host.codexPlus;
  jest.useRealTimers();
  jest.restoreAllMocks();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

function settle(): void {
  for (let index = 0; index < 5; index += 1) {
    jest.runOnlyPendingTimers();
  }
}

describe('startCodexOverlay', () => {
  it('mounts styles, paints code tokens and marks the root', () => {
    const overlay = startCodexOverlay({ palette: { dark: 'neon' } }, 'cdp');
    settle();
    const ids = [...document.head.querySelectorAll('style')].map((element) => element.id).sort();
    expect(ids).toEqual([
      'woodfish-codex-accent',
      'woodfish-codex-caret',
      'woodfish-codex-code',
      'woodfish-codex-glass',
      'woodfish-codex-palette',
      'woodfish-codex-settings',
    ]);
    expect(document.querySelectorAll('[data-woodfish-overlay-token="true"]')).toHaveLength(2);
    expect(document.querySelector('p')?.hasAttribute('data-woodfish-overlay-token')).toBe(false);
    expect(document.documentElement.dataset.woodfishCodex).toBe('0.1.0');
    expect(document.documentElement.dataset.woodfishCodexSource).toBe('cdp');
    expect(overlay.probe().codeToken).toBe(2);
    expect(controller()).toBe(overlay);
  });

  it('updates in place: enabling the body gradient, removing the palette', () => {
    const overlay = startCodexOverlay({ palette: { dark: 'neon' } }, 'cdp');
    settle();
    overlay.update({ bodyText: { enabled: true } });
    settle();
    expect(document.getElementById('woodfish-codex-palette')).toBeNull();
    expect(document.getElementById('woodfish-codex-body')).not.toBeNull();
    expect(document.querySelector('p')?.getAttribute('data-woodfish-overlay-token')).toBe('true');

    overlay.update({ codeGradient: { enabled: false }, codeGlow: { enabled: false } });
    settle();
    expect(document.querySelectorAll('[data-woodfish-overlay-token]')).toHaveLength(0);
  });

  it('leaves no trace after dispose', () => {
    // Serialize styles the way the browser does after any style write.
    const normalized = (): string => {
      for (const element of document.body.querySelectorAll<HTMLElement>('[style]')) {
        element.setAttribute('style', element.style.cssText);
      }
      return document.body.innerHTML;
    };
    const before = normalized();
    const overlay = startCodexOverlay({ bodyText: { enabled: true } }, 'cdp');
    settle();
    overlay.dispose();
    overlay.dispose();
    expect(document.head.querySelectorAll('style')).toHaveLength(0);
    expect(document.querySelectorAll('[data-woodfish-overlay-token]')).toHaveLength(0);
    expect(normalized()).toBe(before);
    expect(
      Object.keys(document.documentElement.dataset).filter((key) => key.startsWith('woodfish'))
    ).toEqual([]);
    expect(controller()).toBeUndefined();
  });

  it('re-checks a missing app shell until Codex has rendered it', () => {
    const main = document.querySelector('main') as HTMLElement;
    main.removeAttribute('data-app-shell-main-surface');
    const overlay = startCodexOverlay({}, 'cdp');
    jest.advanceTimersByTime(4000);
    expect(overlay.degraded()).toEqual(['appShell']);
    expect(document.documentElement.dataset.woodfishCodexDegraded).toBe('appShell');

    main.setAttribute('data-app-shell-main-surface', '');
    jest.advanceTimersByTime(5000);
    expect(overlay.degraded()).toEqual([]);
    expect(document.documentElement.dataset.woodfishCodexDegraded).toBeUndefined();
  });

  it('does not report the composer missing on pages without one', () => {
    document.querySelector('[data-codex-composer-root]')?.remove();
    const overlay = startCodexOverlay({}, 'cdp');
    jest.advanceTimersByTime(5000);
    expect(overlay.degraded()).toEqual([]);
  });

  it('tags user-script styles for Codex++', () => {
    startCodexOverlay({}, 'userscript');
    const styles = [...document.head.querySelectorAll('style')];
    expect(styles.length).toBeGreaterThan(0);
    for (const style of styles) {
      expect(style.id.startsWith('codex-plus-ext-woodfish-')).toBe(true);
      expect(style.getAttribute(CODEX_PLUS_NODE_ATTRIBUTE)).toBe('woodfish');
    }
  });
});

describe('boot entries', () => {
  const realLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL('app://-/index.html'),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('boots from the CDP config global and updates on re-injection', () => {
    host[CODEX_CONFIG_KEY] = { glass: { enabled: false } };
    bootFromCdp();
    const first = controller();
    expect(first?.source).toBe('cdp');
    expect(document.getElementById('woodfish-codex-glass')).toBeNull();

    host[CODEX_CONFIG_KEY] = { glass: { enabled: true } };
    bootFromCdp();
    expect(controller()).toBe(first);
    expect(document.getElementById('woodfish-codex-glass')).not.toBeNull();
  });

  it('lets a user script replace a CDP overlay, and a CDP injection yield to it', () => {
    bootCodexOverlay({}, 'cdp');
    const cleanups: Array<() => void> = [];
    host.codexPlus = { onCleanup: (cleanup: () => void) => cleanups.push(cleanup) };
    bootFromUserScript({});
    expect(controller()?.source).toBe('userscript');
    expect(document.getElementById('woodfish-codex-code')).toBeNull();

    bootCodexOverlay({ glass: { enabled: false } }, 'cdp');
    expect(controller()?.source).toBe('userscript');

    expect(cleanups).toHaveLength(1);
    cleanups[0]();
    expect(controller()).toBeUndefined();
    expect(document.head.querySelectorAll('style')).toHaveLength(0);
  });

  it('restarts an overlay from a different build instead of updating it', () => {
    const stale = {
      version: '0.0.1',
      source: 'cdp',
      build: 'old',
      update: jest.fn(),
      dispose: jest.fn(),
    };
    host[CODEX_CONTROLLER_KEY] = stale;
    bootCodexOverlay({}, 'cdp');
    expect(stale.update).not.toHaveBeenCalled();
    expect(stale.dispose).toHaveBeenCalled();
    expect(controller()?.build).toBe('dev');
  });

  it('ignores windows other than the main window', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL('app://-/index.html?initialRoute=%2Favatar-overlay'),
    });
    bootCodexOverlay({}, 'cdp');
    expect(controller()).toBeUndefined();
  });
});
