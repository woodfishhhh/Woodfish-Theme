import { PaletteTokenRole, WoodfishPalette } from '@woodfish/theme-core';
import { CodexPaletteSlug, CodexSettings, findCodexPalette } from '../settings';

function mix(color: string, percent: number, base = 'transparent'): string {
  return `color-mix(in oklab, ${color} ${percent}%, ${base})`;
}

const ANSI_NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

/** Codex's integrated terminal colors, from the palette's 16 ANSI colors. */
function terminalVariables(palette: WoodfishPalette): Record<string, string> {
  const variables: Record<string, string> = {
    '--color-codex-terminal-background': palette.ui.bg,
    '--color-codex-terminal-foreground': palette.ui.fg,
    '--color-codex-terminal-selection': mix(palette.ui.accent, 30),
    '--color-codex-terminal-selection-inactive': mix(palette.ui.accent, 18),
  };
  palette.ansi.forEach((color, index) => {
    const name = ANSI_NAMES[index % 8];
    variables[`--color-codex-terminal-ansi-${index < 8 ? '' : 'bright-'}${name}`] = color;
  });
  return variables;
}

/**
 * Codex theme variables a Woodfish palette overrides. Codex generates them at runtime from
 * its chrome theme (accent, ink, surface) inside `@layer theme`; an unlayered rule wins
 * without `!important`, and the semantic `--color-*` variables derive from these. The
 * steps mirror Codex's own: in dark mode elevated surfaces are lighter than the surface
 * (ink mixed in), in light mode they are white. `--app-color-accent-blue` is Codex's
 * primary accent slot, whatever its name says.
 *
 * Codex also derives a gray scale (`--gray-*`) for a few rarely seen controls; only the
 * native theme (config.toml) regenerates that.
 */
export function buildPaletteVariables(palette: WoodfishPalette): Record<string, string> {
  const { ui, tokens } = palette;
  const dark = palette.type === 'dark';
  /** Translucent ink, like Codex's white (dark) or black (light) overlays. */
  const ink = (percent: number): string => mix(ui.fg, percent);
  /** An opaque surface `percent` steps toward the ink. */
  const raised = (percent: number): string => mix(ui.fg, percent, ui.bg);
  const byMode = (darkValue: string, lightValue: string): string => (dark ? darkValue : lightValue);
  const selection = mix(ui.accent, dark ? 34 : 24);
  const userMessage = mix(ui.accent, dark ? 22 : 10, ui.bgWidget);

  return {
    // Codex's chrome theme; its other variables are derived on top of these
    '--codex-base-accent': ui.accent,
    '--codex-base-ink': ui.fg,
    '--codex-base-surface': ui.bg,
    // Surfaces
    '--app-color-background-shell': ui.bgDeep,
    '--app-color-background-surface': ui.bg,
    '--app-color-background-surface-under': ui.bgDeep,
    '--app-color-background-editor-opaque': byMode(raised(6), ui.bgWidget),
    '--app-color-background-elevated-primary': ui.bgWidget,
    '--app-color-background-elevated-primary-opaque': ui.bgWidget,
    '--app-color-background-elevated-secondary': byMode(ink(3), ui.bgWidget),
    '--app-color-background-elevated-secondary-opaque': byMode(raised(6), ui.bgWidget),
    '--app-color-background-elevated-tertiary-opaque': byMode(raised(6), ui.bgAlt),
    '--app-color-background-control': byMode(raised(8), ui.bgWidget),
    '--color-background-control-opaque': byMode(raised(8), ui.bgWidget),
    '--color-background-callout-surface': ui.bgWidget,
    '--color-background-panel': byMode(raised(4), ui.bgWidget),
    '--color-background-composer-action-bar': byMode(raised(6), ui.bgAlt),
    '--color-background-mode-toggle-track': byMode(ink(7), ui.bgAlt),
    '--color-background-mode-toggle-selected': byMode(raised(8), ui.bgWidget),
    '--app-color-background-application-menu': byMode(raised(3), ui.bgAlt),
    '--app-color-foreground-application-menu': ui.fg,
    '--app-color-simple-scrim': ink(10),
    // Accent
    '--app-color-accent-blue': ui.accent,
    '--app-color-accent-purple': ui.accent2,
    '--app-color-icon-accent': ui.accent,
    '--app-color-text-accent': ui.accent,
    '--app-color-text-on-accent': ui.accentFg,
    '--app-color-text-unread-badge': ui.accentFg,
    '--app-color-background-accent': mix(ui.accent, dark ? 22 : 12, ui.bg),
    '--app-color-background-accent-hover': mix(ui.accent, dark ? 26 : 14, ui.bg),
    '--app-color-background-accent-active': mix(ui.accent, dark ? 30 : 17, ui.bg),
    '--app-color-border-focus': ui.accent,
    '--color-background-composer-primary': ui.accent,
    '--color-text-composer-primary': ui.accentFg,
    '--color-background-accent-action': ui.accent,
    '--color-text-accent-action': ui.accentFg,
    '--color-image-generation-accent': ui.accent,
    '--color-background-text-selection': selection,
    '--color-background-attribution-highlight': selection,
    // Messages: the user's own bubble carries a hint of the accent
    '--color-background-user-message': userMessage,
    '--color-background-user-message-compact': userMessage,
    '--color-text-user-message': ui.fg,
    // Text and icons
    '--app-color-text-foreground': ui.fg,
    '--app-color-text-foreground-secondary': ui.fgMuted,
    '--app-color-text-foreground-tertiary': ui.fgSubtle,
    '--app-color-text-secondary': ui.fgMuted,
    '--app-color-icon-primary': mix(ui.fg, 90),
    '--app-color-icon-secondary': ui.fgMuted,
    '--app-color-icon-tertiary': ui.fgSubtle,
    // Primary buttons use the ink color, like Codex's own themes.
    '--app-color-text-button-primary': ui.bg,
    '--app-color-text-button-secondary': ui.fg,
    '--app-color-text-button-tertiary': ui.fgSubtle,
    // Borders
    '--app-color-border': ui.border,
    '--app-color-border-light': mix(ui.border, 60),
    '--app-color-border-heavy': ink(16),
    '--app-color-border-application-menu-separator': ink(dark ? 26 : 12),
    '--color-border-mode-toggle-selected': ui.border,
    // States
    '--app-color-accent-green': ui.success,
    '--app-color-accent-red': ui.error,
    '--app-color-accent-orange': ui.warning,
    '--app-color-accent-yellow': ui.warning,
    '--app-color-text-success': ui.success,
    '--app-color-text-error': ui.error,
    '--app-color-text-warning': ui.warning,
    '--app-color-icon-success': ui.success,
    '--app-color-icon-error': ui.error,
    '--app-color-icon-warning': ui.warning,
    // Diffs and file decorations; line backgrounds stay translucent like Codex's own
    '--app-color-decoration-added': ui.success,
    '--app-color-decoration-deleted': ui.error,
    '--app-color-decoration-modified': ui.warning,
    '--app-color-editor-added': mix(ui.success, dark ? 20 : 15),
    '--app-color-editor-deleted': mix(ui.error, dark ? 20 : 15),
    // Syntax
    '--color-codex-syntax-keyword': tokens.keyword,
    '--color-codex-syntax-string': tokens.string,
    '--color-codex-syntax-comment': tokens.comment,
    '--color-codex-syntax-variable': tokens.variable,
    '--color-codex-syntax-name': tokens.function,
    '--color-codex-syntax-literal': tokens.number,
    '--color-codex-syntax-attribute': tokens.attribute,
    '--color-codex-syntax-error': tokens.invalid,
    ...terminalVariables(palette),
    // Woodfish effects
    '--woodfish-codex-accent-2': ui.accent2,
  };
}

function block(selector: string, variables: Record<string, string>): string {
  const lines = Object.entries(variables).map(([name, value]) => `  ${name}: ${value};`);
  return [`${selector} {`, ...lines, '}'].join('\n');
}

/**
 * The title bar and navigation rail are transparent so Windows 11 Mica shows through.
 * Tinting the page behind them with the palette keeps a hint of Mica while making the
 * window one color instead of a gray frame around a colored page.
 */
export function buildChromeCss(palette: WoodfishPalette, mode: 'dark' | 'light'): string {
  return [
    `[data-theme="${mode}"] body {`,
    `  background-color: ${mix(palette.ui.bgDeep, 78)};`,
    '}',
  ].join('\n');
}

/**
 * Codex colors highlight.js output through only eight syntax slots (functions, types and
 * variables all share one). These rules give the finer hljs classes their own palette
 * role inside code blocks, so a palette's full token set shows up.
 */
const HLJS_ROLES: ReadonlyArray<readonly [PaletteTokenRole, readonly string[]]> = [
  ['keyword', ['.hljs-keyword', '.hljs-doctag']],
  ['function', ['.hljs-title.function_']],
  ['type', ['.hljs-title.class_', '.hljs-type', '.hljs-built_in']],
  ['parameter', ['.hljs-params']],
  ['property', ['.hljs-property', '.hljs-attr']],
  ['variable', ['.hljs-variable', '.hljs-template-variable', '.hljs-subst']],
  ['self', ['.hljs-variable.language_']],
  ['number', ['.hljs-number', '.hljs-literal']],
  ['string', ['.hljs-string', '.hljs-addition']],
  ['regexp', ['.hljs-regexp']],
  ['escape', ['.hljs-char.escape_']],
  ['decorator', ['.hljs-meta']],
  ['tag', ['.hljs-tag', '.hljs-name', '.hljs-selector-tag']],
  ['attribute', ['.hljs-attribute', '.hljs-selector-attr', '.hljs-selector-class']],
  ['operator', ['.hljs-operator']],
  ['punctuation', ['.hljs-punctuation']],
  ['comment', ['.hljs-comment', '.hljs-quote']],
  ['invalid', ['.hljs-deletion']],
];

export function buildHljsRoleCss(palette: WoodfishPalette, mode: 'dark' | 'light'): string {
  const scope = `[data-theme="${mode}"] [data-code-block-source="true"]`;
  return HLJS_ROLES.map(([role, classes]) =>
    [
      `${classes.map((name) => `${scope} ${name}`).join(',\n')} {`,
      `  color: ${palette.tokens[role]};`,
      '}',
    ].join('\n')
  ).join('\n');
}

/** Palette overrides for each Codex appearance mode that has a palette selected. */
export function buildPaletteCss(palette: CodexSettings['palette']): string {
  const modes: Array<['dark' | 'light', CodexPaletteSlug | null]> = [
    ['dark', palette.dark],
    ['light', palette.light],
  ];
  return modes
    .filter((entry): entry is ['dark' | 'light', CodexPaletteSlug] => entry[1] !== null)
    .map(([mode, slug]) => {
      const woodfish = findCodexPalette(slug);
      return [
        block(`[data-theme="${mode}"]`, buildPaletteVariables(woodfish)),
        buildChromeCss(woodfish, mode),
        buildHljsRoleCss(woodfish, mode),
      ].join('\n\n');
    })
    .join('\n\n');
}
