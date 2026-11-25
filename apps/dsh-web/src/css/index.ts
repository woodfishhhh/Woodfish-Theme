import { DshCoreView } from '../settings';
import { buildBackgroundCss } from './background';
import { buildCornerCss } from './corners';
import { buildCodeCss } from './effects';
import { buildPaletteCss } from './palette';

/**
 * One `<style>` per core feature. Everything else Woodfish draws in dsh is an effect plugin
 * with its own stylesheet (see @woodfish/effects), the same as in Codex.
 */
export type DshStyleName = 'palette' | 'corners' | 'background' | 'code' | 'custom';

export const DSH_STYLE_NAMES: readonly DshStyleName[] = Object.freeze([
  'palette',
  'corners',
  'background',
  'code',
  'custom',
]);

/** The core CSS for dsh, keyed by feature; empty strings mean "not mounted". */
export function buildDshCss(view: DshCoreView): Record<DshStyleName, string> {
  return {
    palette: buildPaletteCss(view.palette),
    corners: view.squircleCorners ? buildCornerCss() : '',
    background: buildBackgroundCss(view),
    code: buildCodeCss(view),
    custom: view.customCss.join('\n'),
  };
}

export { buildBackgroundCss } from './background';
export { SQUIRCLE_K, buildCornerCss } from './corners';
export { buildPaletteCss, buildPaletteVariables, buildShikiVariables } from './palette';
export { buildCodeCss } from './effects';
