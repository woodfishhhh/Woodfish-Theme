import {
  buildBackgroundCopyDeclarations,
  buildBackgroundFillImage,
  buildBackgroundLayerCss,
} from '@woodfish/renderer-runtime';
import { LIGHT_BODY, selectorOf } from '../selectors';
import { DSH_GRADIENT_BACKGROUND_ID, DshCoreView } from '../settings';

/** dsh's base and sidebar colors, read on `<body>` before they are cleared further down. */
const SURFACE = '--woodfish-dsh-surface';
const SIDEBAR = '--woodfish-dsh-sidebar';

function rule(selector: string, declarations: string[]): string {
  return [`${selector} {`, ...declarations, '}'].join('\n');
}

/*
 * Wrappers of the main area, conversation pane, right panel and code preview. `[data-slot]`
 * elements are `display: contents`, so the painted box is the slot's child or its parent
 * column. Clearing them lets the fixed window background show cleanly without touching
 * `--dsw-alias-bg-base` (which dialogs, popovers and tooltips still need opaque).
 */
const MAIN_AREA = [
  ':has(> * > [data-slot="main"])',
  ':has(> [data-slot="main"])',
  '[data-slot^="main."] > *',
  '[data-conversation-scroll]',
  '[data-chat-flow]',
  '[data-sidebar-right-panel]',
  '[data-sidebar-right-panel] [data-dockkit-pane]',
  '[data-dockkit-empty]',
  '[data-code-preview]',
].join(',\n');

/** Sticky strips that hide content scrolling under them: code block banners, open steps. */
const STICKY_BANDS = [
  ':has(> [data-code-block-banner])',
  '[data-expanded] [data-open] [data-disclosure-header]',
].join(',\n');

/**
 * Full-window background in dsh: one fixed layer under the whole page (`body::before`),
 * main frames and panels punched transparent so it shows through, sidebar and composer
 * frosted with a static pre-blurred copy (never a live `backdrop-filter` over streaming
 * areas), and sticky strips painted with aligned copies so scrolling content hides cleanly.
 */
export function buildBackgroundCss(view: DshCoreView): string {
  const background = view.background;
  if (!background.enabled) {
    return '';
  }
  const surface = `var(${SURFACE})`;
  const image =
    view.backgroundImage === DSH_GRADIENT_BACKGROUND_ID
      ? buildBackgroundFillImage(background.fill)
      : undefined;
  const css = [
    rule(':root:root body', [
      `  ${SURFACE}: var(--dsw-alias-bg-base);`,
      `  ${SIDEBAR}: var(--dsw-specific-sidebar-fill);`,
    ]),
    buildBackgroundLayerCss(background, {
      layerSelector: 'body::before',
      base: surface,
      lightScope: LIGHT_BODY,
      ...(image ? { image } : {}),
    }),
    rule(`${selectorOf('frame')},\n${MAIN_AREA}`, ['  background: transparent !important;']),
    // The column and the sidebar's own fades see a clear sidebar; the panel itself is frosted.
    rule(selectorOf('sidebarColumn'), [
      '  --dsw-specific-sidebar-fill: transparent;',
      '  background: transparent !important;',
    ]),
    rule(
      selectorOf('sidebar'),
      buildBackgroundCopyDeclarations(background, {
        base: surface,
        ...(image ? { image } : { soft: true }),
        tint: `var(${SIDEBAR})`,
      })
    ),
    rule(
      STICKY_BANDS,
      buildBackgroundCopyDeclarations(background, { base: surface, ...(image ? { image } : {}) })
    ),
    // dsh fades the bar under the composer in over 36px; the copy fades in the same way.
    rule(selectorOf('composerSeat'), ['  background: none !important;']),
    rule(`${selectorOf('composerSeat')}::before`, [
      '  content: "";',
      '  position: absolute;',
      '  inset: 0;',
      '  z-index: -1;',
      '  pointer-events: none;',
      ...buildBackgroundCopyDeclarations(background, {
        base: surface,
        ...(image ? { image } : {}),
      }),
      '  mask-image: linear-gradient(to bottom, transparent, #000 36px);',
    ]),
    rule(
      selectorOf('composer'),
      buildBackgroundCopyDeclarations(background, {
        base: surface,
        ...(image ? { image } : { soft: true }),
        tint: 'var(--dsw-specific-input-major)',
      })
    ),
  ].join('\n\n');
  return `@media not (prefers-reduced-transparency: reduce) {\n${css}\n}`;
}
