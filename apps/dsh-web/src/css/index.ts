import { DshSettings } from '../settings';
import {
  buildAccentCss,
  buildBodyTextCss,
  buildCaretCss,
  buildCodeCss,
  buildGlassCss,
} from './effects';
import { buildPaletteCss } from './palette';

/** One `<style>` per feature, so features can be updated or removed independently. */
export type DshStyleName = 'palette' | 'code' | 'glass' | 'accent' | 'caret' | 'body' | 'custom';

export const DSH_STYLE_NAMES: readonly DshStyleName[] = Object.freeze([
  'palette',
  'code',
  'glass',
  'accent',
  'caret',
  'body',
  'custom',
]);

/** All Woodfish CSS for dsh, keyed by feature; empty strings mean "not mounted". */
export function buildDshCss(settings: DshSettings): Record<DshStyleName, string> {
  return {
    palette: buildPaletteCss(settings.palette),
    code: buildCodeCss(settings),
    glass: buildGlassCss(settings),
    accent: buildAccentCss(settings),
    caret: buildCaretCss(settings),
    body: buildBodyTextCss(settings),
    custom: settings.customCss.join('\n'),
  };
}

export { buildPaletteCss, buildPaletteVariables, buildShikiVariables } from './palette';
export {
  buildAccentCss,
  buildBodyTextCss,
  buildCaretCss,
  buildCodeCss,
  buildGlassCss,
} from './effects';
