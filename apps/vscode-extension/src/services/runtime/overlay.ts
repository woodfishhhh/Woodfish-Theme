import {
  PAINTED_TOKEN_SELECTOR,
  buildGlowDeclarations,
  buildGradientDeclarations,
  buildPunctuationGlowDeclarations,
  formatCssNumber,
  scaleGlowRadius,
} from '@woodfish/renderer-runtime';
import { ThemeRuntimeSettings, normalizeRuntimeSettings } from '../../types/features';

const OVERLAY_TOKEN_SELECTOR = PAINTED_TOKEN_SELECTOR;

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

  const declarations: string[] = [];
  if (safeSettings.syntaxGradient.enabled) {
    declarations.push(...buildGradientDeclarations());
  }
  if (safeSettings.glow.enabled) {
    declarations.push(...buildGlowDeclarations(safeSettings.glow.intensity));
  }

  const parts = [buildOverlayVariables(safeSettings)];
  if (declarations.length > 0) {
    parts.push([`${OVERLAY_TOKEN_SELECTOR} {`, ...declarations, '}'].join('\n'));
  }
  if (safeSettings.glow.enabled) {
    parts.push(
      [
        `${OVERLAY_TOKEN_SELECTOR}[data-woodfish-punctuation="true"] {`,
        ...buildPunctuationGlowDeclarations(safeSettings.glow.intensity),
        '}',
      ].join('\n')
    );
  }

  if (safeSettings.glow.enabled) {
    // Light themes: the same glow reads as blur on a bright background, so it is softened.
    parts.push(
      [
        `.monaco-workbench.vs ${OVERLAY_TOKEN_SELECTOR},`,
        `.monaco-workbench.hc-light ${OVERLAY_TOKEN_SELECTOR} {`,
        '  text-shadow:',
        `    0 0 ${scaleGlowRadius(2, safeSettings.glow.intensity)} var(--woodfish-overlay-glow-mid) !important;`,
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
    (safeSettings.syntaxGradient.enabled || safeSettings.glow.enabled || glassNeedsScript)
  );
}
