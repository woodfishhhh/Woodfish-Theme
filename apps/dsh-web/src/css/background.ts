import {
  buildBackgroundCopyDeclarations,
  buildBackgroundLayerCss,
} from '@woodfish/renderer-runtime';
import { LIGHT_BODY, selectorOf } from '../selectors';
import { DshCoreView } from '../settings';

/** dsh's base and sidebar colors, read on `<body>` before they are cleared further down. */
const SURFACE = '--woodfish-dsh-surface';
const SIDEBAR = '--woodfish-dsh-sidebar';

function rule(selector: string, declarations: string[]): string {
  return [`${selector} {`, ...declarations, '}'].join('\n');
}

/*
 * Wrappers of the main area. `[data-slot]` elements are `display: contents`, so the painted
 * box is the slot's child (the conversation root) or its parents (the center column).
 */
const MAIN_AREA = [
  ':has(> * > [data-slot="main"])',
  ':has(> [data-slot="main"])',
  '[data-slot^="main."] > *',
  // The right panel: its tabs and its empty state.
  '[data-sidebar-right-panel] [data-dockkit-pane]',
  '[data-dockkit-empty]',
].join(',\n');

/** Sticky strips that hide content scrolling under them: code block banners, open steps. */
const STICKY_BANDS = [
  ':has(> [data-code-block-banner])',
  '[data-expanded] [data-open] [data-disclosure-header]',
].join(',\n');

/**
 * The window background in dsh, as in Codex: one layer under the whole page, the frame and
 * the conversation cleared so it shows through, the sidebar and the composer frosted, and
 * the strips content scrolls under (the composer's bottom bar, sticky banners) drawn as
 * copies of the layer. All static images pinned to the window, no live backdrop-filter, so
 * streaming and scrolling cost nothing extra.
 */
export function buildBackgroundCss(view: DshCoreView): string {
  const background = view.background;
  if (!background.enabled) {
    return '';
  }
  const surface = `var(${SURFACE})`;
  const css = [
    rule(':root:root body', [
      `  ${SURFACE}: var(--dsw-alias-bg-base);`,
      `  ${SIDEBAR}: var(--dsw-specific-sidebar-fill);`,
    ]),
    buildBackgroundLayerCss(background, {
      layerSelector: 'body::before',
      base: surface,
      lightScope: LIGHT_BODY,
    }),
    rule(`${selectorOf('frame')},\n${MAIN_AREA}`, ['  background: transparent !important;']),
    // The column and the sidebar's own fades see a clear sidebar; the panel is frosted.
    rule(selectorOf('sidebarColumn'), [
      '  --dsw-specific-sidebar-fill: transparent;',
      '  background: transparent !important;',
    ]),
    rule(
      selectorOf('sidebar'),
      buildBackgroundCopyDeclarations(background, {
        base: surface,
        soft: true,
        tint: `var(${SIDEBAR})`,
      })
    ),
    rule(STICKY_BANDS, buildBackgroundCopyDeclarations(background, { base: surface })),
    // dsh fades the bar under the composer in over 36px; the copy fades in the same way.
    rule(selectorOf('composerSeat'), ['  background: none !important;']),
    rule(`${selectorOf('composerSeat')}::before`, [
      '  content: "";',
      '  position: absolute;',
      '  inset: 0;',
      '  z-index: -1;',
      '  pointer-events: none;',
      ...buildBackgroundCopyDeclarations(background, { base: surface }),
      '  mask-image: linear-gradient(to bottom, transparent, #000 36px);',
    ]),
    rule(
      selectorOf('composer'),
      buildBackgroundCopyDeclarations(background, {
        base: surface,
        soft: true,
        tint: 'var(--dsw-specific-input-major)',
      })
    ),
  ].join('\n\n');
  return `@media not (prefers-reduced-transparency: reduce) {\n${css}\n}`;
}
