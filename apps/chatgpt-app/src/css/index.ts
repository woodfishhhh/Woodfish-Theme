import { buildSquircleCss, prepareCornerRadii } from '@woodfish/renderer-runtime';
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

/** The core CSS for Codex, keyed by feature; empty strings mean "not mounted". */
export function buildCodexCss(view: CodexCoreView): Record<CodexStyleName, string> {
  return {
    palette: buildPaletteCss(view.palette),
    corners: view.squircleCorners
      ? buildSquircleCss(
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
