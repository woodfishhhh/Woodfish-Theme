import { ORIGINAL_PALETTES } from './originals';
import { PORTED_PALETTES } from './ported';
import { WoodfishPalette } from './types';

const [WOODFISH_DARK, WOODFISH_DRACULA, ...POPULAR_PALETTES] = PORTED_PALETTES;

/**
 * Every Woodfish palette: Woodfish's own (the ported Woodfish Dark and Dracula, then the
 * originals), then the bundled popular themes, in the order the VS Code extension lists
 * them.
 */
export const WOODFISH_PALETTES: readonly WoodfishPalette[] = /* @__PURE__ */ Object.freeze([
  WOODFISH_DARK,
  WOODFISH_DRACULA,
  ...ORIGINAL_PALETTES,
  ...POPULAR_PALETTES,
]);
