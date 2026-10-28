import { CursorParams } from '../effects/params';

export type PaletteTone = 'light' | 'dark';

/** Semantic surface and state colors, independent of any host's widget names. */
export interface PaletteUiColors {
  bg: string;
  bgAlt: string;
  bgDeep: string;
  bgWidget: string;
  border: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  lineHighlight: string;
  selection: string;
  selectionInactive: string;
  findMatch: string;
  accent: string;
  accentFg: string;
  accent2: string;
  error: string;
  warning: string;
  info: string;
  success: string;
}

/** Syntax roles used for code and code blocks. */
export interface PaletteTokenColors {
  keyword: string;
  storage: string;
  function: string;
  type: string;
  string: string;
  number: string;
  parameter: string;
  variable: string;
  property: string;
  decorator: string;
  operator: string;
  punctuation: string;
  comment: string;
  tag: string;
  attribute: string;
  regexp: string;
  escape: string;
  namespace: string;
  macro: string;
  self: string;
  invalid: string;
}

export type PaletteTokenRole = keyof PaletteTokenColors;

/**
 * Accent gradients and cursor defaults that runtime effects take from the palette.
 *
 * The field names come from the VS Code extension's `theme.meta.json` format, which is
 * generated from these specs. Read them by role: `activityBadge*` is the small accent
 * pill (badges, counters) and `tabBorder*` the active-item underline. A second host maps
 * them to its own elements; rename only together with the generated meta files.
 */
export interface PaletteEffectMeta {
  activityBadgeGradient: string;
  activityBadgeTextColor?: string;
  tabBorderGradient: string;
  runtime?: {
    activityBadgeShadow?: string;
    tabBorderShadow?: string;
    tabBorderAnimationDuration?: string;
    cursorDefaults?: Partial<CursorParams>;
  };
}

export interface WoodfishPalette {
  slug: string;
  label: string;
  type: PaletteTone;
  ui: PaletteUiColors;
  tokens: PaletteTokenColors;
  /** 16 terminal colors: 8 normal followed by 8 bright. */
  ansi: string[];
  meta: PaletteEffectMeta;
}
