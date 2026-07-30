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

type ColorCustomizations = Record<string, unknown>;

const EDITOR_FOREGROUND_SELECTOR_PATTERN = /\.__WOODFISH_EDITOR_FOREGROUND__/g;
const TOKEN_SELECTOR_PATTERN = /\.__WOODFISH_TOKEN_([A-Z0-9]+)__/gi;
const UNRESOLVED_SELECTOR_PATTERN = /\.__WOODFISH_[A-Z0-9_]+__/i;
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

export function compileTokenColorSelectors(
  template: string,
  theme: TokenColorTheme,
  overrides: EditorColorOverrides = {}
): string {
  const colorIndex = buildTokenColorIndex(theme, overrides);
  const missingColors = new Set<string>();
  const compiled = template
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
  if (UNRESOLVED_SELECTOR_PATTERN.test(compiled)) {
    throw new Error('Runtime token selector template contains an unsupported placeholder.');
  }

  return compiled;
}
