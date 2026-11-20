import { WoodfishPalette } from '@woodfish/theme-core';
import { modeScope } from '../selectors';
import { DshMode, DshSettings, findDshPalette } from '../settings';

function mix(color: string, percent: number, base = 'transparent'): string {
  return `color-mix(in oklab, ${color} ${percent}%, ${base})`;
}

/**
 * dsh's alias tokens a Woodfish palette overrides. dsh declares them on `body` (light) and
 * `body[data-ds-dark-theme]` (dark) on top of a fixed neutral scale (`--dsw-static-*`);
 * every component reads the aliases, so replacing them recolors the whole UI. Surfaces
 * follow dsh's own steps: in dark mode raised layers are lighter than the base (ink mixed
 * in), in light mode they are the palette's widget color. Borders and hover fills stay
 * translucent ink, like dsh's.
 */
export function buildPaletteVariables(palette: WoodfishPalette): Record<string, string> {
  const { ui } = palette;
  const dark = palette.type === 'dark';
  /** Translucent ink, like dsh's white (dark) or black (light) overlays. */
  const ink = (percent: number): string => mix(ui.fg, percent);
  /** An opaque surface `percent` steps toward the ink. */
  const raised = (percent: number): string => mix(ui.fg, percent, ui.bg);
  const byMode = (darkValue: string, lightValue: string): string => (dark ? darkValue : lightValue);
  const codeBlock = byMode(raised(3), ui.bgAlt);
  const floating = byMode(raised(14), mix(ui.fg, 88, ui.bg));

  return {
    // Surfaces
    '--dsw-alias-bg-base': ui.bg,
    '--dsw-alias-bg-document-preview': ui.bg,
    '--dsw-alias-label-document-preview': ui.fgMuted,
    '--dsw-alias-bg-document-selection': mix(ui.accent, dark ? 34 : 24),
    '--dsw-alias-bg-layer-1': byMode(raised(4), ui.bgWidget),
    '--dsw-alias-bg-layer-2': byMode(raised(7), ui.bgWidget),
    '--dsw-alias-bg-layer-3': byMode(raised(10), ui.bgWidget),
    '--dsw-alias-bg-overlay': byMode(raised(18), raised(10)),
    '--dsw-alias-bg-module-platform': byMode(raised(10), raised(3)),
    '--dsw-alias-bg-multi-select': byMode(raised(10), raised(3)),
    '--dsw-alias-bg-skeleton': ink(6),
    '--dsw-specific-sidebar-fill': ui.bgAlt,
    '--dsw-specific-sidebar-nav-item-active': byMode(raised(10), raised(7)),
    '--dsw-specific-sidebar-nav-item-active-accent': mix(ui.accent, dark ? 22 : 14, ui.bgAlt),
    '--dsw-specific-input-major': byMode(raised(5), ui.bgWidget),
    '--dsw-specific-login-input': byMode(raised(3), raised(2)),
    '--dsw-specific-selector': byMode(raised(10), raised(5)),
    '--dsw-specific-tip': byMode(raised(10), raised(4)),
    // The user's own bubble carries a hint of the accent, as in the Codex adapter.
    '--dsw-specific-bubble': mix(ui.accent, dark ? 18 : 12, ui.bg),
    '--dsw-specific-bubble-highlight': mix(ui.accent, dark ? 30 : 22, ui.bg),
    '--dsw-menu-surface-fill': mix(ui.bgWidget, dark ? 70 : 76),
    '--dsw-alias-menu-group-header-fill': mix(ui.bgWidget, 94),
    // Brand and accent: dsh's primary buttons use the ink color, its blue marks the accent.
    '--dsw-alias-brand-primary': ui.fg,
    '--dsw-alias-brand-primary-invert': ui.bg,
    '--dsw-alias-brand-text': ui.fg,
    '--dsw-alias-brand-primary-new-colorprimary-new-color': ui.accent,
    '--dsw-alias-state-business-primary': ui.accent,
    '--dsw-alias-state-business-tertiary': mix(ui.accent, dark ? 25 : 15, ui.bg),
    '--dsw-alias-link': ui.info,
    '--dsw-alias-label-deep-diving': mix(ui.accent, 70, ui.fgMuted),
    '--dsw-alias-label-deep-diving-shimmer': mix(ui.accent2, 60, ui.accent),
    // Buttons
    '--dsw-alias-button-contrast-fill': byMode(ui.fg, ui.fgMuted),
    '--dsw-alias-button-elevated-fill': byMode(raised(12), ui.bgWidget),
    '--dsw-alias-button-floating-fill': byMode(raised(7), ui.bgWidget),
    '--dsw-alias-button-floating-hover': byMode(raised(10), raised(4)),
    '--dsw-alias-button-ghost-active-border': ui.fgSubtle,
    '--dsw-alias-button-ghost-active-fill': byMode(raised(12), raised(6)),
    '--dsw-alias-button-ghost-active-hover': byMode(raised(16), raised(9)),
    '--dsw-alias-button-info-fill': ui.accent,
    '--dsw-alias-button-info-hover': mix(ui.accent, 85, ui.fg),
    '--dsw-alias-button-primary-dimmed': byMode(raised(12), raised(6)),
    '--dsw-alias-button-primary-hover': mix(ui.fg, 85, ui.bg),
    // Interaction
    '--dsw-alias-interactive-bg-hover': ink(8),
    '--dsw-alias-interactive-bg-active': ink(14),
    '--dsw-alias-interactive-bg-hover-accent': ink(24),
    '--dsw-alias-interactive-bg-hover-solid': byMode(raised(10), raised(5)),
    '--dsw-alias-interactive-bg-hover-danger': mix(ui.error, 14),
    // Text and icons
    '--dsw-alias-label-primary': ui.fg,
    '--dsw-alias-label-primary-bluish': ui.fg,
    '--dsw-alias-label-primary-dimmed': mix(ui.fg, 90, ui.bg),
    '--dsw-alias-label-primary-foreground': ui.bg,
    '--dsw-alias-label-primary-inverted': ui.bg,
    '--dsw-alias-label-secondary': ui.fgMuted,
    '--dsw-alias-label-tertiary': ui.fgSubtle,
    '--dsw-alias-label-caption': ui.fgSubtle,
    '--dsw-alias-label-dimmed': mix(ui.fg, 30, ui.bg),
    '--dsw-alias-menu-icon': ui.fgMuted,
    // Borders and scrollbars
    '--dsw-alias-border-l1': ink(6),
    '--dsw-alias-border-l2': ink(12),
    '--dsw-alias-border-l2-darkmode-thin': ink(6),
    '--dsw-alias-border-l3': ink(16),
    '--dsw-alias-border-l4': ink(20),
    '--dsw-alias-scrollbar-bg-l1': ink(18),
    '--dsw-alias-scrollbar-bg-l2': ink(24),
    '--dsw-alias-scrollbar-hover-l1': ink(28),
    '--dsw-alias-scrollbar-hover-l2': ink(34),
    // Markdown
    '--dsw-alias-markdown-code-block': codeBlock,
    '--dsw-alias-markdown-code-block-banner': codeBlock,
    '--dsw-alias-markdown-code-segment-selected': byMode(raised(10), ui.bgWidget),
    '--dsw-alias-markdown-code-segment-unselected': codeBlock,
    '--dsw-alias-markdown-inline-code': byMode(raised(8), raised(5)),
    '--dsw-alias-markdown-citation': byMode(raised(10), raised(5)),
    '--dsw-alias-markdown-placeholder': byMode(raised(6), raised(3)),
    '--dsw-alias-markdown-tag': byMode(raised(6), raised(4)),
    // States
    '--dsw-alias-state-done-primary': ui.accent2,
    '--dsw-alias-state-error-primary': ui.error,
    '--dsw-alias-state-error-secondary': ui.error,
    '--dsw-alias-state-idle-primary': ui.fgSubtle,
    '--dsw-alias-state-success-primary': ui.success,
    '--dsw-alias-state-success-secondary': ui.success,
    '--dsw-alias-state-success-tertiary': mix(ui.success, 20, ui.bg),
    '--dsw-alias-state-warn-label': ui.warning,
    '--dsw-alias-state-warn-primary': ui.warning,
    '--dsw-alias-state-warn-secondary': ui.warning,
    '--dsw-alias-state-warn-tertiary': mix(ui.warning, 20, ui.bg),
    '--dsw-alias-toast-bg': floating,
    '--dsw-alias-toast-label': byMode(ui.fg, ui.bg),
    '--dsw-alias-tooltip-bg': floating,
    // Diffs: line backgrounds stay translucent like dsh's
    '--dsw-alias-code-diff-added': mix(ui.success, dark ? 14 : 12),
    '--dsw-alias-code-diff-deleted': mix(ui.error, dark ? 14 : 12),
    '--dsw-alias-file-diff-added-bg': mix(ui.success, dark ? 18 : 14, ui.bg),
    '--dsw-alias-file-diff-added-gutter': mix(ui.success, 10, ui.bg),
    '--dsw-alias-file-diff-added-marker': ui.success,
    '--dsw-alias-file-diff-deleted-bg': mix(ui.error, dark ? 18 : 14, ui.bg),
    '--dsw-alias-file-diff-deleted-gutter': mix(ui.error, 10, ui.bg),
    '--dsw-alias-file-diff-deleted-marker': ui.error,
    // Woodfish effects
    '--woodfish-dsh-accent-2': ui.accent2,
  };
}

/**
 * Syntax colors. dsh highlights code with Shiki's `css-variables` theme, so each token is
 * `color: var(--shiki-token-*)` and the nine slots map straight onto palette roles. The
 * gradient engine then finds these exact colors in the palette's hand-tuned presets.
 */
export function buildShikiVariables(palette: WoodfishPalette): Record<string, string> {
  const { tokens, ui } = palette;
  return {
    '--shiki-foreground': ui.fg,
    '--shiki-token-keyword': tokens.keyword,
    '--shiki-token-function': tokens.function,
    '--shiki-token-parameter': tokens.parameter,
    '--shiki-token-constant': tokens.number,
    '--shiki-token-string': tokens.string,
    // Quoted string literals; `string` is used for unquoted words such as shell arguments.
    '--shiki-token-string-expression': tokens.string,
    '--shiki-token-comment': tokens.comment,
    '--shiki-token-punctuation': tokens.punctuation,
    '--shiki-token-link': tokens.tag,
  };
}

function block(selector: string, variables: Record<string, string>): string {
  const lines = Object.entries(variables).map(([name, value]) => `  ${name}: ${value};`);
  return [`${selector} {`, ...lines, '}'].join('\n');
}

/** Palette overrides for each dsh appearance mode that has a palette selected. */
export function buildPaletteCss(palette: DshSettings['palette']): string {
  const modes: DshMode[] = ['dark', 'light'];
  return modes
    .map((mode) => {
      const slug = palette[mode];
      const woodfish = slug === null ? undefined : findDshPalette(slug);
      if (!woodfish) {
        return '';
      }
      const scope = modeScope(mode);
      return [
        block(scope, {
          ...buildPaletteVariables(woodfish),
          ...buildShikiVariables(woodfish),
        }),
        // dsh paints the canvas behind the app from its boot colors; match the palette.
        block(scope, { 'background-color': woodfish.ui.bg }),
      ].join('\n\n');
    })
    .filter((css) => css.length > 0)
    .join('\n\n');
}
