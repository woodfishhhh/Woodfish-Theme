import {
  CursorSettings,
  CursorThemeDefaultKey,
  DEFAULT_RUNTIME_SETTINGS,
  ThemeRuntimeSettings,
  normalizeRuntimeSettings,
} from '../../types/features';

export type RuntimeCssAssets = {
  themeVariables?: string;
  cursorDefaults?: CursorThemeDefaults;
  activityBar: string;
  tabBar: string;
  syntaxGradient: string;
  glow: string;
  cursorCore: string;
  cursorGlow: string;
};

export type CursorThemeDefaults = Partial<
  Pick<
    CursorSettings,
    'animationDuration' | 'gradientStops' | 'borderRadius' | 'glowBlur' | 'glowOpacity'
  >
>;

export const DEFAULT_BEARDED_THEME_VARIABLES = `
:root {
  --woodfish-activity-badge-gradient: linear-gradient(45deg, #eacd61, #ea618e);
  --woodfish-activity-badge-text-color: rgb(70 70 70);
  --woodfish-tab-border-gradient: linear-gradient(to right, #eacd61, #ea618e, #3cec85, #61afea);
}
`.trim();

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

function stringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function applyThemeCursorDefaults(
  cursor: CursorSettings,
  defaults: CursorThemeDefaults | undefined,
  explicitSettings: Partial<Record<CursorThemeDefaultKey, boolean>> | undefined
): CursorSettings {
  if (!defaults) {
    return cursor;
  }

  const runtimeDefaults = DEFAULT_RUNTIME_SETTINGS.cursor;
  const gradientStops =
    defaults.gradientStops &&
    explicitSettings?.gradientStops !== true &&
    stringArraysEqual(cursor.gradientStops, runtimeDefaults.gradientStops)
      ? [...defaults.gradientStops]
      : [...cursor.gradientStops];

  return {
    ...cursor,
    animationDuration:
      defaults.animationDuration !== undefined &&
      explicitSettings?.animationDuration !== true &&
      cursor.animationDuration === runtimeDefaults.animationDuration
        ? defaults.animationDuration
        : cursor.animationDuration,
    gradientStops,
    borderRadius:
      defaults.borderRadius !== undefined &&
      explicitSettings?.borderRadius !== true &&
      cursor.borderRadius === runtimeDefaults.borderRadius
        ? defaults.borderRadius
        : cursor.borderRadius,
    glowBlur:
      defaults.glowBlur !== undefined &&
      explicitSettings?.glowBlur !== true &&
      cursor.glowBlur === runtimeDefaults.glowBlur
        ? defaults.glowBlur
        : cursor.glowBlur,
    glowOpacity:
      defaults.glowOpacity !== undefined &&
      explicitSettings?.glowOpacity !== true &&
      cursor.glowOpacity === runtimeDefaults.glowOpacity
        ? defaults.glowOpacity
        : cursor.glowOpacity,
  };
}

function hasGradientDeclaration(css: string): boolean {
  return /linear-gradient\(/i.test(css);
}

function applyCursorSettings(cursorCss: string, cursor: CursorSettings): string {
  const gradient = buildCursorGradient(cursor.gradientStops);

  const configured = cursorCss
    .replace(/30s/g, `${cursor.animationDuration}s`)
    .replace(/8s/g, `${cursor.animationDuration}s`)
    .replace(/border-radius:\s*90px/gi, `border-radius: ${cursor.borderRadius}px`)
    .replace(/border-radius:\s*2px/gi, `border-radius: ${cursor.borderRadius}px`);

  return configured.includes('--woodfish-cursor-gradient')
    ? configured
    : configured.replace(/linear-gradient\([\s\S]*?\)\s*!important;/gi, `${gradient} !important;`);
}

function buildCursorVariables(settings: CursorSettings): string {
  const glowFilter = settings.glowBlur > 0 ? `blur(${settings.glowBlur}px)` : 'none';
  return [
    ':root {',
    `  --woodfish-cursor-gradient: ${buildCursorGradient(settings.gradientStops)};`,
    `  --woodfish-cursor-animation-duration: ${settings.animationDuration}s;`,
    `  --woodfish-cursor-border-radius: ${settings.borderRadius}px;`,
    `  --woodfish-cursor-glow-filter: ${glowFilter};`,
    `  --woodfish-cursor-glow-opacity: ${settings.glowOpacity};`,
    '}',
  ].join('\n');
}

function buildCursorCss(settings: CursorSettings, assets: RuntimeCssAssets): string {
  const parts: string[] = [buildCursorVariables(settings)];
  const gradient = buildCursorGradient(settings.gradientStops);
  const core = applyCursorSettings(assets.cursorCore, settings);
  parts.push(core);

  if (!hasGradientDeclaration(core)) {
    parts.push(['div.cursor {', `  background: ${gradient} !important;`, '}'].join('\n'));
  }

  if (settings.glow) {
    const glowStrength = Math.max(0, Math.min(1, settings.glowOpacity));
    const glowBlur = Math.max(0, settings.glowBlur);
    const glowFilter = glowBlur > 0 ? `blur(${glowBlur}px)` : 'none';
    const glowLayer = applyCursorSettings(assets.cursorGlow, settings)
      .replace(/filter:\s*none\s*!important;/gi, `filter: ${glowFilter} !important;`)
      .replace(
        /opacity:\s*(?:0(?:\.\d+)?|1(?:\.0+)?)\s*!important;/gi,
        `opacity: ${glowStrength} !important;`
      )
      .replace(/rgba\(255,\s*255,\s*255,\s*0\.7\)/gi, `rgba(255, 255, 255, ${glowStrength})`);
    parts.push(glowLayer);

    if (!hasGradientDeclaration(glowLayer)) {
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
  const safeSettings = normalizeRuntimeSettings(settings);
  const parts: string[] = ['/* Woodfish runtime payload */'];
  const themeVariables = assets.themeVariables?.trim();
  if (themeVariables && themeVariables.length > 0) {
    parts.push(themeVariables);
  }
  parts.push(assets.activityBar.trim(), assets.tabBar.trim());

  if (safeSettings.syntaxGradient.enabled) {
    parts.push(assets.syntaxGradient.trim());
    if (safeSettings.syntaxGradient.customRules.length > 0) {
      parts.push(safeSettings.syntaxGradient.customRules.join('\n'));
    }
  }

  if (safeSettings.glow.enabled) {
    parts.push(scaleGlowCss(assets.glow.trim(), safeSettings.glow.intensity));
    if (safeSettings.glow.customRules.length > 0) {
      parts.push(safeSettings.glow.customRules.join('\n'));
    }
  }

  if (safeSettings.cursor.enabled) {
    parts.push(
      buildCursorCss(
        applyThemeCursorDefaults(
          safeSettings.cursor,
          assets.cursorDefaults,
          safeSettings.explicitSettings?.cursor
        ),
        assets
      )
    );
  }

  return `${parts.filter((part) => part.length > 0).join('\n\n')}\n`;
}

export { DEFAULT_RUNTIME_SETTINGS, normalizeRuntimeSettings };
