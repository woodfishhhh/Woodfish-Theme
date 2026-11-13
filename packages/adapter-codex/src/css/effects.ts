import {
  ACRYLIC_FILTER_ID,
  PAINTED_TOKEN_SELECTOR,
  buildGlowDeclarations,
  buildGradientDeclarations,
  buildLightGlowDeclarations,
  buildNoiseDataUri,
  buildPunctuationGlowDeclarations,
  formatCssNumber,
} from '@woodfish/renderer-runtime';
import { findGradientPreset } from '@woodfish/theme-core';
import { BODY_TEXT_SELECTOR, CODE_ROOT_SELECTOR, CODEX_SELECTORS, selectorOf } from '../selectors';
import { CodexSettings, DEFAULT_CODEX_CARET_STOPS, findCodexPalette } from '../settings';

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
      // Light mode glows in a bright tint of the text hue (theme-core), not a dark halo.
      rule(scoped('[data-theme="light"]', tokens), buildLightGlowDeclarations(intensity))
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
      rule(`:host-context([data-theme="light"]) ${tokens}`, buildLightGlowDeclarations(intensity))
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
  const filter =
    glass.mode === 'acrylic'
      ? `url(#${ACRYLIC_FILTER_ID}) saturate(${formatCssNumber(glass.saturate)}%)`
      : `blur(${formatCssNumber(glass.blur)}px) saturate(${formatCssNumber(glass.saturate)}%)`;
  const declarations = [
    `  background-color: ${tint} !important;`,
    // A hairline and a soft drop shadow keep thin glass readable over busy backgrounds.
    '  border-color: color-mix(in oklab, var(--app-color-text-foreground, currentColor) 14%, transparent) !important;',
    '  box-shadow: 0 0 0 1px color-mix(in oklab, var(--app-color-text-foreground, currentColor) 8%, transparent), 0 16px 40px -16px rgb(0 0 0 / 55%) !important;',
    `  -webkit-backdrop-filter: ${filter} !important;`,
    `  backdrop-filter: ${filter} !important;`,
  ];
  if (glass.noise > 0) {
    declarations.push(`  background-image: ${buildNoiseDataUri(glass.noise)} !important;`);
  }
  if (glass.borderRadius > 0) {
    declarations.push(`  border-radius: ${formatCssNumber(glass.borderRadius)}px !important;`);
  }
  const parts = [
    `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {`,
    indent(rule(targets, declarations)),
    '}',
    '@media (prefers-reduced-transparency: reduce) {',
    indent(
      rule(targets, [
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '  background-image: none !important;',
      ])
    ),
    '}',
  ];
  if (glass.animations) {
    parts.push(buildGlassAnimationCss());
  }
  if (glass.reveal) {
    parts.push(buildRevealCss());
  }
  return parts.join('\n');
}

function indent(css: string): string {
  return css
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

/** Same curve and keyframes as the VS Code extension; Codex's menus do not animate. */
const MOTION_CURVE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DROP_IN = ['[role="menu"]', '[role="listbox"]', '[data-slot="popover-content"]'];
const ZOOM_IN = ['[role="dialog"]'];

function buildGlassAnimationCss(): string {
  const animated = [...DROP_IN, ...ZOOM_IN].map((selector) => `${selector}[data-state="open"]`);
  return [
    '@keyframes woodfish-codex-drop {',
    '  from { opacity: 0; transform: translateY(-6px) scale(0.985); }',
    '}',
    '@keyframes woodfish-codex-zoom {',
    '  from { opacity: 0; transform: scale(0.97); }',
    '}',
    rule(DROP_IN.map((selector) => `${selector}[data-state="open"]`).join(',\n'), [
      `  animation: woodfish-codex-drop 200ms ${MOTION_CURVE} backwards;`,
    ]),
    rule(ZOOM_IN.map((selector) => `${selector}[data-state="open"]`).join(',\n'), [
      `  animation: woodfish-codex-zoom 250ms ${MOTION_CURVE} backwards;`,
    ]),
    rule(animated.map((selector) => `:root[data-reduced-motion="true"] ${selector}`).join(',\n'), [
      '  animation: none !important;',
    ]),
    '@media (prefers-reduced-motion: reduce) {',
    indent(rule(animated.join(',\n'), ['  animation: none !important;'])),
    '}',
  ].join('\n');
}

/** The pointer-following light (renderer-runtime `startReveal` marks the hovered item). */
function buildRevealCss(): string {
  const revealed = '[data-woodfish-reveal="true"]';
  return [
    rule(':root', [
      '  --woodfish-codex-reveal-color: rgb(255 255 255 / 9%);',
      '  --woodfish-codex-reveal-size: 120px;',
    ]),
    rule('[data-theme="light"]', ['  --woodfish-codex-reveal-color: rgb(0 0 0 / 6%);']),
    rule(revealed, [
      '  background-image: radial-gradient(',
      '    circle var(--woodfish-codex-reveal-size) at var(--woodfish-reveal-x, 50%) var(--woodfish-reveal-y, 50%),',
      '    var(--woodfish-codex-reveal-color),',
      '    transparent 100%',
      '  ) !important;',
    ]),
    rule(`:root[data-reduced-motion="true"] ${revealed}`, ['  background-image: none !important;']),
    '@media (prefers-reduced-motion: reduce) {',
    indent(rule(revealed, ['  background-image: none !important;'])),
    '}',
  ].join('\n');
}

/**
 * The owner's pick from docs/playground/tab-indicator.html (#8 旋转流光边框, 4px, radius 8.5,
 * no glow, 8 s): a 2px ring of the theme's gradient around the thread row, turning slowly.
 * Hover shows it faint and still, the selected row turns once every 16 s, a running thread
 * every 8 s; unread and error keep Codex's own markers. Only the ring's conic-gradient
 * angle animates (a registered custom property: repaint of one small layer, no layout),
 * and it pauses while the window is in the background.
 */
export const THREAD_RING = {
  thickness: 4,
  radius: 8.5,
  selectedTurnSeconds: 16,
  runningTurnSeconds: 8,
};

function buildThreadIndicatorCss(): string[] {
  const row = '[data-app-action-sidebar-thread-row]';
  const active = selectorOf('sidebarActiveThread');
  const running = selectorOf('sidebarRunningThread');
  const stops =
    'var(--woodfish-codex-accent), var(--woodfish-codex-accent-alt), var(--woodfish-codex-accent)';
  return [
    '@property --woodfish-codex-spin {\n  syntax: "<angle>";\n  inherits: false;\n  initial-value: 0deg;\n}',
    '@keyframes woodfish-codex-spin {\n  to { --woodfish-codex-spin: 360deg; }\n}',
    rule(row, [`  border-radius: ${formatCssNumber(THREAD_RING.radius)}px !important;`]),
    rule(`${row}::before`, [
      '  content: "";',
      '  position: absolute;',
      '  inset: 0;',
      '  border-radius: inherit;',
      `  padding: ${formatCssNumber(THREAD_RING.thickness / 2)}px;`,
      `  background: conic-gradient(from var(--woodfish-codex-spin), var(--woodfish-codex-ring-stops, ${stops}));`,
      '  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);',
      '  -webkit-mask-composite: xor;',
      '  mask-composite: exclude;',
      '  opacity: 0;',
      '  transition: opacity 160ms ease;',
      '  pointer-events: none;',
    ]),
    rule(`${row}:hover::before`, ['  opacity: 0.25;']),
    rule(`${active}::before`, [
      '  opacity: 0.85;',
      `  animation: woodfish-codex-spin ${THREAD_RING.selectedTurnSeconds}s linear infinite;`,
    ]),
    rule(`${running}::before`, [
      '  opacity: 1;',
      `  animation: woodfish-codex-spin ${THREAD_RING.runningTurnSeconds}s linear infinite;`,
    ]),
    rule(`:root[data-woodfish-codex-unfocused] ${row}::before`, [
      '  animation-play-state: paused;',
    ]),
    rule(`:root[data-reduced-motion="true"] ${row}::before`, ['  animation: none;']),
    `@media (prefers-reduced-motion: reduce) {\n  ${row}::before { animation: none; }\n}`,
  ];
}

/**
 * Accent touches: a glow around the focused composer, the thread indicator, the active
 * panel tab and a two-accent send button.
 */
export function buildAccentCss(settings: CodexSettings): string {
  if (!settings.accent.enabled) {
    return '';
  }

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
    ...buildThreadIndicatorCss(),
    rule(selectorOf('composerPrimaryButton'), [
      '  background-image: linear-gradient(',
      '    135deg,',
      '    var(--woodfish-codex-accent),',
      '    color-mix(in oklab, var(--woodfish-codex-accent-alt) 50%, var(--woodfish-codex-accent))',
      '  ) !important;',
      '  box-shadow: 0 0 14px -4px color-mix(in oklab, var(--woodfish-codex-accent) 70%, transparent) !important;',
    ]),
    // The VS Code active-tab border: the theme's tab gradient, drifting slowly, as a short
    // bar under the selected panel tab (Codex's tabs are pills, not a full-width strip).
    '@keyframes woodfish-codex-tab-drift {\n  from { background-position: 0% 50%; }\n  to { background-position: 100% 50%; }\n}',
    rule(`${selectorOf('activeTab')}::after`, [
      '  content: "";',
      '  position: absolute;',
      '  left: 22%;',
      '  right: 22%;',
      '  bottom: 1px;',
      '  height: 2px;',
      '  border-radius: 999px;',
      '  background-image: var(',
      '    --woodfish-codex-tab-gradient,',
      '    linear-gradient(to right, var(--woodfish-codex-accent), var(--woodfish-codex-accent-alt))',
      '  );',
      '  background-size: 200% 100%;',
      '  animation: woodfish-codex-tab-drift 6s ease-in-out infinite alternate;',
      '  pointer-events: none;',
    ]),
    rule(`:root[data-reduced-motion="true"] ${selectorOf('activeTab')}::after`, [
      '  animation: none;',
      '  background-size: 100% 100%;',
    ]),
  ].join('\n\n');
}

/**
 * The caret is a single color, so the rainbow cycles over time through the stops. Like the
 * VS Code extension, a Woodfish theme brings its own cursor colors unless the user picked
 * some. Reduced motion keeps a static accent caret.
 */
export function buildCaretCss(settings: CodexSettings): string {
  if (!settings.caret.enabled) {
    return '';
  }
  const custom = settings.caret.gradientStops.join() !== DEFAULT_CODEX_CARET_STOPS.join();
  const editor = selectorOf('composerEditor');
  const modes = (['dark', 'light'] as const).map((mode) => {
    const slug = settings.palette[mode];
    const themed = slug && !custom ? findCodexPalette(slug).meta.runtime?.cursorDefaults : null;
    const stops = themed?.gradientStops ?? settings.caret.gradientStops;
    const frames = [...stops, stops[0]].map((color, index, all) => {
      const percent = formatCssNumber((index / (all.length - 1)) * 100);
      return `  ${percent}% { caret-color: ${color}; }`;
    });
    return [
      [`@keyframes woodfish-codex-caret-${mode} {`, ...frames, '}'].join('\n'),
      rule(`[data-theme="${mode}"] ${editor}`, [
        `  caret-color: ${stops[0]} !important;`,
        `  animation: woodfish-codex-caret-${mode} ${formatCssNumber(settings.caret.animationDuration)}s linear infinite !important;`,
      ]),
      rule(`[data-theme="${mode}"]`, [
        `  --woodfish-codex-caret-gradient: linear-gradient(180deg, ${[...stops, stops[0]].join(', ')});`,
        `  --woodfish-codex-caret-glow: ${stops[0]};`,
      ]),
    ].join('\n\n');
  });
  const parts = [
    ...modes,
    rule(`:root[data-reduced-motion="true"] ${editor}`, [
      '  animation: none !important;',
      `  caret-color: ${ACCENT} !important;`,
    ]),
    [
      '@media (prefers-reduced-motion: reduce) {',
      `  ${editor} { animation: none !important; caret-color: ${ACCENT} !important; }`,
      '}',
    ].join('\n'),
  ];
  if (settings.caret.glow) {
    parts.push(buildCaretGlowCss(settings, editor));
  }
  return parts.join('\n\n');
}

/**
 * The glowing caret the overlay draws over the composer, and the same light at the end of
 * a streaming reply: the theme's cursor colors flowing through a thin bar that breathes
 * softly, solid again whenever the caret moves.
 */
function buildCaretGlowCss(settings: CodexSettings, editor: string): string {
  const duration = formatCssNumber(settings.caret.animationDuration);
  const bar = [
    '  background-image: var(--woodfish-codex-caret-gradient);',
    '  background-size: 100% 400%;',
    '  border-radius: 2px;',
    '  box-shadow:',
    '    0 0 6px color-mix(in oklab, var(--woodfish-codex-caret-glow) 75%, transparent),',
    '    0 0 14px color-mix(in oklab, var(--woodfish-codex-accent-alt, var(--woodfish-codex-caret-glow)) 45%, transparent);',
    `  animation: woodfish-codex-caret-flow ${duration}s linear infinite, woodfish-codex-caret-breathe 1.2s ease-in-out 0.5s infinite alternate;`,
  ];
  const tail = '[data-woodfish-codex-streaming-tail="true"]';
  const tailEnds = [
    `${tail} > :is(p, h1, h2, h3, h4, h5, h6):last-child::after`,
    `${tail} > :is(ul, ol):last-child > li:last-child::after`,
  ].join(',\n');
  const animated = `[data-woodfish-codex-caret], ${tailEnds}`;
  return [
    '@keyframes woodfish-codex-caret-flow {\n  from { background-position: 50% 0%; }\n  to { background-position: 50% 100%; }\n}',
    '@keyframes woodfish-codex-caret-breathe {\n  from { opacity: 1; }\n  to { opacity: 0.45; }\n}',
    rule(`:root[data-woodfish-codex-caret-glow] ${editor}`, [
      '  caret-color: transparent !important;',
      '  animation: none !important;',
    ]),
    rule('[data-woodfish-codex-caret]', [
      '  position: fixed;',
      '  left: 0;',
      '  top: 0;',
      '  width: 2px;',
      '  z-index: 2147483000;',
      '  pointer-events: none;',
      '  will-change: transform;',
      ...bar,
    ]),
    rule(tailEnds, [
      '  content: "";',
      '  display: inline-block;',
      '  width: 2px;',
      '  height: 1.05em;',
      '  margin-inline-start: 3px;',
      '  vertical-align: -0.15em;',
      ...bar,
    ]),
    rule(`:root[data-reduced-motion="true"] :is(${animated})`, ['  animation: none;']),
    `@media (prefers-reduced-motion: reduce) {\n  ${animated.replace(/\n/g, ' ')} { animation: none; }\n}`,
  ].join('\n\n');
}

/**
 * The reply's rainbow for one appearance mode: a Woodfish theme's hand-tuned foreground
 * rainbow, otherwise the theme's own cursor colors softened toward its text color (the
 * user's Codex theme uses the default rainbow and Codex's text color).
 */
function bodyGradient(settings: CodexSettings, mode: 'dark' | 'light'): string {
  const slug = settings.palette[mode];
  const palette = slug ? findCodexPalette(slug) : null;
  const preset = slug ? findGradientPreset(slug) : null;
  const tuned = preset?.tokens[preset.foreground];
  if (tuned) {
    return `linear-gradient(${tuned.angle}deg, ${tuned.stops.join(', ')})`;
  }
  const stops = palette?.meta.runtime?.cursorDefaults?.gradientStops ?? DEFAULT_CODEX_CARET_STOPS;
  const text = palette ? palette.ui.fg : 'var(--app-color-text-foreground, currentColor)';
  const soft = stops.map((color) => `color-mix(in oklab, ${color} 42%, ${text})`);
  return `linear-gradient(135deg, ${soft.join(', ')})`;
}

/**
 * Rainbow reply text: paragraphs, headings, lists and table cells of assistant replies.
 * Pure CSS on the text blocks, so streamed text is colored as it arrives and long threads
 * cost no script work. Links, code and math keep their own colors.
 */
export function buildBodyTextCss(settings: CodexSettings): string {
  if (!settings.bodyText.enabled) {
    return '';
  }
  const root = selectorOf('assistantMarkdown');
  return [
    ...(['dark', 'light'] as const).map((mode) =>
      rule(`[data-theme="${mode}"] ${root}`, [
        `  --woodfish-codex-body-gradient: ${bodyGradient(settings, mode)};`,
      ])
    ),
    rule(BODY_TEXT_SELECTOR.split(', ').join(',\n'), [
      '  background-image: var(--woodfish-codex-body-gradient) !important;',
      '  background-clip: text !important;',
      '  -webkit-background-clip: text !important;',
      '  -webkit-text-fill-color: transparent !important;',
    ]),
    rule(`${root} :is(a, code, pre, .katex, [data-code-block])`, [
      '  -webkit-text-fill-color: currentColor !important;',
    ]),
  ].join('\n\n');
}
