import {
  CursorSettings,
  DEFAULT_RUNTIME_SETTINGS,
  ThemeRuntimeSettings,
} from '../../types/features';

export type RuntimeCssAssets = {
  activityBar: string;
  tabBar: string;
  syntaxGradient: string;
  glow: string;
  cursorCore: string;
  cursorTrail: string;
};

type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends string[]
    ? string[]
    : T[K] extends object
      ? PartialDeep<T[K]>
      : T[K];
};

function mergeStringArray(value: string[] | undefined, fallback: string[]): string[] {
  return Array.isArray(value) ? [...value] : [...fallback];
}

export function normalizeRuntimeSettings(
  partial: PartialDeep<ThemeRuntimeSettings> = {}
): ThemeRuntimeSettings {
  return {
    syntaxGradient: {
      enabled: partial.syntaxGradient?.enabled ?? DEFAULT_RUNTIME_SETTINGS.syntaxGradient.enabled,
      customRules: mergeStringArray(
        partial.syntaxGradient?.customRules,
        DEFAULT_RUNTIME_SETTINGS.syntaxGradient.customRules
      ),
    },
    glow: {
      enabled: partial.glow?.enabled ?? DEFAULT_RUNTIME_SETTINGS.glow.enabled,
      intensity: partial.glow?.intensity ?? DEFAULT_RUNTIME_SETTINGS.glow.intensity,
      customRules: mergeStringArray(
        partial.glow?.customRules,
        DEFAULT_RUNTIME_SETTINGS.glow.customRules
      ),
    },
    cursor: {
      enabled: partial.cursor?.enabled ?? DEFAULT_RUNTIME_SETTINGS.cursor.enabled,
      animationDuration:
        partial.cursor?.animationDuration ?? DEFAULT_RUNTIME_SETTINGS.cursor.animationDuration,
      gradientStops: mergeStringArray(
        partial.cursor?.gradientStops,
        DEFAULT_RUNTIME_SETTINGS.cursor.gradientStops
      ),
      borderRadius: partial.cursor?.borderRadius ?? DEFAULT_RUNTIME_SETTINGS.cursor.borderRadius,
      glow: partial.cursor?.glow ?? DEFAULT_RUNTIME_SETTINGS.cursor.glow,
      glowBlur: partial.cursor?.glowBlur ?? DEFAULT_RUNTIME_SETTINGS.cursor.glowBlur,
      glowOpacity: partial.cursor?.glowOpacity ?? DEFAULT_RUNTIME_SETTINGS.cursor.glowOpacity,
      customRules: mergeStringArray(
        partial.cursor?.customRules,
        DEFAULT_RUNTIME_SETTINGS.cursor.customRules
      ),
    },
  };
}

function scaleGlowCss(glowCss: string, intensity: number): string {
  const safeIntensity = Number.isFinite(intensity) && intensity > 0 ? intensity : 1;
  return glowCss.replace(/0 0 (\d+)px currentColor/gi, (_match, size) => {
    const scaled = Math.max(1, Math.round(Number(size) * safeIntensity));
    return `0 0 ${scaled}px currentColor`;
  });
}

function buildCursorGradient(stops: string[]): string {
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

function hasGradientDeclaration(css: string): boolean {
  return /linear-gradient\(/i.test(css);
}

function applyCursorSettings(cursorCss: string, cursor: CursorSettings): string {
  const gradient = buildCursorGradient(cursor.gradientStops);

  return cursorCss
    .replace(/30s/g, `${cursor.animationDuration}s`)
    .replace(/8s/g, `${cursor.animationDuration}s`)
    .replace(/border-radius:\s*90px/gi, `border-radius: ${cursor.borderRadius}px`)
    .replace(/border-radius:\s*2px/gi, `border-radius: ${cursor.borderRadius}px`)
    .replace(/linear-gradient\([\s\S]*?\)\s*!important;/gi, `${gradient} !important;`);
}

function buildCursorCss(settings: CursorSettings, assets: RuntimeCssAssets): string {
  const parts: string[] = [];
  const gradient = buildCursorGradient(settings.gradientStops);
  const core = applyCursorSettings(assets.cursorCore, settings);
  parts.push(core);

  if (!hasGradientDeclaration(core)) {
    parts.push(['div.cursor {', `  background: ${gradient} !important;`, '}'].join('\n'));
  }

  if (settings.glow) {
    const glowStrength = Math.max(0, Math.min(1, settings.glowOpacity));
    const trail = applyCursorSettings(assets.cursorTrail, settings)
      .replace(/blur\(4px\)/gi, `blur(${settings.glowBlur}px)`)
      .replace(/rgba\(255,\s*255,\s*255,\s*0\.7\)/gi, `rgba(255, 255, 255, ${glowStrength})`);
    parts.push(trail);

    if (!hasGradientDeclaration(trail)) {
      parts.push(
        [
          '.monaco-editor .cursors-layer .cursor::before,',
          'div.cursor::after {',
          `  background: ${gradient} !important;`,
          '}',
        ].join('\n')
      );
    }
  }

  if (settings.customRules.length > 0) {
    parts.push(settings.customRules.join('\n'));
  }

  return parts.join('\n\n');
}

export function buildRuntimeCss(settings: ThemeRuntimeSettings, assets: RuntimeCssAssets): string {
  const parts: string[] = [
    '/* Woodfish runtime payload */',
    assets.activityBar.trim(),
    assets.tabBar.trim(),
  ];

  if (settings.syntaxGradient.enabled) {
    parts.push(assets.syntaxGradient.trim());
    if (settings.syntaxGradient.customRules.length > 0) {
      parts.push(settings.syntaxGradient.customRules.join('\n'));
    }
  }

  if (settings.glow.enabled) {
    parts.push(scaleGlowCss(assets.glow.trim(), settings.glow.intensity));
    if (settings.glow.customRules.length > 0) {
      parts.push(settings.glow.customRules.join('\n'));
    }
  }

  if (settings.cursor.enabled) {
    parts.push(buildCursorCss(settings.cursor, assets));
  }

  return `${parts.filter((part) => part.length > 0).join('\n\n')}\n`;
}

export { DEFAULT_RUNTIME_SETTINGS };
