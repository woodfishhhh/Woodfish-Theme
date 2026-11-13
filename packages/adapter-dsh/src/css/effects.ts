import {
  PAINTED_TOKEN_SELECTOR,
  buildGlowDeclarations,
  buildGradientDeclarations,
  buildGradientImage,
  buildLightGlowDeclarations,
  buildNoiseDataUri,
  buildPunctuationGlowDeclarations,
  formatCssNumber,
} from '@woodfish/renderer-runtime';
import { CODE_ROOT_SELECTOR, LIGHT_BODY, modeScope, selectorOf } from '../selectors';
import { DshSettings } from '../settings';

const ANGLE_VARIABLE = '--woodfish-dsh-angle';
/** Accent used by Woodfish effects; follows the palette or dsh's own accent. */
const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)';
/** Second accent: the palette's, otherwise the accent rotated in OKLCH. */
const ACCENT_2 = `var(--woodfish-dsh-accent-2, oklch(from ${ACCENT} l c calc(h + 60)))`;

function rule(selector: string, declarations: string[]): string {
  return [`${selector} {`, ...declarations, '}'].join('\n');
}

function scoped(scope: string, inner: string): string {
  return inner
    .split(',')
    .map((part) => `${scope} ${part.trim()}`)
    .join(',\n');
}

function indent(css: string): string {
  return css
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

/** Gradient and glow on painted code tokens. */
export function buildCodeCss(settings: DshSettings): string {
  const parts: string[] = [];
  const tokens = scoped(CODE_ROOT_SELECTOR, PAINTED_TOKEN_SELECTOR);
  const declarations: string[] = [];
  if (settings.codeGradient.enabled) {
    parts.push(
      rule(':root', [`  ${ANGLE_VARIABLE}: ${formatCssNumber(settings.codeGradient.angle)}deg;`])
    );
    declarations.push(...buildGradientDeclarations(ANGLE_VARIABLE));
  }
  if (settings.codeGlow.enabled) {
    declarations.push(...buildGlowDeclarations(settings.codeGlow.intensity));
  }
  if (declarations.length > 0) {
    parts.push(rule(tokens, declarations));
  }
  if (settings.codeGlow.enabled) {
    const intensity = settings.codeGlow.intensity;
    parts.push(
      rule(
        scoped(CODE_ROOT_SELECTOR, `${PAINTED_TOKEN_SELECTOR}[data-woodfish-punctuation="true"]`),
        buildPunctuationGlowDeclarations(intensity)
      ),
      // Light mode glows in a bright tint of the text hue (theme-core), not a dark halo.
      rule(scoped(LIGHT_BODY, tokens), buildLightGlowDeclarations(intensity))
    );
  }
  return parts.join('\n\n');
}

/**
 * Frosted glass for menus, popovers and the dialog mask. dsh already draws every floating
 * surface with `background: var(--dsw-specific-menu)` and `backdrop-filter:
 * var(--dsw-menu-backdrop-filter)`, so the glass is a variable override: no element
 * selectors and no `!important`. Main surfaces stay opaque.
 */
export function buildGlassCss(settings: DshSettings): string {
  if (!settings.glass.enabled) {
    return '';
  }
  const glass = settings.glass;
  const tint = `color-mix(in oklab, var(--dsw-alias-bg-layer-2) ${formatCssNumber(
    glass.opacity * 100
  )}%, transparent)`;
  const filter = `blur(${formatCssNumber(glass.blur)}px) saturate(${formatCssNumber(glass.saturate)}%)`;
  const surface =
    glass.noise > 0 ? `${buildNoiseDataUri(glass.noise)}, linear-gradient(${tint}, ${tint})` : tint;
  const variables = [
    `  --dsw-menu-surface-fill: ${tint};`,
    `  --dsw-specific-menu: ${surface};`,
    `  --dsw-menu-backdrop-filter: ${filter};`,
  ];
  return [
    rule(`${modeScope('dark')},\n${modeScope('light')}`, variables),
    '@media (prefers-reduced-transparency: reduce) {',
    indent(
      rule(`${modeScope('dark')},\n${modeScope('light')}`, [
        '  --dsw-menu-backdrop-filter: none;',
        '  --dsw-specific-menu: var(--dsw-alias-bg-layer-2);',
      ])
    ),
    '}',
  ].join('\n');
}

/**
 * Accent touches: a glow around the focused composer, a gradient pill on the active
 * session row and a two-accent send button.
 */
export function buildAccentCss(settings: DshSettings): string {
  if (!settings.accent.enabled) {
    return '';
  }
  const activeSession = selectorOf('activeSession');
  return [
    // dsh declares its accent on `body`, so the derived variables must be declared there too.
    rule('body', [
      `  --woodfish-dsh-accent: ${ACCENT};`,
      `  --woodfish-dsh-accent-alt: ${ACCENT_2};`,
    ]),
    rule(`${selectorOf('composer')}:focus-within`, [
      '  box-shadow:',
      '    0 0 0 1px color-mix(in oklab, var(--woodfish-dsh-accent) 55%, transparent),',
      '    0 0 22px -8px var(--woodfish-dsh-accent),',
      '    0 0 34px -14px var(--woodfish-dsh-accent-alt) !important;',
    ]),
    // A short pill at the row's left edge; dsh's own selected background stays.
    rule(activeSession, ['  position: relative;']),
    rule(`${activeSession}::before`, [
      '  content: "";',
      '  position: absolute;',
      '  left: 2px;',
      '  top: 50%;',
      '  width: 3px;',
      '  height: 16px;',
      '  border-radius: 999px;',
      '  transform: translateY(-50%);',
      '  background-image: linear-gradient(',
      '    180deg,',
      '    var(--woodfish-dsh-accent),',
      '    var(--woodfish-dsh-accent-alt)',
      '  );',
      '  box-shadow: 0 0 6px color-mix(in oklab, var(--woodfish-dsh-accent) 45%, transparent);',
      '  pointer-events: none;',
    ]),
    rule(`${selectorOf('composerSendButton')}:not(:disabled)`, [
      '  background-image: linear-gradient(',
      '    135deg,',
      '    var(--woodfish-dsh-accent),',
      '    color-mix(in oklab, var(--woodfish-dsh-accent-alt) 50%, var(--woodfish-dsh-accent))',
      '  ) !important;',
      '  box-shadow: 0 0 14px -4px color-mix(in oklab, var(--woodfish-dsh-accent) 70%, transparent) !important;',
    ]),
  ].join('\n\n');
}

/**
 * The caret is a single color, so the rainbow cycles over time through the stops.
 * Reduced motion keeps a static accent caret.
 */
export function buildCaretCss(settings: DshSettings): string {
  if (!settings.caret.enabled) {
    return '';
  }
  const stops = settings.caret.gradientStops;
  const frames = [...stops, stops[0]].map((color, index, all) => {
    const percent = formatCssNumber((index / (all.length - 1)) * 100);
    return `  ${percent}% { caret-color: ${color}; }`;
  });
  const editor = selectorOf('composerEditor');
  return [
    ['@keyframes woodfish-dsh-caret {', ...frames, '}'].join('\n'),
    rule(editor, [
      `  caret-color: ${stops[0]} !important;`,
      `  animation: woodfish-dsh-caret ${formatCssNumber(settings.caret.animationDuration)}s linear infinite !important;`,
    ]),
    [
      '@media (prefers-reduced-motion: reduce) {',
      `  ${editor} { animation: none !important; caret-color: ${ACCENT} !important; }`,
      '}',
    ].join('\n'),
  ].join('\n\n');
}

/** Optional gradient on assistant reply text; links, code and math keep their colors. */
export function buildBodyTextCss(settings: DshSettings): string {
  if (!settings.bodyText.enabled) {
    return '';
  }
  const painted = `${selectorOf('assistantMarkdown')} ${PAINTED_TOKEN_SELECTOR}`;
  return [
    rule(':root', [`  ${ANGLE_VARIABLE}: ${formatCssNumber(settings.codeGradient.angle)}deg;`]),
    rule(painted, [
      `  background-image: ${buildGradientImage(ANGLE_VARIABLE)} !important;`,
      '  background-clip: text !important;',
      '  -webkit-background-clip: text !important;',
      '  -webkit-text-fill-color: transparent !important;',
    ]),
    rule(`${painted} :is(a, code, pre, .katex, [data-code-block-content])`, [
      '  -webkit-text-fill-color: currentColor !important;',
    ]),
  ].join('\n\n');
}
