import { findCodexPalette } from '../settings';
import { CODEX_CONTROLLER_KEY } from '../protocol';
import { CodexOverlayController, startCodexOverlay } from '../renderer';
import { DIFF_STYLE_ATTRIBUTE, mapDiffColor } from '../renderer/diffs';

type Host = Record<string, unknown>;
const host = globalThis as unknown as Host;

/** A trimmed copy of Codex's diff viewer: Shiki spans inside an open shadow root. */
function mountDiff(): ShadowRoot {
  document.documentElement.setAttribute('data-theme', 'dark');
  document.body.innerHTML = '<main data-app-shell-main-surface></main>';
  const viewer = document.createElement('diffs-container');
  const root = viewer.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <pre data-diff><code data-code><div data-content>
      <div data-line="1" data-line-type="change-addition">
        <span style="color:#F67576">const</span>
        <span style="color:#85DF7B">"x"</span>
        <span class="word" style="color:#FA994C"><span style="color:#FA994C">wrapped</span></span>
      </div>
    </div></code></pre>`;
  document.querySelector('main')?.append(viewer);
  return root;
}

function settle(): void {
  for (let index = 0; index < 6; index += 1) {
    jest.runOnlyPendingTimers();
  }
}

function span(root: ShadowRoot, text: string): HTMLElement {
  return [...root.querySelectorAll<HTMLElement>('span')].find(
    (element) => element.firstElementChild === null && element.textContent === text
  ) as HTMLElement;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback: FrameRequestCallback) =>
      Number(setTimeout(() => callback(0), 0))
    );
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => clearTimeout(id));
});

afterEach(() => {
  (host[CODEX_CONTROLLER_KEY] as CodexOverlayController | undefined)?.dispose?.();
  delete host[CODEX_CONTROLLER_KEY];
  jest.useRealTimers();
  jest.restoreAllMocks();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('mapDiffColor', () => {
  it("maps the diff viewer's theme colors to palette roles and keeps unknown ones", () => {
    const dracula = findCodexPalette('dracula');
    expect(mapDiffColor('rgb(246, 117, 118)', dracula)).toBe(dracula.tokens.keyword);
    expect(mapDiffColor('rgb(133, 223, 123)', dracula)).toBe(dracula.tokens.string);
    expect(mapDiffColor('rgb(252, 252, 252)', dracula)).toBe(dracula.ui.fg);
    expect(mapDiffColor('rgb(1, 2, 3)', dracula)).toBe('rgb(1, 2, 3)');
    expect(mapDiffColor('rgb(246, 117, 118)', null)).toBe('rgb(246, 117, 118)');
  });
});

describe('diff viewer', () => {
  it('mounts the token styles inside the shadow root and recolors into the palette', () => {
    const root = mountDiff();
    startCodexOverlay({ palette: { dark: 'neon' } }, 'cdp');
    settle();
    expect(root.querySelectorAll(`style[${DIFF_STYLE_ATTRIBUTE}]`)).toHaveLength(1);
    const keyword = span(root, 'const');
    expect(keyword.dataset.woodfishOverlayToken).toBe('true');
    // Neon's keyword color (#FF2E97) instead of the viewer's own red.
    expect(keyword.style.getPropertyValue('--woodfish-overlay-gradient-base')).toBe(
      'rgba(255, 46, 151, 1)'
    );
    expect(root.querySelector<HTMLElement>('.word')?.dataset.woodfishOverlayToken).toBeUndefined();
    expect(span(root, 'wrapped').dataset.woodfishOverlayToken).toBe('true');
  });

  it("keeps the viewer's own colors when the mode has no palette", () => {
    const root = mountDiff();
    startCodexOverlay({ palette: { light: 'light' } }, 'cdp');
    settle();
    expect(span(root, 'const').style.getPropertyValue('--woodfish-overlay-gradient-base')).toBe(
      'rgba(246, 117, 118, 1)'
    );
  });

  it('finds viewers added later and cleans up when effects are turned off', async () => {
    const overlay = startCodexOverlay({}, 'cdp');
    const root = mountDiff();
    // The decorator learns about the new viewer from a mutation record (a microtask).
    await Promise.resolve();
    settle();
    expect(root.querySelectorAll(`style[${DIFF_STYLE_ATTRIBUTE}]`)).toHaveLength(1);
    expect(span(root, 'const').dataset.woodfishOverlayToken).toBe('true');

    overlay.update({ codeGradient: { enabled: false }, codeGlow: { enabled: false } });
    settle();
    expect(root.querySelectorAll(`style[${DIFF_STYLE_ATTRIBUTE}]`)).toHaveLength(0);
    expect(root.querySelectorAll('[data-woodfish-overlay-token]')).toHaveLength(0);
  });

  it('leaves the shadow root as it was after dispose', () => {
    const root = mountDiff();
    const before = root.innerHTML;
    const overlay = startCodexOverlay({ palette: { dark: 'dracula' } }, 'cdp');
    settle();
    overlay.dispose();
    for (const element of root.querySelectorAll<HTMLElement>('[style]')) {
      element.setAttribute('style', element.style.cssText);
    }
    const normalized = (html: string): string => {
      const scratch = document.createElement('div');
      scratch.innerHTML = html;
      for (const element of scratch.querySelectorAll<HTMLElement>('[style]')) {
        element.setAttribute('style', element.style.cssText);
      }
      return scratch.innerHTML;
    };
    expect(root.innerHTML).toBe(normalized(before));
  });
});
