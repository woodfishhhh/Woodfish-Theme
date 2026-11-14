import {
  PAINTED_TOKEN_SELECTOR,
  buildGlowDeclarations,
  buildGradientDeclarations,
  buildLightGlowDeclarations,
  buildPunctuationGlowDeclarations,
  formatCssNumber,
  scaleGlowRadius,
} from '@woodfish/renderer-runtime';
import { ThemeRuntimeSettings, normalizeRuntimeSettings } from '../../types/features';

const OVERLAY_TOKEN_SELECTOR = PAINTED_TOKEN_SELECTOR;

/** The 5.x glow (#31): one wide halo in the token's own color, punctuation included. */
function buildClassicGlowDeclarations(intensity: number): string[] {
  return [`  text-shadow: 0 0 ${scaleGlowRadius(20, intensity)} currentColor !important;`];
}

function buildOverlayVariables(settings: ThemeRuntimeSettings): string {
  return [
    ':root {',
    `  --woodfish-overlay-angle: ${formatCssNumber(settings.overlay.angle)}deg;`,
    `  --woodfish-overlay-hue-shift: ${formatCssNumber(settings.overlay.hueShift)};`,
    `  --woodfish-overlay-lightness-delta: ${formatCssNumber(settings.overlay.lightnessDelta)};`,
    `  --woodfish-overlay-neutral-chroma: ${formatCssNumber(settings.overlay.neutralChroma)};`,
    `  --woodfish-overlay-tokens: ${settings.syntaxGradient.enabled || settings.glow.enabled ? 1 : 0};`,
    '}',
  ].join('\n');
}

export function buildUniversalOverlayCss(settings: ThemeRuntimeSettings): string {
  const safeSettings = normalizeRuntimeSettings(settings);
  if (!safeSettings.overlay.enabled) {
    return '';
  }

  const classic = safeSettings.overlay.style === 'classic';
  const declarations: string[] = [];
  if (safeSettings.syntaxGradient.enabled) {
    declarations.push(...buildGradientDeclarations());
  }
  if (classic && (safeSettings.syntaxGradient.enabled || safeSettings.glow.enabled)) {
    declarations.push('  font-weight: 700 !important;');
  }
  if (safeSettings.glow.enabled) {
    declarations.push(
      ...(classic ? buildClassicGlowDeclarations : buildGlowDeclarations)(
        safeSettings.glow.intensity
      )
    );
  }

  const parts = [buildOverlayVariables(safeSettings)];
  if (declarations.length > 0) {
    parts.push([`${OVERLAY_TOKEN_SELECTOR} {`, ...declarations, '}'].join('\n'));
  }
  if (safeSettings.glow.enabled && !classic) {
    parts.push(
      [
        `${OVERLAY_TOKEN_SELECTOR}[data-woodfish-punctuation="true"] {`,
        ...buildPunctuationGlowDeclarations(safeSettings.glow.intensity),
        '}',
      ].join('\n')
    );
  }

  if (safeSettings.glow.enabled) {
    // Light themes: the glow is a bright tint of the text hue there (theme-core), drawn as
    // a tight edge and a soft halo instead of a dark smudge, in the classic style too.
    parts.push(
      [
        `.monaco-workbench.vs ${OVERLAY_TOKEN_SELECTOR},`,
        `.monaco-workbench.hc-light ${OVERLAY_TOKEN_SELECTOR} {`,
        ...buildLightGlowDeclarations(safeSettings.glow.intensity),
        '}',
      ].join('\n')
    );
  }

  return parts.join('\n\n');
}

export function shouldInstallOverlayBootstrap(settings: ThemeRuntimeSettings): boolean {
  const safeSettings = normalizeRuntimeSettings(settings);
  const glassNeedsScript =
    safeSettings.glass.enabled &&
    (safeSettings.glass.mode === 'acrylic' || safeSettings.glass.reveal);
  return (
    safeSettings.overlay.enabled &&
    (safeSettings.syntaxGradient.enabled ||
      safeSettings.glow.enabled ||
      glassNeedsScript ||
      safeSettings.effects.enabled)
  );
}
