import {
  CODEX_CONTROLLER_KEY,
  CODEX_PLUS_NODE_ATTRIBUTE,
  CODEX_SETTINGS_BINDING,
  CODEX_USERSCRIPT_STORAGE_KEY,
} from '../protocol';
import { CodexOverlayController, bootFromUserScript, startCodexOverlay } from '../renderer';
import { SETTINGS_PANEL_ATTRIBUTE } from '../renderer/settingsPanel';

type Host = Record<string, unknown>;
const host = globalThis as unknown as Host;

/** A trimmed copy of Codex's Settings → Appearance page. */
function mountAppearancePage(): void {
  document.documentElement.setAttribute('data-theme', 'dark');
  document.body.innerHTML = `
    <main data-app-shell-main-surface>
      <div class="page-sections">
        <section class="flex flex-col" id="visual">
          <div class="codex-header"><div><div class="font-medium codex-title">视觉风格</div></div></div>
          <div class="codex-body">
            <div class="rounded-2xl codex-card" style="background-color: var(--color-background-panel)">
              <div class="@container/settings-row mode-row">
                <input type="radio" name="appearance-theme" value="dark" checked>
              </div>
            </div>
            <section aria-labelledby="theme-title">
              <div class="rounded-2xl codex-card">
                <div class="@container/settings-row codex-row">
                  <div class="codex-row-left"><div class="codex-label-wrap">
                    <div class="font-medium codex-label">强调色</div>
                  </div></div>
                  <div class="codex-row-right"><button>绿色</button></div>
                </div>
              </div>
            </section>
          </div>
        </section>
        <section class="flex flex-col" id="advanced"></section>
      </div>
    </main>`;
}

function panel(): HTMLElement | null {
  return document.querySelector(`[${SETTINGS_PANEL_ATTRIBUTE}]`);
}

function tile(mode: 'dark' | 'light', slug: string): HTMLElement {
  return document.querySelector(
    `[data-woodfish-mode="${mode}"] [data-woodfish-palette="${slug}"]`
  ) as HTMLElement;
}

function feature(key: string): HTMLElement {
  return document.querySelector(`[data-woodfish-feature="${key}"]`) as HTMLElement;
}

function settle(): void {
  for (let index = 0; index < 5; index += 1) {
    jest.runOnlyPendingTimers();
  }
}

const cleanups: Array<() => void> = [];
/** Runs `cleanup` after the current test, even if it fails. */
function afterThis(cleanup: () => void): void {
  cleanups.push(cleanup);
}

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback: FrameRequestCallback) =>
      Number(setTimeout(() => callback(0), 0))
    );
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => clearTimeout(id));
  mountAppearancePage();
});

afterEach(() => {
  (host[CODEX_CONTROLLER_KEY] as CodexOverlayController | undefined)?.dispose?.();
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
  delete host[CODEX_CONTROLLER_KEY];
  delete host[CODEX_SETTINGS_BINDING];
  delete host.codexPlus;
  localStorage.clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('settings panel', () => {
  it('adds a Woodfish section after the visual style section, styled like Codex', () => {
    startCodexOverlay({ palette: { dark: 'dracula' } }, 'cdp');
    const section = panel();
    expect(section?.previousElementSibling?.id).toBe('visual');
    expect(section?.nextElementSibling?.id).toBe('advanced');
    expect(section?.className).toBe('flex flex-col');
    expect(section?.querySelector('.codex-card')?.getAttribute('style')).toContain(
      '--color-background-panel'
    );
    expect(section?.querySelectorAll('.codex-row').length).toBeGreaterThanOrEqual(6);
    expect(document.getElementById('woodfish-codex-settings')).not.toBeNull();

    const dark = [
      ...document.querySelectorAll<HTMLElement>('[data-woodfish-mode="dark"] [role="radio"]'),
    ];
    expect(dark.map((button) => button.dataset.woodfishPalette)).toEqual([
      '',
      'dark',
      'dracula',
      'black',
      'neon',
    ]);
    const light = [
      ...document.querySelectorAll<HTMLElement>('[data-woodfish-mode="light"] [role="radio"]'),
    ];
    expect(light.map((button) => button.dataset.woodfishPalette)).toEqual(['', 'light']);
    expect(tile('dark', 'dracula').getAttribute('aria-checked')).toBe('true');
    expect(tile('light', '').getAttribute('aria-checked')).toBe('true');
    expect(feature('codeGradient').getAttribute('aria-checked')).toBe('true');
    expect(feature('bodyText').getAttribute('aria-checked')).toBe('false');
  });

  it('applies a click at once and hands the change to the watcher binding', () => {
    const calls: string[] = [];
    host[CODEX_SETTINGS_BINDING] = (payload: string): void => {
      calls.push(payload);
    };
    const overlay = startCodexOverlay({}, 'cdp');
    tile('dark', 'neon').click();
    expect(overlay.settings().palette.dark).toBe('neon');
    expect(document.getElementById('woodfish-codex-palette')?.textContent).toContain('#FF2E97');
    expect(tile('dark', 'neon').getAttribute('aria-checked')).toBe('true');

    feature('glass').click();
    expect(overlay.settings().glass.enabled).toBe(false);
    expect(document.getElementById('woodfish-codex-glass')).toBeNull();
    expect(feature('glass').getAttribute('aria-checked')).toBe('false');

    tile('dark', '').click();
    expect(overlay.settings().palette.dark).toBeNull();
    expect(calls.map((payload) => JSON.parse(payload) as unknown)).toEqual([
      { palette: { dark: 'neon' } },
      { glass: { enabled: false } },
      { palette: { dark: null } },
    ]);
  });

  it('reflects settings changed elsewhere (the CLI or another window)', () => {
    const overlay = startCodexOverlay({}, 'cdp');
    overlay.update({ palette: { dark: 'black' }, caret: { enabled: false } });
    expect(tile('dark', 'black').getAttribute('aria-checked')).toBe('true');
    expect(feature('caret').getAttribute('aria-checked')).toBe('false');
  });

  it('follows the page: removed when it closes, mounted again when it reopens', async () => {
    const page = document.querySelector('.page-sections')?.innerHTML ?? '';
    const overlay = startCodexOverlay({}, 'cdp');
    document.querySelector('.page-sections')?.remove();
    // Mutation observers report in a microtask; then the panel's mount timer runs.
    await Promise.resolve();
    settle();
    expect(panel()).toBeNull();

    const sections = document.createElement('div');
    sections.className = 'page-sections';
    sections.innerHTML = page;
    document.querySelector('main')?.append(sections);
    await Promise.resolve();
    settle();
    expect(panel()?.previousElementSibling?.id).toBe('visual');

    overlay.dispose();
    expect(panel()).toBeNull();
    expect(document.head.querySelectorAll('style')).toHaveLength(0);
  });

  it('falls back to Woodfish layout classes when Codex markup changed', () => {
    document.body.innerHTML = `<main data-app-shell-main-surface><section><div></div><div></div>
      <input type="radio" name="appearance-theme"></section></main>`;
    startCodexOverlay({}, 'cdp');
    expect(panel()?.className).toBe('woodfish-settings-fallback-section');
    expect(panel()?.querySelector('.woodfish-settings-fallback-card')).not.toBeNull();
  });

  it('keeps Codex++ changes in localStorage and applies them on the next boot', () => {
    const realLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL('app://-/index.html'),
    });
    afterThis(() =>
      Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
    );
    bootFromUserScript({ palette: { dark: 'neon' } });
    settle();
    expect(panel()?.getAttribute(CODEX_PLUS_NODE_ATTRIBUTE)).toBe('woodfish');
    tile('dark', 'dracula').click();
    feature('caret').click();
    expect(JSON.parse(localStorage.getItem(CODEX_USERSCRIPT_STORAGE_KEY) ?? '{}')).toEqual({
      palette: { dark: 'dracula' },
      caret: { enabled: false },
    });

    (host[CODEX_CONTROLLER_KEY] as CodexOverlayController).dispose();
    bootFromUserScript({ palette: { dark: 'neon' } });
    settle();
    const controller = host[CODEX_CONTROLLER_KEY] as CodexOverlayController;
    expect(controller.settings().palette.dark).toBe('dracula');
    expect(controller.settings().caret.enabled).toBe(false);
  });

  it('stays away from other settings pages', () => {
    document.body.innerHTML = '<main data-app-shell-main-surface><section></section></main>';
    startCodexOverlay({}, 'cdp');
    settle();
    expect(panel()).toBeNull();
  });
});
