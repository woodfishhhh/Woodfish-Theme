import { CodexSettings } from '../settings';
import {
  buildAccentCss,
  buildBodyTextCss,
  buildCaretCss,
  buildCodeCss,
  buildGlassCss,
} from './effects';
import { buildPaletteCss } from './palette';

/** One `<style>` per feature, so features can be updated or removed independently. */
export type CodexStyleName = 'palette' | 'code' | 'glass' | 'accent' | 'caret' | 'body' | 'custom';

export const CODEX_STYLE_NAMES: readonly CodexStyleName[] = Object.freeze([
  'palette',
  'code',
  'glass',
  'accent',
  'caret',
  'body',
  'custom',
]);

/** All Woodfish CSS for Codex, keyed by feature; empty strings mean "not mounted". */
export function buildCodexCss(settings: CodexSettings): Record<CodexStyleName, string> {
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

export { buildPaletteCss, buildPaletteVariables } from './palette';
export {
  buildAccentCss,
  buildBodyTextCss,
  buildCaretCss,
  buildCodeCss,
  buildGlassCss,
} from './effects';
