import { ORIGINAL_PALETTES } from './originals';
import { PORTED_PALETTES } from './ported';
import { WoodfishPalette } from './types';

/** Every Woodfish palette: the ported Woodfish Dark and Dracula, then the originals. */
export const WOODFISH_PALETTES: readonly WoodfishPalette[] = /* @__PURE__ */ Object.freeze([
  ...PORTED_PALETTES,
  ...ORIGINAL_PALETTES,
]);
