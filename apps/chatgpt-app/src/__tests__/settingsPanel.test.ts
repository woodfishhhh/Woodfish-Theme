import { EffectSource } from '@woodfish/renderer-runtime';
import { EffectValues, normalizeEffectManifest } from '@woodfish/theme-core';
import {
  CODEX_CONTROLLER_KEY,
  CODEX_PLUS_NODE_ATTRIBUTE,
  CODEX_RELOAD_BINDING,
  CODEX_SETTINGS_BINDING,
  CODEX_USERSCRIPT_STORAGE_KEY,
} from '../protocol';
import { CodexOverlayController, bootFromUserScript, startCodexOverlay } from '../renderer';
import { SETTINGS_PANEL_ATTRIBUTE } from '../renderer/settingsPanel';

type Host = Record<string, unknown>;
const host = globalThis as unknown as Host;

const PARTICLES = {
  name: '打字粒子',
  description: '光点',
  hosts: ['codex'],
  params: {
    count: { type: 'number', default: 8, min: 1, max: 40, step: 1, label: '每次粒子数' },
    shake: { type: 'boolean', default: false, label: '震动' },
    colors: {
      type: 'select',
      default: 'theme',
      options: [
        { value: 'theme', label: '主题' },
        { value: 'single', label: '单色' },
      ],
      label: '颜色',
    },
    color: { type: 'color', default: '#ffffff', label: '单色颜色' },
  },
};

function particles(values: Partial<EffectValues> = {}, manifest: object = PARTICLES): EffectSource {
  return {
    id: 'typing-particles',
    hash: 'tp',
    manifest: normalizeEffectManifest(manifest),
    values: {
      enabled: true,
      count: 8,
      shake: false,
      colors: 'theme',
      color: '#ffffff',
      ...values,
    } as EffectValues,
    factory: (module) => {
      module.exports = () => ({});
    },
  };
}

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

function effectSwitch(id: string): HTMLElement {
  return document.querySelector(`[data-woodfish-effect-switch="${id}"]`) as HTMLElement;
}

function param(key: string): HTMLElement {
  return document.querySelector(`[data-woodfish-effect-param="${key}"]`) as HTMLElement;
}

function settle(): void {
  for (let index = 0; index < 5; index += 1) {
    jest.runOnlyPendingTimers();
  }
}

/** Captures what the page hands to the watcher, after the save delay. */
function captureSaves(): unknown[] {
  const calls: unknown[] = [];
  host[CODEX_SETTINGS_BINDING] = (payload: string): void => {
    calls.push(JSON.parse(payload));
  };
  return calls;
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
  delete host[CODEX_RELOAD_BINDING];
  delete host.codexPlus;
  localStorage.clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('settings panel', () => {
  it('adds a Woodfish 外观 section after the visual style section, styled like Codex', () => {
    startCodexOverlay({ palette: { dark: 'dracula' } }, 'cdp', [particles()]);
    const section = panel();
    expect(section?.getAttribute('aria-label')).toBe('Woodfish 外观');
    expect(section?.previousElementSibling?.id).toBe('visual');
    expect(section?.nextElementSibling?.id).toBe('advanced');
    expect(section?.className).toBe('flex flex-col');
    expect(section?.querySelector('.codex-card')?.getAttribute('style')).toContain(
      '--color-background-panel'
    );
    expect(document.getElementById('woodfish-codex-settings')).not.toBeNull();
    const dark = [
      ...document.querySelectorAll<HTMLElement>('[data-woodfish-mode="dark"] [role="radio"]'),
    ];
    expect(dark).toHaveLength(13);
    expect(tile('dark', 'dracula').getAttribute('aria-checked')).toBe('true');
    expect(tile('light', '').getAttribute('aria-checked')).toBe('true');
    expect(effectSwitch('typing-particles').getAttribute('aria-checked')).toBe('true');
    // Parameters are folded until asked for, and generated from effect.json.
    const body = document.querySelector(
      '[data-woodfish-effect-body="typing-particles"]'
    ) as HTMLElement;
    expect(body.hidden).toBe(true);
    (
      document.querySelector('[data-woodfish-effect-toggle="typing-particles"]') as HTMLElement
    ).click();
    expect(body.hidden).toBe(false);
    expect((param('count') as HTMLInputElement).type).toBe('range');
    expect((param('count') as HTMLInputElement).value).toBe('8');
    expect(param('shake').getAttribute('role')).toBe('switch');
    expect(param('colors').getAttribute('role')).toBe('radiogroup');
    expect((param('color') as HTMLInputElement).type).toBe('color');
    expect(section?.querySelector('[data-woodfish-effects-reload]')).not.toBeNull();
  });

  it('applies changes at once and saves them through the watcher binding', () => {
    const saves = captureSaves();
    const overlay = startCodexOverlay({}, 'cdp', [particles()]);
    tile('dark', 'neon').click();
    expect(overlay.settings().palette.dark).toBe('neon');
    expect(document.getElementById('woodfish-codex-palette')?.textContent).toContain('#FF2E97');

    effectSwitch('typing-particles').click();
    expect(overlay.effects()[0].values.enabled).toBe(false);
    expect(effectSwitch('typing-particles').getAttribute('aria-checked')).toBe('false');

    const count = param('count') as HTMLInputElement;
    for (const value of ['12', '20']) {
      count.value = value;
      count.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(overlay.effects()[0].values.count).toBe(20);
    (param('colors').querySelector('[data-value="single"]') as HTMLElement).click();
    expect(saves).toEqual([]);
    jest.advanceTimersByTime(300);
    expect(saves).toEqual([
      {
        palette: { dark: 'neon' },
        effects: { 'typing-particles': { enabled: false, count: 20, colors: 'single' } },
      },
    ]);
  });

  it('puts an effect back to its defaults', () => {
    const saves = captureSaves();
    const overlay = startCodexOverlay({}, 'cdp', [particles({ count: 30, shake: true })]);
    (
      document.querySelector('[data-woodfish-effect-reset="typing-particles"]') as HTMLElement
    ).click();
    expect(overlay.effects()[0].values).toMatchObject({ count: 8, shake: false });
    jest.advanceTimersByTime(300);
    expect(saves).toEqual([{ reset: ['typing-particles'] }]);
  });

  it('asks the watcher to reload the effects from disk', () => {
    const calls: string[] = [];
    host[CODEX_RELOAD_BINDING] = (payload: string) => calls.push(payload);
    startCodexOverlay({}, 'cdp', [particles()]);
    (document.querySelector('[data-woodfish-effects-reload]') as HTMLElement).click();
    expect(calls).toEqual(['reload']);
  });

  it('reflects changes made elsewhere: the CLI, an AI editing params.json, new parameters', () => {
    const overlay = startCodexOverlay({}, 'cdp', [particles()]);
    overlay.update({ palette: { dark: 'black' } }, [particles({ count: 33 })]);
    expect(tile('dark', 'black').getAttribute('aria-checked')).toBe('true');
    expect((param('count') as HTMLInputElement).value).toBe('33');
    const extended = {
      ...PARTICLES,
      params: { ...PARTICLES.params, gravity: { type: 'number', default: 450, min: 0, max: 900 } },
    };
    overlay.update({}, [particles({}, extended)]);
    expect((param('gravity') as HTMLInputElement).value).toBe('450');
  });

  it('shows why an effect failed', () => {
    startCodexOverlay({}, 'cdp', [
      { ...particles(), id: 'broken', error: 'effect.js 第 3 行有语法错误：Unexpected token' },
    ]);
    const group = document.querySelector('[data-woodfish-effect="broken"]') as HTMLElement;
    expect(group.dataset.state).toBe('failed');
    expect(group.textContent).toContain('第 3 行有语法错误');
  });

  it('follows the page: removed when it closes, mounted again when it reopens', async () => {
    const page = document.querySelector('.page-sections')?.innerHTML ?? '';
    const overlay = startCodexOverlay({}, 'cdp', [particles()]);
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
    bootFromUserScript({ palette: { dark: 'neon' } }, [particles()]);
    settle();
    expect(panel()?.getAttribute(CODEX_PLUS_NODE_ATTRIBUTE)).toBe('woodfish');
    expect(panel()?.querySelector('[data-woodfish-effects-reload]')).toBeNull();
    tile('dark', 'dracula').click();
    effectSwitch('typing-particles').click();
    jest.advanceTimersByTime(300);
    expect(JSON.parse(localStorage.getItem(CODEX_USERSCRIPT_STORAGE_KEY) ?? '{}')).toEqual({
      palette: { dark: 'dracula' },
      effects: { 'typing-particles': { enabled: false } },
    });

    (host[CODEX_CONTROLLER_KEY] as CodexOverlayController).dispose();
    bootFromUserScript({ palette: { dark: 'neon' } }, [particles()]);
    settle();
    const controller = host[CODEX_CONTROLLER_KEY] as CodexOverlayController;
    expect(controller.settings().palette.dark).toBe('dracula');
    expect(controller.effects()[0].values.enabled).toBe(false);
  });

  it('stays away from other settings pages', () => {
    document.body.innerHTML = '<main data-app-shell-main-surface><section></section></main>';
    startCodexOverlay({}, 'cdp');
    settle();
    expect(panel()).toBeNull();
  });
});
