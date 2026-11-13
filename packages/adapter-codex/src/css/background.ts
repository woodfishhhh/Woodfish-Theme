import {
  buildBackgroundCopyDeclarations,
  buildBackgroundFillImage,
  buildBackgroundLayerCss,
} from '@woodfish/renderer-runtime';
import { CODEX_SELECTORS, selectorOf } from '../selectors';
import { CODEX_GRADIENT_BACKGROUND_ID, CodexSettings } from '../settings';

/** Codex's surface color, read at the root before Woodfish clears it inside the thread. */
const SURFACE = '--woodfish-codex-surface';

function rule(selector: string, declarations: string[]): string {
  return [`${selector} {`, ...declarations, '}'].join('\n');
}

/**
 * The window background in Codex. The layer sits under the whole window; the thread, the
 * window frame and pages like Settings are cleared so it shows through. The sidebar and
 * the composer are frosted panels and Codex's own fades and the strip behind the composer
 * (content scrolls under them) become copies of the layer. Every one of them is a static
 * image pinned to the window, no backdrop-filter: measured in a streaming reply, live
 * filters on these areas roughly doubled the frame time (the running indicator, the caret
 * and the text scrolling under the composer force a recompute every frame).
 */
export function buildBackgroundCss(settings: CodexSettings): string {
  const background = settings.background;
  if (!background.enabled) {
    return '';
  }
  const surface = `var(${SURFACE})`;
  const fill =
    background.image === CODEX_GRADIENT_BACKGROUND_ID
      ? buildBackgroundFillImage(background.fill)
      : undefined;
  const topFade = selectorOf('mainTopFade');
  const footerFade = `${selectorOf('timeline')} .from-surface.pointer-events-none`;
  const footer = selectorOf('threadFooter');
  const composer = CODEX_SELECTORS.composerLayout.selectors.join(',\n');
  const composerSurface =
    'var(--color-background-composer-surface, var(--color-surface-elevated-secondary))';

  const css = [
    rule(':root', [`  ${SURFACE}: var(--color-surface);`]),
    buildBackgroundLayerCss(background, {
      layerSelector: 'body::before',
      base: surface,
      lightScope: '[data-theme="light"]',
      image: fill,
    }),
    // The thread, the window frame and pages like Settings (Tailwind `electron:bg-surface`).
    rule(`main.bg-surface,\n${selectorOf('appShell')},\n${selectorOf('page')}`, [
      '  background-color: transparent !important;',
    ]),
    rule(
      selectorOf('sidebar'),
      buildBackgroundCopyDeclarations(background, {
        base: surface,
        image: fill,
        soft: true,
        tint: surface,
      })
    ),
    rule(
      `${topFade},\n${footerFade},\n${footer}`,
      buildBackgroundCopyDeclarations(background, { base: surface, image: fill })
    ),
    rule(topFade, ['  mask-image: linear-gradient(to bottom, #000, transparent);']),
    rule(footerFade, ['  mask-image: linear-gradient(to top, #000, transparent);']),
    rule(composer, [
      '  --composer-layout-surface-background: transparent !important;',
      '  --composer-layout-surface-backdrop-filter: none !important;',
      ...buildBackgroundCopyDeclarations(background, {
        base: surface,
        image: fill,
        soft: true,
        tint: composerSurface,
      }),
    ]),
  ].join('\n\n');
  return `@media not (prefers-reduced-transparency: reduce) {\n${css}\n}`;
}
