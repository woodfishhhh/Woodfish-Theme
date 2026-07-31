export type FeatureFlags = {
  syntaxGradient: boolean;
  glow: boolean;
  cursor: boolean;
};

export type RuntimeStatus = 'on' | 'paused' | 'off';

export type RuntimeStatusSnapshot = {
  state: RuntimeStatus;
  activeTheme: string;
  isWoodfishTheme: boolean;
  hasPayload: boolean;
};

export type OverlaySettings = {
  enabled: boolean;
  hueShift: number;
  lightnessDelta: number;
  neutralChroma: number;
  angle: number;
};

export type SyntaxGradientSettings = {
  enabled: boolean;
  customRules: string[];
};

export type GlowSettings = {
  enabled: boolean;
  intensity: number;
  customRules: string[];
};

export type CursorSettings = {
  enabled: boolean;
  animationDuration: number;
  gradientStops: string[];
  borderRadius: number;
  glow: boolean;
  glowBlur: number;
  glowOpacity: number;
  customRules: string[];
};

export type CursorThemeDefaultKey = keyof Pick<
  CursorSettings,
  'animationDuration' | 'gradientStops' | 'borderRadius' | 'glowBlur' | 'glowOpacity'
>;

export type ThemeRuntimeExplicitSettings = {
  cursor: Partial<Record<CursorThemeDefaultKey, boolean>>;
};

export type ThemeRuntimeSettings = {
  overlay: OverlaySettings;
  syntaxGradient: SyntaxGradientSettings;
  glow: GlowSettings;
  cursor: CursorSettings;
  explicitSettings?: ThemeRuntimeExplicitSettings;
};

export type PartialRuntimeSettings = {
  overlay?: Partial<OverlaySettings>;
  syntaxGradient?: Partial<SyntaxGradientSettings>;
  glow?: Partial<GlowSettings>;
  cursor?: Partial<CursorSettings>;
  explicitSettings?: Partial<ThemeRuntimeExplicitSettings>;
};

export const RUNTIME_SETTING_LIMITS = {
  customRuleCount: 32,
  customRuleLength: 4096,
  customRulesTotalLength: 16384,
  gradientStopCount: 16,
  gradientStopLength: 64,
} as const;

export const DEFAULT_RUNTIME_SETTINGS: ThemeRuntimeSettings = {
  overlay: {
    enabled: true,
    hueShift: 24,
    lightnessDelta: 0.06,
    neutralChroma: 0.06,
    angle: 90,
  },
  syntaxGradient: {
    enabled: true,
    customRules: [],
  },
  glow: {
    enabled: true,
    intensity: 1,
    customRules: [],
  },
  cursor: {
    enabled: true,
    animationDuration: 8,
    gradientStops: [
      '#ff2d95',
      '#ff4500',
      '#ffd700',
      '#7cfc00',
      '#00ffff',
      '#1e90ff',
      '#9370db',
      '#ff00ff',
      '#ff1493',
    ],
    borderRadius: 2,
    glow: true,
    glowBlur: 0,
    glowOpacity: 0.7,
    customRules: [],
  },
};

const UNSAFE_CSS_PATTERN =
  /<\/?script\b|<\/style\b|@import\b|url\s*\(|(?:-webkit-)?image-set\s*\(|\bimage\s*\(|(?:https?|data|file|ftp|blob):/i;
const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const CSS_NAMED_COLORS = new Set([
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'transparent',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
]);

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback;
}

function normalizeCssForSafety(value: string): string {
  const withoutComments = value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\(?:\r\n|[\n\r\f])/g, '');

  return withoutComments.replace(
    /\\([0-9a-f]{1,6})(?:[ \t\r\n\f])?|\\([^\r\n\f])/gi,
    (_match, hexadecimal: string | undefined, escapedCharacter: string | undefined) => {
      if (!hexadecimal) {
        return escapedCharacter ?? '';
      }

      const codePoint = Number.parseInt(hexadecimal, 16);
      return codePoint === 0 || codePoint > 0x10ffff ? '\uFFFD' : String.fromCodePoint(codePoint);
    }
  );
}

function containsUnsafeCss(value: string): boolean {
  return UNSAFE_CSS_PATTERN.test(normalizeCssForSafety(value));
}

function sanitizeCustomRules(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rules: string[] = [];
  let totalLength = 0;
  for (const candidate of value.slice(0, RUNTIME_SETTING_LIMITS.customRuleCount)) {
    if (typeof candidate !== 'string') {
      continue;
    }
    const rule = candidate.trim();
    if (
      rule.length === 0 ||
      rule.length > RUNTIME_SETTING_LIMITS.customRuleLength ||
      totalLength + rule.length > RUNTIME_SETTING_LIMITS.customRulesTotalLength ||
      containsUnsafeCss(rule)
    ) {
      continue;
    }
    rules.push(rule);
    totalLength += rule.length;
  }
  return rules;
}

function isValidFunctionalColor(value: string): boolean {
  const match = /^(rgba?|hsla?)\((.*)\)$/i.exec(value);
  if (!match || !/^[\d+\-.,%/.\s]+$/.test(match[2])) {
    return false;
  }

  const normalized = match[2].replace(/\s*\/\s*/, ',').replace(/\s+/g, ',');
  const components = normalized.split(',').filter(Boolean);
  const isRgb = match[1].toLowerCase().startsWith('rgb');
  const expected = match[1].toLowerCase().endsWith('a') ? 4 : components.length;
  if (components.length < 3 || components.length > 4 || expected !== components.length) {
    return false;
  }

  const numeric = components.map((component) => Number.parseFloat(component));
  if (numeric.some((component) => !Number.isFinite(component))) {
    return false;
  }
  if (isRgb) {
    return (
      components.slice(0, 3).every((component, index) => {
        const maximum = component.endsWith('%') ? 100 : 255;
        return numeric[index] >= 0 && numeric[index] <= maximum;
      }) && validateAlpha(components[3], numeric[3])
    );
  }
  return (
    numeric[1] >= 0 &&
    numeric[1] <= 100 &&
    components[1].endsWith('%') &&
    numeric[2] >= 0 &&
    numeric[2] <= 100 &&
    components[2].endsWith('%') &&
    validateAlpha(components[3], numeric[3])
  );
}

function validateAlpha(component: string | undefined, numeric: number | undefined): boolean {
  if (component === undefined) {
    return true;
  }
  const maximum = component.endsWith('%') ? 100 : 1;
  return numeric !== undefined && numeric >= 0 && numeric <= maximum;
}

function isValidCssColor(value: string): boolean {
  return (
    HEX_COLOR_PATTERN.test(value) ||
    CSS_NAMED_COLORS.has(value.toLowerCase()) ||
    isValidFunctionalColor(value)
  );
}

function sanitizeGradientStops(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const stops = value
    .slice(0, RUNTIME_SETTING_LIMITS.gradientStopCount)
    .filter((candidate): candidate is string => typeof candidate === 'string')
    .map((candidate) => candidate.trim())
    .filter(
      (candidate) =>
        candidate.length > 0 &&
        candidate.length <= RUNTIME_SETTING_LIMITS.gradientStopLength &&
        !containsUnsafeCss(candidate) &&
        isValidCssColor(candidate)
    );
  return stops.length >= 2 ? stops : [...fallback];
}

export function normalizeRuntimeSettings(
  partial: PartialRuntimeSettings = {}
): ThemeRuntimeSettings {
  const explicitSettings = partial.explicitSettings?.cursor
    ? {
        cursor: { ...partial.explicitSettings.cursor },
      }
    : undefined;

  return {
    overlay: {
      enabled: sanitizeBoolean(partial.overlay?.enabled, DEFAULT_RUNTIME_SETTINGS.overlay.enabled),
      hueShift: sanitizeNumber(
        partial.overlay?.hueShift,
        DEFAULT_RUNTIME_SETTINGS.overlay.hueShift,
        0,
        180
      ),
      lightnessDelta: sanitizeNumber(
        partial.overlay?.lightnessDelta,
        DEFAULT_RUNTIME_SETTINGS.overlay.lightnessDelta,
        0,
        0.5
      ),
      neutralChroma: sanitizeNumber(
        partial.overlay?.neutralChroma,
        DEFAULT_RUNTIME_SETTINGS.overlay.neutralChroma,
        0,
        0.4
      ),
      angle: sanitizeNumber(partial.overlay?.angle, DEFAULT_RUNTIME_SETTINGS.overlay.angle, 0, 360),
    },
    syntaxGradient: {
      enabled: sanitizeBoolean(
        partial.syntaxGradient?.enabled,
        DEFAULT_RUNTIME_SETTINGS.syntaxGradient.enabled
      ),
      customRules: sanitizeCustomRules(partial.syntaxGradient?.customRules),
    },
    glow: {
      enabled: sanitizeBoolean(partial.glow?.enabled, DEFAULT_RUNTIME_SETTINGS.glow.enabled),
      intensity: sanitizeNumber(
        partial.glow?.intensity,
        DEFAULT_RUNTIME_SETTINGS.glow.intensity,
        0.1,
        3
      ),
      customRules: sanitizeCustomRules(partial.glow?.customRules),
    },
    cursor: {
      enabled: sanitizeBoolean(partial.cursor?.enabled, DEFAULT_RUNTIME_SETTINGS.cursor.enabled),
      animationDuration: sanitizeNumber(
        partial.cursor?.animationDuration,
        DEFAULT_RUNTIME_SETTINGS.cursor.animationDuration,
        1,
        60
      ),
      gradientStops: sanitizeGradientStops(
        partial.cursor?.gradientStops,
        DEFAULT_RUNTIME_SETTINGS.cursor.gradientStops
      ),
      borderRadius: sanitizeNumber(
        partial.cursor?.borderRadius,
        DEFAULT_RUNTIME_SETTINGS.cursor.borderRadius,
        0,
        24
      ),
      glow: sanitizeBoolean(partial.cursor?.glow, DEFAULT_RUNTIME_SETTINGS.cursor.glow),
      glowBlur: sanitizeNumber(
        partial.cursor?.glowBlur,
        DEFAULT_RUNTIME_SETTINGS.cursor.glowBlur,
        0,
        24
      ),
      glowOpacity: sanitizeNumber(
        partial.cursor?.glowOpacity,
        DEFAULT_RUNTIME_SETTINGS.cursor.glowOpacity,
        0,
        1
      ),
      customRules: sanitizeCustomRules(partial.cursor?.customRules),
    },
    ...(explicitSettings ? { explicitSettings } : {}),
  };
}

export function featureFlagsFromSettings(settings: ThemeRuntimeSettings): FeatureFlags {
  return {
    syntaxGradient: settings.syntaxGradient.enabled,
    glow: settings.glow.enabled,
    cursor: settings.cursor.enabled,
  };
}
