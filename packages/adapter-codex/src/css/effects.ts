import {
  PAINTED_TOKEN_SELECTOR,
  buildGlowDeclarations,
  buildGradientDeclarations,
  buildNoiseDataUri,
  buildPunctuationGlowDeclarations,
  formatCssNumber,
  scaleGlowRadius,
} from '@woodfish/renderer-runtime';
import { CODE_ROOT_SELECTOR, CODEX_SELECTORS, selectorOf } from '../selectors';
import { CodexSettings } from '../settings';

const ANGLE_VARIABLE = '--woodfish-codex-angle';
/** Accent used by Woodfish effects; follows the palette or the user's Codex accent. */
const ACCENT = 'var(--app-color-text-accent, #339cff)';
/** Second accent: the palette's, otherwise the Codex accent rotated in OKLCH. */
const ACCENT_2 = `var(--woodfish-codex-accent-2, oklch(from ${ACCENT} l c calc(h + 60)))`;

function rule(selector: string, declarations: string[]): string {
  return [`${selector} {`, ...declarations, '}'].join('\n');
}

function scoped(scope: string, inner: string): string {
  return inner
    .split(',')
    .map((part) => `${scope} ${part.trim()}`)
    .join(',\n');
}

/** Gradient and glow on painted code tokens. */
export function buildCodeCss(settings: CodexSettings): string {
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
      // The same glow reads as blur on a bright background, so light mode is softer.
      rule(scoped('[data-theme="light"]', tokens), [
        '  text-shadow:',
        `    0 0 ${scaleGlowRadius(2, intensity)} var(--woodfish-overlay-glow-mid) !important;`,
      ])
    );
  }
  return parts.join('\n\n');
}

/**
 * Gradient and glow for diff tokens. Codex's diff viewer renders into a shadow root,
 * which page styles cannot reach, so this sheet is mounted inside each one. Its colors
 * are fixed inline per token; the engine maps them into the palette and the text takes
 * the mapped color even when the gradient is off. Custom properties such as the angle
 * inherit into the shadow tree.
 */
export function buildDiffCss(settings: CodexSettings): string {
  if (!settings.codeGradient.enabled && !settings.codeGlow.enabled) {
    return '';
  }
  const tokens = `[data-diff] ${PAINTED_TOKEN_SELECTOR}`;
  const declarations = ['  color: var(--woodfish-overlay-gradient-base) !important;'];
  if (settings.codeGradient.enabled) {
    declarations.push(...buildGradientDeclarations(ANGLE_VARIABLE));
  }
  if (settings.codeGlow.enabled) {
    declarations.push(...buildGlowDeclarations(settings.codeGlow.intensity));
  }
  const parts = [rule(tokens, declarations)];
  if (settings.codeGlow.enabled) {
    const intensity = settings.codeGlow.intensity;
    parts.push(
      rule(
        `${tokens}[data-woodfish-punctuation="true"]`,
        buildPunctuationGlowDeclarations(intensity)
      ),
      rule(`:host-context([data-theme="light"]) ${tokens}`, [
        '  text-shadow:',
        `    0 0 ${scaleGlowRadius(2, intensity)} var(--woodfish-overlay-glow-mid) !important;`,
      ])
    );
  }
  return parts.join('\n\n');
}

/**
 * Frosted glass for menus, popovers and dialogs only. Main surfaces are left alone so
 * Codex's own Windows 11 Mica backdrop keeps working.
 */
export function buildGlassCss(settings: CodexSettings): string {
  if (!settings.glass.enabled) {
    return '';
  }
  const glass = settings.glass;
  const targets = CODEX_SELECTORS.floatingLayer.selectors.join(',\n');
  const tint = `color-mix(in oklab, var(--color-surface-elevated, var(--app-color-background-elevated-primary)) ${formatCssNumber(
    glass.opacity * 100
  )}%, transparent)`;
  const filter = `blur(${formatCssNumber(glass.blur)}px) saturate(${formatCssNumber(glass.saturate)}%)`;
  const declarations = [
    `  background-color: ${tint} !important;`,
    `  -webkit-backdrop-filter: ${filter} !important;`,
    `  backdrop-filter: ${filter} !important;`,
  ];
  if (glass.noise > 0) {
    declarations.push(`  background-image: ${buildNoiseDataUri(glass.noise)} !important;`);
  }
  if (glass.borderRadius > 0) {
    declarations.push(`  border-radius: ${formatCssNumber(glass.borderRadius)}px !important;`);
  }
  return [
    `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {`,
    rule(targets, declarations)
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n'),
    '}',
    '@media (prefers-reduced-transparency: reduce) {',
    rule(targets, [
      '  backdrop-filter: none !important;',
      '  -webkit-backdrop-filter: none !important;',
      '  background-image: none !important;',
    ])
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n'),
    '}',
  ].join('\n');
}

/**
 * Accent touches: a glow around the focused composer, a gradient pill on the active
 * thread row and a two-accent send button.
 */
export function buildAccentCss(settings: CodexSettings): string {
  if (!settings.accent.enabled) {
    return '';
  }
  const activeThread = selectorOf('sidebarActiveThread');
  return [
    rule(':root', [
      `  --woodfish-codex-accent: ${ACCENT};`,
      `  --woodfish-codex-accent-alt: ${ACCENT_2};`,
    ]),
    rule(`${selectorOf('composer')}:focus-within [data-composer-body]`, [
      '  box-shadow:',
      '    0 0 0 1px color-mix(in oklab, var(--woodfish-codex-accent) 55%, transparent),',
      '    0 0 22px -8px var(--woodfish-codex-accent),',
      '    0 0 34px -14px var(--woodfish-codex-accent-alt) !important;',
    ]),
    // Only a short pill in the gutter left of the row: Codex's own selected background
    // stays, and an inset border would bend along the row's rounded corners.
    rule(`${activeThread}::before`, [
      '  content: "";',
      '  position: absolute;',
      '  left: -6px;',
      '  top: 50%;',
      '  width: 3px;',
      '  height: 16px;',
      '  border-radius: 999px;',
      '  transform: translateY(-50%);',
      '  background-image: linear-gradient(',
      '    180deg,',
      '    var(--woodfish-codex-accent),',
      '    var(--woodfish-codex-accent-alt)',
      '  );',
      '  box-shadow: 0 0 6px color-mix(in oklab, var(--woodfish-codex-accent) 45%, transparent);',
      '  pointer-events: none;',
    ]),
    rule(selectorOf('composerPrimaryButton'), [
      '  background-image: linear-gradient(',
      '    135deg,',
      '    var(--woodfish-codex-accent),',
      '    color-mix(in oklab, var(--woodfish-codex-accent-alt) 50%, var(--woodfish-codex-accent))',
      '  ) !important;',
      '  box-shadow: 0 0 14px -4px color-mix(in oklab, var(--woodfish-codex-accent) 70%, transparent) !important;',
    ]),
  ].join('\n\n');
}

/**
 * The caret is a single color, so the rainbow cycles over time through the stops.
 * Reduced motion keeps a static accent caret.
 */
export function buildCaretCss(settings: CodexSettings): string {
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
    ['@keyframes woodfish-codex-caret {', ...frames, '}'].join('\n'),
    rule(editor, [
      `  caret-color: ${stops[0]} !important;`,
      `  animation: woodfish-codex-caret ${formatCssNumber(settings.caret.animationDuration)}s linear infinite !important;`,
    ]),
    rule(`:root[data-reduced-motion="true"] ${editor}`, [
      '  animation: none !important;',
      `  caret-color: ${ACCENT} !important;`,
    ]),
    [
      '@media (prefers-reduced-motion: reduce) {',
      `  ${editor} { animation: none !important; caret-color: ${ACCENT} !important; }`,
      '}',
    ].join('\n'),
  ].join('\n\n');
}

/** Optional gradient on assistant reply text; links, code and math keep their colors. */
export function buildBodyTextCss(settings: CodexSettings): string {
  if (!settings.bodyText.enabled) {
    return '';
  }
  const painted = `${selectorOf('assistantMarkdown')} ${PAINTED_TOKEN_SELECTOR}`;
  return [
    rule(':root', [`  ${ANGLE_VARIABLE}: ${formatCssNumber(settings.codeGradient.angle)}deg;`]),
    rule(painted, [
      '  background-image: linear-gradient(',
      `    var(${ANGLE_VARIABLE}),`,
      '    var(--woodfish-overlay-gradient-light) 0%,',
      '    var(--woodfish-overlay-gradient-base) 50%,',
      '    var(--woodfish-overlay-gradient-dark) 100%',
      '  ) !important;',
      '  background-clip: text !important;',
      '  -webkit-background-clip: text !important;',
      '  -webkit-text-fill-color: transparent !important;',
    ]),
    rule(`${painted} :is(a, code, pre, .katex, [data-code-block])`, [
      '  -webkit-text-fill-color: currentColor !important;',
    ]),
  ].join('\n\n');
}
