import { WoodfishPalette } from '@woodfish/theme-core';
import { modeScope, selectorOf } from '../selectors';
import { DshMode, DshSettings, findDshPalette } from '../settings';

function mix(color: string, percent: number, base = 'transparent'): string {
  return `color-mix(in oklab, ${color} ${percent}%, ${base})`;
}

/**
 * Full dsh token map overridden by a Woodfish palette. Covers every `--dsw-alias-*`,
 * `--dsw-specific-*`, `--dsw-linear-gradient-*` and onboarding/diff/card/dialog token in
 * dsh 0.2.2-rc.5 so no surface leaks the default neutral gray palette.
 */
export function buildPaletteVariables(palette: WoodfishPalette): Record<string, string> {
  const { tokens, ui } = palette;
  const dark = palette.type === 'dark';
  const ink = (percent: number): string => mix(ui.fg, percent);
  const raised = (percent: number): string => mix(ui.fg, percent, ui.bg);
  const byMode = (darkValue: string, lightValue: string): string => (dark ? darkValue : lightValue);
  const codeBlock = byMode(raised(3), ui.bgAlt);
  const floating = byMode(raised(14), mix(ui.fg, 88, ui.bg));
  const onFloating = byMode(ui.fg, ui.bg);
  const layer1 = byMode(raised(4), ui.bgWidget);
  const layer2 = byMode(raised(7), ui.bgWidget);
  const layer3 = byMode(raised(10), ui.bgWidget);

  return {
    // Surfaces & elevation
    '--dsw-alias-bg-base': ui.bg,
    '--dsw-alias-bg-document-preview': ui.bg,
    '--dsw-alias-label-document-preview': ui.fgMuted,
    '--dsw-alias-bg-document-selection': mix(ui.accent, dark ? 34 : 24),
    '--dsw-alias-bg-layer-1': layer1,
    '--dsw-alias-bg-layer-2': layer2,
    '--dsw-alias-bg-layer-3': layer3,
    '--dsw-alias-bg-overlay': byMode(raised(18), raised(10)),
    '--dsw-alias-bg-module-platform': byMode(raised(10), raised(3)),
    '--dsw-alias-bg-multi-select': byMode(raised(10), raised(3)),
    '--dsw-alias-bg-skeleton': ink(6),
    '--dsw-alias-bg-mask-drop': mix(ui.bg, 70),
    '--dsw-alias-bg-mask-1': mix(ui.bg, dark ? 56 : 36),
    '--dsw-alias-bg-mask-2': mix(ui.bg, dark ? 68 : 48),
    '--dsw-alias-bg-mask-3': mix(ui.bg, dark ? 78 : 58),
    // Cards, settings cards & turn triggers
    '--dsw-alias-card-fill': byMode(raised(5), raised(2)),
    '--dsw-alias-card-fill-hover': byMode(raised(8), raised(4)),
    '--dsw-alias-card-tile-fill': byMode(ink(5), mix(ui.bg, 50)),
    '--dsw-alias-settings-card-fill': layer2,
    '--dsw-alias-settings-card-stroke': ink(16),
    '--dsw-alias-turn-trigger-bg': byMode(raised(6), raised(3)),
    '--dsw-alias-turn-trigger-bg-hover': byMode(raised(10), raised(6)),
    '--dsw-alias-tooltip-key-bg': byMode(ink(14), ink(10)),
    '--dsw-specific-guide-hero': byMode(raised(14), raised(8)),
    '--dsw-specific-sidebar-right-flash': mix(ui.accent, dark ? 22 : 16),
    '--dsw-specific-file-upload-track': ink(10),
    // Thinking block fade gradients (hardcoded hex in dsh gradient-shadow-text.css)
    '--dsw-linear-gradient-think': `linear-gradient(180deg, ${ui.bg} 20.19%, ${mix(ui.bg, 0)} 100%)`,
    '--dsw-linear-think-select': `linear-gradient(180deg, ${byMode(raised(7), raised(3))} 20.19%, ${mix(byMode(raised(7), raised(3)), 0)} 100%)`,
    // Sidebar, inputs, bubbles, menus & vibrancy fallbacks
    '--dsw-specific-sidebar-fill': ui.bgAlt,
    '--dsw-specific-sidebar-tint': mix(ui.bgAlt, dark ? 78 : 82),
    '--dsw-specific-sidebar-nav-item-active': byMode(raised(10), raised(7)),
    '--dsw-specific-sidebar-nav-item-active-accent': mix(ui.accent, dark ? 22 : 14, ui.bgAlt),
    '--dsw-specific-input-major': byMode(raised(5), ui.bgWidget),
    '--dsw-specific-login-input': byMode(raised(3), raised(2)),
    '--dsw-specific-selector': byMode(raised(10), raised(5)),
    '--dsw-specific-tip': byMode(raised(10), raised(4)),
    '--dsw-specific-bubble': mix(ui.accent, dark ? 18 : 12, ui.bg),
    '--dsw-specific-bubble-highlight': mix(ui.accent, dark ? 30 : 22, ui.bg),
    '--dsw-menu-surface-fill': mix(ui.bgWidget, dark ? 70 : 76),
    '--dsw-alias-menu-group-header-fill': mix(ui.bgWidget, 94),
    // Brand and accent
    '--dsw-alias-brand-primary': ui.fg,
    '--dsw-alias-brand-primary-invert': ui.bg,
    '--dsw-alias-brand-text': ui.fg,
    '--dsw-alias-brand-primary-new-colorprimary-new-color': ui.accent,
    '--dsw-alias-state-business-primary': ui.accent,
    '--dsw-alias-state-business-secondary': mix(ui.accent, 75, ui.fg),
    '--dsw-alias-state-business-tertiary': mix(ui.accent, dark ? 25 : 15, ui.bg),
    '--dsw-alias-link': ui.info,
    '--dsw-alias-label-deep-diving': mix(ui.accent, 70, ui.fgMuted),
    '--dsw-alias-label-deep-diving-shimmer': mix(ui.accent2, 60, ui.accent),
    // Buttons & toolbar
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
    '--dsw-alias-button-tool-bar-fill': byMode(raised(7), ui.bgWidget),
    '--dsw-alias-button-tool-bar-fill-hover': byMode(raised(11), raised(5)),
    '--dsw-alias-button-tool-bar-fill-active': byMode(raised(15), raised(9)),
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
    '--dsw-alias-label-on-color': ui.accentFg,
    '--dsw-alias-label-shimmer': ink(dark ? 45 : 30),
    '--dsw-alias-menu-icon': ui.fgMuted,
    // Borders and scrollbars
    '--dsw-alias-border-l1': ink(6),
    '--dsw-alias-border-l2': ink(12),
    '--dsw-alias-border-l2-darkmode-thin': ink(6),
    '--dsw-alias-border-l3': ink(16),
    '--dsw-alias-border-l4': ink(20),
    '--dsw-alias-border-inverted': byMode(ink(6), 'transparent'),
    '--dsw-alias-border-inverted2': byMode(ink(8), 'transparent'),
    '--dsw-alias-border-selected': ui.accent,
    '--dsw-alias-switch-thumb': byMode(ui.fg, ui.bg),
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
    // States, toasts, tooltips & hover cards
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
    '--dsw-alias-toast-label': onFloating,
    '--dsw-alias-toast-action': byMode(ui.info, mix(ui.info, 55, ui.bg)),
    '--dsw-alias-tooltip-bg': floating,
    '--dsw-alias-tooltip-label': onFloating,
    '--dsw-alias-hovercard-bg': floating,
    '--dsw-alias-hovercard-label-primary': onFloating,
    '--dsw-alias-hovercard-label-secondary': byMode(ui.fgMuted, mix(ui.bg, 82, ui.fg)),
    '--dsw-alias-hovercard-label-tertiary': byMode(ui.fgSubtle, mix(ui.bg, 64, ui.fg)),
    '--dsw-alias-hovercard-state-done': ui.accent2,
    '--dsw-alias-hovercard-state-error': ui.error,
    // Trajectory view, usage charts and JSON tree
    '--dsw-alias-trajectory-accent': ui.accent,
    '--dsw-alias-chart-messages': ui.info,
    '--dsw-alias-chart-system': ui.fgSubtle,
    '--dsw-alias-chart-tools': ui.accent2,
    '--dsw-alias-json-tree-hover': ink(5),
    '--dsw-alias-json-tree-icon': ui.fgSubtle,
    '--dsw-alias-json-tree-keyword': tokens.keyword,
    '--dsw-alias-json-tree-number': tokens.number,
    '--dsw-alias-json-tree-property': tokens.property,
    '--dsw-alias-json-tree-punctuation': tokens.punctuation,
    '--dsw-alias-json-tree-string': tokens.string,
    // Empty-state illustrations & onboarding
    '--dsw-alias-illustration-background': byMode(raised(10), raised(3)),
    '--dsw-alias-illustration-backing': byMode(raised(20), raised(14)),
    '--dsw-alias-illustration-detail': byMode(raised(40), raised(14)),
    '--dsw-alias-illustration-inset': byMode(raised(20), raised(6)),
    '--dsw-alias-illustration-shadow': byMode(raised(20), raised(6)),
    '--dsw-alias-illustration-surface': byMode(raised(30), raised(6)),
    '--dsw-alias-onboarding-accent': ui.accent,
    '--dsw-alias-onboarding-card-fill': mix(byMode(raised(10), ui.bg), 80),
    '--dsw-alias-onboarding-secondary-fill': byMode(raised(18), ui.bg),
    '--dsw-alias-onboarding-checkbox-border': ink(24),
    '--dsw-gradient-onboarding-bg': `radial-gradient(circle at 20% 20%, ${mix(ui.accent, dark ? 22 : 14, ui.bg)}, ${ui.bg} 70%)`,
    '--dsw-gradient-onboarding-surface': `linear-gradient(135deg, ${layer1}, ${layer2})`,
    // Diffs
    '--dsw-alias-code-diff-added': mix(ui.success, dark ? 14 : 12),
    '--dsw-alias-code-diff-deleted': mix(ui.error, dark ? 14 : 12),
    '--dsw-alias-code-diff-added-text': ui.success,
    '--dsw-alias-code-diff-deleted-text': ui.error,
    '--dsw-alias-file-diff-added-bg': mix(ui.success, dark ? 18 : 14, ui.bg),
    '--dsw-alias-file-diff-added-gutter': mix(ui.success, 10, ui.bg),
    '--dsw-alias-file-diff-added-marker': ui.success,
    '--dsw-alias-file-diff-deleted-bg': mix(ui.error, dark ? 18 : 14, ui.bg),
    '--dsw-alias-file-diff-deleted-gutter': mix(ui.error, 10, ui.bg),
    '--dsw-alias-file-diff-deleted-marker': ui.error,
    '--dsw-alias-file-diff-hunk-bg': mix(ui.info, dark ? 14 : 10, ui.bg),
    '--dsw-alias-file-diff-hunk-text': ui.info,
    // Woodfish effect hooks
    '--woodfish-dsh-accent-2': ui.accent2,
    '--woodfish-dsh-tab-gradient': palette.meta.tabBorderGradient,
    '--woodfish-dsh-selection': mix(ui.accent, dark ? 34 : 24),
  };
}

/**
 * Syntax colors mapped straight onto palette roles for Shiki's `css-variables` theme in
 * Markdown code blocks, sidebar previews and file diffs.
 */
export function buildShikiVariables(palette: WoodfishPalette): Record<string, string> {
  const { tokens, ui } = palette;
  return {
    '--shiki-background': 'transparent',
    '--shiki-foreground': ui.fg,
    '--shiki-token-keyword': tokens.keyword,
    '--shiki-token-function': tokens.function,
    '--shiki-token-parameter': tokens.parameter,
    '--shiki-token-constant': tokens.number,
    '--shiki-token-string': tokens.string,
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

/** Intrusive surface overrides that cover hardcoded dsh styles, native form controls and selections. */
function buildIntrusiveSurfaceCss(scope: string, palette: WoodfishPalette): string {
  const { ui } = palette;
  const dark = palette.type === 'dark';
  const selectionBg = mix(ui.accent, dark ? 34 : 24);
  const dialogBg = mix(ui.fg, dark ? 7 : 0, dark ? ui.bg : ui.bgWidget);
  const modal = selectorOf('settingsModal');
  return [
    block(scope, {
      'background-color': ui.bg,
      color: ui.fg,
      'color-scheme': palette.type,
    }),
    block(`${scope} ::selection`, {
      'background-color': selectionBg,
      color: 'inherit',
    }),
    block(`${scope} ${modal}`, {
      background: dialogBg,
      'border-color': mix(ui.fg, 16),
    }),
    block(`${scope} :is(input, textarea, select)`, {
      'color-scheme': palette.type,
    }),
  ].join('\n\n');
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
        buildIntrusiveSurfaceCss(scope, woodfish),
      ].join('\n\n');
    })
    .filter((css) => css.length > 0)
    .join('\n\n');
}
