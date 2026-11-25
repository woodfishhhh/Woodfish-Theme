import {
  buildHostCornerCss,
  buildSquircleCss as buildComposerCorners,
  prepareCornerRadii,
} from '@woodfish/renderer-runtime';
import { CODEX_SELECTORS } from '../selectors';
import { CodexCoreView } from '../settings';
import { buildCodeCss } from './effects';
import { buildBackgroundCss } from './background';
import { buildPaletteCss } from './palette';

/**
 * One `<style>` per core feature. Everything else Woodfish draws in Codex is an effect
 * plugin with its own stylesheet (see @woodfish/effects).
 */
export type CodexStyleName = 'palette' | 'corners' | 'background' | 'code' | 'custom';

export const CODEX_STYLE_NAMES: readonly CodexStyleName[] = Object.freeze([
  'palette',
  'corners',
  'background',
  'code',
  'custom',
]);

const CODEX_RADIUS_TOKENS = [
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  'button-action',
  'button-toolbar',
  'form-dialog',
  'token-composer-single-line',
  'token-row',
  'suggestion-menu',
].map((name) => '--radius-' + name);
/** The core CSS for Codex, keyed by feature; empty strings mean "not mounted". */
export function buildCodexCss(view: CodexCoreView): Record<CodexStyleName, string> {
  return {
    palette: buildPaletteCss(view.palette),
    corners: view.squircleCorners
      ? buildHostCornerCss(
          ':root',
          CODEX_RADIUS_TOKENS,
          ':where(' + CODEX_SELECTORS.circularControls.selectors.join(', ') + ')'
        ) +
        '\n' +
        buildComposerCorners(
          prepareCornerRadii(
            `${CODEX_SELECTORS.roundedComposer.selectors.join(', ')} { border-radius: var(--composer-border-radius); }`
          )
        )
      : '',
    background: buildBackgroundCss(view),
    code: buildCodeCss(view),
    custom: view.customCss.join('\n'),
  };
}

export { buildBackgroundCss } from './background';
export { buildHljsRoleCss, buildPaletteCss, buildPaletteVariables } from './palette';
export { buildCodeCss, buildDiffCss } from './effects';
