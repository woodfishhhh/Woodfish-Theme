export * from './protocol';
export {
  BODY_TEXT_SELECTOR,
  CODE_ROOT_SELECTOR,
  CODE_TOKEN_SELECTOR,
  DARK_BODY,
  DSH_SELECTORS,
  LIGHT_BODY,
  modeScope,
  selectorOf,
} from './selectors';
export type { DshSelectorGroup, SelectorGroup } from './selectors';
export {
  DEFAULT_DSH_PERSISTED_CONFIG,
  DEFAULT_DSH_SETTINGS,
  DSH_DEFAULT_BACKGROUND_ID,
  DSH_GRADIENT_BACKGROUND_ID,
  applyDshEffectOverrides,
  composeDshCoreView,
  defaultDshPalette,
  dshPalettes,
  findDshPalette,
  fromPersistedConfig,
  normalizeBackgroundId,
  normalizeDshSettings,
  toPersistedConfig,
} from './settings';
export type {
  DshBackgroundId,
  DshCoreView,
  DshEffectOverrides,
  DshMode,
  DshSettings,
  DshSquircleView,
} from './settings';
export {
  DSH_STYLE_NAMES,
  SQUIRCLE_K,
  buildBackgroundCss,
  buildCornerCss,
  buildCodeCss,
  buildDshCss,
  buildPaletteCss,
  buildPaletteVariables,
  buildShikiVariables,
} from './css';
export type { DshStyleName } from './css';
