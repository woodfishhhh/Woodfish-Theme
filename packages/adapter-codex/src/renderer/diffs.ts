import { clearTextGradientMarks, TextGradientEngine } from '@woodfish/renderer-runtime';
import { PaletteTokenRole, WoodfishPalette, parseCssColor } from '@woodfish/theme-core';
import { CODEX_SELECTORS } from '../selectors';

/** Attribute on the `<style>` Woodfish mounts inside each diff viewer. */
export const DIFF_STYLE_ATTRIBUTE = 'data-woodfish-codex-diff';

/**
 * Syntax-colored spans inside a diff line: the viewer (Shiki) puts each token's color in
 * an inline style.
 */
export const DIFF_TOKEN_SELECTOR = '[data-diff] [data-line] span[style*="color"]';

/** Wrappers around several tokens (word highlights) keep their background unclipped. */
export function isDiffToken(token: HTMLElement): boolean {
  return token.firstElementChild === null;
}

const DIFF_HOST_SELECTOR = CODEX_SELECTORS.diff.selectors.join(', ');
const SCAN_DELAY_MS = 150;

/**
 * Token colors of the code themes Codex renders diffs with (its "code theme" setting),
 * by palette role, so a Woodfish palette recolors diffs like code blocks. Measured in
 * Codex (see docs/hosts/codex.md); no color means different roles in two themes. Colors
 * not listed keep their own hue and still get the gradient.
 */
const DIFF_THEME_ROLES: Readonly<Record<string, PaletteTokenRole | 'text'>> = {
  // Codex's default dark code theme ("ChatGPT")
  '#F67576': 'keyword',
  '#B06DFF': 'type',
  '#FA994C': 'variable',
  '#6DCBF4': 'number',
  '#85DF7B': 'string',
  // Comments and punctuation share this gray; the comment color keeps both quiet.
  '#999999': 'comment',
  '#FCFCFC': 'text',
  // VS Code Light+ ("vscode-plus")
  '#AF00DB': 'keyword',
  '#0000FF': 'storage',
  '#001080': 'variable',
  '#267F99': 'type',
  '#795E26': 'function',
  '#A31515': 'string',
  '#008000': 'comment',
  '#098658': 'number',
  '#0451A5': 'number',
  '#800000': 'tag',
  '#E50000': 'property',
  '#000000': 'text',
  // VS Code Dark+
  '#C586C0': 'keyword',
  '#569CD6': 'storage',
  '#9CDCFE': 'variable',
  '#4EC9B0': 'type',
  '#DCDCAA': 'function',
  '#CE9178': 'string',
  '#6A9955': 'comment',
  '#B5CEA8': 'number',
  '#D4D4D4': 'text',
};

function toHex(cssColor: string): string | null {
  const color = parseCssColor(cssColor);
  if (!color) {
    return null;
  }
  const channel = (value: number): string =>
    Math.round(value).toString(16).padStart(2, '0').toUpperCase();
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

/** The palette color for a diff token's inline color, or the color itself if unknown. */
export function mapDiffColor(cssColor: string, palette: WoodfishPalette | null): string {
  if (!palette) {
    return cssColor;
  }
  const hex = toHex(cssColor);
  const role = hex ? DIFF_THEME_ROLES[hex] : undefined;
  if (!role) {
    return cssColor;
  }
  return role === 'text' ? palette.ui.fg : palette.tokens[role];
}

export interface DiffDecorator {
  /** Paints the diffs with this engine (or stops painting them with `null`). */
  setEngine: (engine: TextGradientEngine | null) => void;
  /** Replaces the stylesheet mounted in every diff viewer; empty removes it. */
  setCss: (css: string) => void;
  dispose: () => void;
}

/**
 * Finds Codex's diff viewers (custom elements with an open shadow root), mounts the diff
 * stylesheet inside each one and hands their shadow roots to the gradient engine.
 */
export function startDiffDecorator(
  nodeAttributes: Readonly<Record<string, string>> = {}
): DiffDecorator {
  const roots = new Map<ShadowRoot, HTMLStyleElement | null>();
  let engine: TextGradientEngine | null = null;
  let css = '';
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let disposed = false;

  function applyCss(root: ShadowRoot): void {
    let style = roots.get(root) ?? null;
    if (!css) {
      style?.remove();
      roots.set(root, null);
      return;
    }
    if (!style || !style.isConnected) {
      style = document.createElement('style');
      style.setAttribute(DIFF_STYLE_ATTRIBUTE, 'true');
      for (const [name, value] of Object.entries(nodeAttributes)) {
        style.setAttribute(name, value);
      }
      root.append(style);
      roots.set(root, style);
    }
    if (style.textContent !== css) {
      style.textContent = css;
    }
  }

  function scan(): void {
    timer = null;
    if (disposed) {
      return;
    }
    for (const root of roots.keys()) {
      if (!root.isConnected) {
        roots.delete(root);
      }
    }
    for (const host of document.querySelectorAll(DIFF_HOST_SELECTOR)) {
      const root = host.shadowRoot;
      if (!root || roots.has(root)) {
        continue;
      }
      roots.set(root, null);
      applyCss(root);
      engine?.observeRoot(root);
    }
  }

  function schedule(): void {
    if (timer === null && !disposed) {
      timer = globalThis.setTimeout(scan, SCAN_DELAY_MS);
    }
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  scan();

  return {
    setEngine: (next: TextGradientEngine | null): void => {
      engine = next;
      for (const root of roots.keys()) {
        if (engine) {
          engine.observeRoot(root);
        } else {
          clearTextGradientMarks(root);
        }
      }
    },
    setCss: (next: string): void => {
      css = next;
      for (const root of roots.keys()) {
        applyCss(root);
      }
    },
    dispose: (): void => {
      disposed = true;
      observer.disconnect();
      if (timer !== null) {
        globalThis.clearTimeout(timer);
      }
      for (const [root, style] of roots) {
        style?.remove();
        clearTextGradientMarks(root);
      }
      roots.clear();
    },
  };
}
