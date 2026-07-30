export type TokenColorRule = {
  scope?: string | string[];
  settings?: {
    foreground?: string;
    background?: string;
  };
};

export type TokenColorTheme = {
  colors?: Record<string, string>;
  tokenColors?: TokenColorRule[];
};

export type EditorColorOverrides = {
  foreground?: string;
  background?: string;
};

export type TokenGradientProfile = {
  lightnessDelta: number;
  hueDelta: number;
  angle?: number;
  tokenColors?: string[];
  minimumWidthCh?: number;
};

export type TokenGradientStops = {
  light: string;
  base: string;
  dark: string;
};

export type TokenGradientScaleStop = {
  color: string;
  offset: number;
};

type ColorCustomizations = Record<string, unknown>;

const AUTO_TOKEN_GRADIENTS_MARKER = '/* __WOODFISH_AUTO_TOKEN_GRADIENTS__ */';
const TOKEN_GRADIENT_SAMPLE_COUNT = 9;
const DEFAULT_TOKEN_GRADIENT_MINIMUM_WIDTH_CH = 6;
const EDITOR_FOREGROUND_SELECTOR_PATTERN = /\.__WOODFISH_EDITOR_FOREGROUND__/g;
const TOKEN_SELECTOR_PATTERN = /\.__WOODFISH_TOKEN_([A-Z0-9]+)__/gi;
const UNRESOLVED_TEMPLATE_PATTERN = /__WOODFISH_[A-Z0-9_]+__/i;
const THEME_SCOPE_PATTERN = /\[([^\]]+)\]/g;
// Both bundled Woodfish themes contribute `vs-dark`, so VS Code's `default` sentinel
// resolves to these editor registry colors.
const DARK_EDITOR_DEFAULTS = {
  foreground: '#BBBBBB',
  background: '#1E1E1E',
} as const;

function isRecord(value: unknown): value is ColorCustomizations {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const match = value.trim().match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) {
    return undefined;
  }

  const source = match[1];
  const expanded =
    source.length === 3 || source.length === 4
      ? Array.from(source)
          .map((character) => character.repeat(2))
          .join('')
      : source;
  const normalized = expanded.toUpperCase();

  return normalized.length === 8 && normalized.endsWith('FF') ? normalized.slice(0, 6) : normalized;
}

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type OklabColor = {
  l: number;
  a: number;
  b: number;
};

type OklchColor = {
  l: number;
  c: number;
  h: number;
};

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseRgb(color: string): RgbColor {
  return {
    r: Number.parseInt(color.slice(0, 2), 16),
    g: Number.parseInt(color.slice(2, 4), 16),
    b: Number.parseInt(color.slice(4, 6), 16),
  };
}

function formatHexChannel(value: number): string {
  return Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

function formatRgb(color: RgbColor, alpha: string): string {
  return `#${formatHexChannel(color.r)}${formatHexChannel(color.g)}${formatHexChannel(color.b)}${alpha}`;
}

function srgbToLinear(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function linearToSrgb(value: number): number {
  const channel = value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return channel * 255;
}

function rgbToOklab(color: RgbColor): OklabColor {
  const red = srgbToLinear(color.r);
  const green = srgbToLinear(color.g);
  const blue = srgbToLinear(color.b);
  const light = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);

  return {
    l: 0.2104542553 * light + 0.793617785 * medium - 0.0040720468 * short,
    a: 1.9779984951 * light - 2.428592205 * medium + 0.4505937099 * short,
    b: 0.0259040371 * light + 0.7827717662 * medium - 0.808675766 * short,
  };
}

function oklabToRgb(color: OklabColor): RgbColor {
  const light = color.l + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const medium = color.l - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const short = color.l - 0.0894841775 * color.a - 1.291485548 * color.b;
  const linearLight = light ** 3;
  const linearMedium = medium ** 3;
  const linearShort = short ** 3;

  return {
    r: linearToSrgb(
      4.0767416621 * linearLight - 3.3077115913 * linearMedium + 0.2309699292 * linearShort
    ),
    g: linearToSrgb(
      -1.2684380046 * linearLight + 2.6097574011 * linearMedium - 0.3413193965 * linearShort
    ),
    b: linearToSrgb(
      -0.0041960863 * linearLight - 0.7034186147 * linearMedium + 1.707614701 * linearShort
    ),
  };
}

function oklabToOklch(color: OklabColor): OklchColor {
  return {
    l: color.l,
    c: Math.sqrt(color.a * color.a + color.b * color.b),
    h: Math.atan2(color.b, color.a),
  };
}

function oklchToOklab(color: OklchColor): OklabColor {
  return {
    l: color.l,
    a: color.c * Math.cos(color.h),
    b: color.c * Math.sin(color.h),
  };
}

function isInSrgbGamut(color: RgbColor): boolean {
  return [color.r, color.g, color.b].every(
    (channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255
  );
}

function gamutMapOklchToRgb(color: OklchColor): RgbColor {
  const rgb = oklabToRgb(oklchToOklab(color));
  if (isInSrgbGamut(rgb)) {
    return rgb;
  }

  let minimumChroma = 0;
  let maximumChroma = color.c;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const candidateChroma = (minimumChroma + maximumChroma) / 2;
    const candidate = oklabToRgb(oklchToOklab({ ...color, c: candidateChroma }));
    if (isInSrgbGamut(candidate)) {
      minimumChroma = candidateChroma;
    } else {
      maximumChroma = candidateChroma;
    }
  }

  return oklabToRgb(oklchToOklab({ ...color, c: minimumChroma }));
}

function validateGradientProfile(profile: TokenGradientProfile): void {
  if (
    !Number.isFinite(profile.lightnessDelta) ||
    profile.lightnessDelta < 0 ||
    profile.lightnessDelta > 0.5
  ) {
    throw new Error('Token gradient lightnessDelta must be between 0 and 0.5.');
  }
  if (!Number.isFinite(profile.hueDelta) || profile.hueDelta < 0 || profile.hueDelta > 180) {
    throw new Error('Token gradient hueDelta must be between 0 and 180 degrees.');
  }
  if (profile.angle !== undefined && !Number.isFinite(profile.angle)) {
    throw new Error('Token gradient angle must be finite.');
  }
  if (
    profile.minimumWidthCh !== undefined &&
    (!Number.isFinite(profile.minimumWidthCh) || profile.minimumWidthCh <= 0)
  ) {
    throw new Error('Token gradient minimumWidthCh must be greater than zero.');
  }
  if (profile.tokenColors !== undefined && profile.tokenColors.length === 0) {
    throw new Error('Token gradient tokenColors must not be empty.');
  }
}

export function deriveTokenGradientScale(
  value: string,
  profile: TokenGradientProfile
): TokenGradientScaleStop[] {
  validateGradientProfile(profile);
  const normalized = normalizeHexColor(value);
  if (!normalized) {
    throw new Error(`Invalid token gradient color: ${value}`);
  }

  const rgb = normalized.slice(0, 6);
  const alpha = normalized.slice(6);
  const base = oklabToOklch(rgbToOklab(parseRgb(rgb)));
  const hueDelta = (profile.hueDelta * Math.PI) / 180;

  return Array.from({ length: TOKEN_GRADIENT_SAMPLE_COUNT }, (_, index) => {
    const offset = index / (TOKEN_GRADIENT_SAMPLE_COUNT - 1);
    if (offset === 0.5) {
      return {
        color: `#${normalized}`,
        offset: 50,
      };
    }

    const signedDistance = (offset - 0.5) * 2;
    const color = gamutMapOklchToRgb({
      ...base,
      l: clamp(base.l - signedDistance * profile.lightnessDelta),
      h: base.h + signedDistance * hueDelta,
    });

    return {
      color: formatRgb(color, alpha),
      offset: offset * 100,
    };
  });
}

export function deriveTokenGradientStops(
  value: string,
  profile: TokenGradientProfile
): TokenGradientStops {
  const scale = deriveTokenGradientScale(value, profile);
  return {
    light: scale[0].color,
    base: scale[(scale.length - 1) / 2].color,
    dark: scale[scale.length - 1].color,
  };
}

function themeScopeMatches(scope: string, themeLabel: string): boolean {
  const normalizedScope = scope.trim();
  const startsWithWildcard = normalizedScope.startsWith('*');
  const endsWithWildcard = normalizedScope.endsWith('*');
  const unwrapped = normalizedScope.slice(
    startsWithWildcard ? 1 : 0,
    endsWithWildcard ? -1 : undefined
  );

  if (startsWithWildcard && endsWithWildcard) {
    return themeLabel.includes(unwrapped);
  }
  if (startsWithWildcard) {
    return themeLabel.endsWith(unwrapped);
  }
  if (endsWithWildcard) {
    return themeLabel.startsWith(unwrapped);
  }

  return themeLabel === normalizedScope;
}

function applyEditorColors(
  target: EditorColorOverrides,
  customizations: ColorCustomizations
): void {
  const foregroundValue = customizations['editor.foreground'];
  const backgroundValue = customizations['editor.background'];
  const foreground = normalizeHexColor(foregroundValue);
  const background = normalizeHexColor(backgroundValue);

  if (foreground) {
    target.foreground = `#${foreground}`;
  } else if (foregroundValue === 'default') {
    target.foreground = DARK_EDITOR_DEFAULTS.foreground;
  }
  if (background) {
    target.background = `#${background}`;
  } else if (backgroundValue === 'default') {
    target.background = DARK_EDITOR_DEFAULTS.background;
  }
}

export function resolveEditorColorOverrides(
  customizations: unknown,
  themeLabel: string
): EditorColorOverrides {
  const overrides: EditorColorOverrides = {};
  if (!isRecord(customizations)) {
    return overrides;
  }

  applyEditorColors(overrides, customizations);
  for (const [key, value] of Object.entries(customizations)) {
    if (!isRecord(value)) {
      continue;
    }

    const scopes = Array.from(key.matchAll(THEME_SCOPE_PATTERN), (match) => match[1]);
    if (scopes.some((scope) => themeScopeMatches(scope, themeLabel))) {
      applyEditorColors(overrides, value);
    }
  }

  return overrides;
}

export function buildTokenColorIndex(
  theme: TokenColorTheme,
  overrides: EditorColorOverrides = {}
): ReadonlyMap<string, number> {
  const colorToId = new Map<string, number>();

  const addColor = (value: unknown): void => {
    const color = normalizeHexColor(value);
    if (!color || colorToId.has(color)) {
      return;
    }

    colorToId.set(color, colorToId.size + 1);
  };

  addColor(overrides.foreground ?? theme.colors?.['editor.foreground']);
  addColor(overrides.background ?? theme.colors?.['editor.background']);

  // Mirrors VS Code's ColorThemeData order. Custom, default, and semantic colors are
  // appended later, so they cannot change IDs already assigned to built-in theme colors.
  for (const rule of theme.tokenColors ?? []) {
    if (!rule.scope || !rule.settings) {
      continue;
    }

    addColor(rule.settings.foreground);
    addColor(rule.settings.background);
  }

  return colorToId;
}

function collectTokenForegroundColors(
  theme: TokenColorTheme,
  overrides: EditorColorOverrides,
  profile: TokenGradientProfile
): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();
  const addColor = (value: unknown): void => {
    const color = normalizeHexColor(value);
    if (!color || seen.has(color)) {
      return;
    }

    seen.add(color);
    colors.push(color);
  };

  if (profile.tokenColors) {
    for (const value of profile.tokenColors) {
      const color = normalizeHexColor(value);
      if (!color) {
        throw new Error(`Invalid token gradient profile color: ${value}`);
      }
      addColor(value);
    }
    return colors;
  }

  addColor(overrides.foreground ?? theme.colors?.['editor.foreground']);
  for (const rule of theme.tokenColors ?? []) {
    if (!rule.scope || !rule.settings) {
      continue;
    }

    addColor(rule.settings.foreground);
  }

  return colors;
}

export function buildAutomaticTokenGradientCss(
  theme: TokenColorTheme,
  overrides: EditorColorOverrides,
  profile: TokenGradientProfile
): string {
  validateGradientProfile(profile);
  const colorIndex = buildTokenColorIndex(theme, overrides);
  const angle = profile.angle ?? 90;
  const minimumWidthCh = profile.minimumWidthCh ?? DEFAULT_TOKEN_GRADIENT_MINIMUM_WIDTH_CH;

  return collectTokenForegroundColors(theme, overrides, profile)
    .map((color) => {
      const colorId = colorIndex.get(color);
      if (!colorId) {
        throw new Error(`Runtime token color is missing from the active color index: #${color}`);
      }

      const stops = deriveTokenGradientScale(`#${color}`, profile);
      const gradientStops = stops.map((stop, index) => {
        const suffix = index === stops.length - 1 ? '' : ',';
        return `    ${stop.color} ${stop.offset}%${suffix}`;
      });
      return [
        `.monaco-editor .view-lines span.mtk${colorId}:not(.cursor):not(.colorpicker-color-decoration) {`,
        '  background-image: linear-gradient(',
        `    ${angle}deg,`,
        ...gradientStops,
        '  ) !important;',
        '  -webkit-text-fill-color: transparent !important;',
        '  background-clip: text !important;',
        '  -webkit-background-clip: text !important;',
        '  background-repeat: no-repeat !important;',
        `  background-size: max(100%, ${minimumWidthCh}ch) 100% !important;`,
        '  background-position: center !important;',
        '}',
      ].join('\n');
    })
    .join('\n\n');
}

export function compileTokenColorSelectors(
  template: string,
  theme: TokenColorTheme,
  overrides: EditorColorOverrides = {},
  gradientProfile?: TokenGradientProfile
): string {
  const colorIndex = buildTokenColorIndex(theme, overrides);
  const missingColors = new Set<string>();
  let compiled = template;
  if (compiled.includes(AUTO_TOKEN_GRADIENTS_MARKER)) {
    if (!gradientProfile) {
      throw new Error('Runtime token gradient template requires a gradient profile.');
    }

    compiled = compiled
      .split(AUTO_TOKEN_GRADIENTS_MARKER)
      .join(buildAutomaticTokenGradientCss(theme, overrides, gradientProfile));
  }

  compiled = compiled
    .replace(EDITOR_FOREGROUND_SELECTOR_PATTERN, '.mtk1')
    .replace(TOKEN_SELECTOR_PATTERN, (match, rawColor: string) => {
      const color = normalizeHexColor(`#${rawColor}`);
      const colorId = color ? colorIndex.get(color) : undefined;
      if (!colorId) {
        missingColors.add(`#${rawColor.toUpperCase()}`);
        return match;
      }

      return `.mtk${colorId}`;
    });

  if (missingColors.size > 0) {
    throw new Error(
      `Runtime token colors are missing from the active theme: ${Array.from(missingColors).join(', ')}`
    );
  }
  if (UNRESOLVED_TEMPLATE_PATTERN.test(compiled)) {
    throw new Error('Runtime token template contains an unsupported placeholder.');
  }

  return compiled;
}
