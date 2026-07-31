import { ThemeRuntimeSettings, normalizeRuntimeSettings } from '../../types/features';

const OVERLAY_TOKEN_SELECTOR = '[data-woodfish-overlay-token="true"]';

function formatCssNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function scaleGlowRadius(radius: number, intensity: number): string {
  return `${formatCssNumber(Math.max(0.5, radius * intensity))}px`;
}

function buildOverlayVariables(settings: ThemeRuntimeSettings): string {
  return [
    ':root {',
    `  --woodfish-overlay-angle: ${formatCssNumber(settings.overlay.angle)}deg;`,
    `  --woodfish-overlay-hue-shift: ${formatCssNumber(settings.overlay.hueShift)};`,
    `  --woodfish-overlay-lightness-delta: ${formatCssNumber(settings.overlay.lightnessDelta)};`,
    `  --woodfish-overlay-neutral-chroma: ${formatCssNumber(settings.overlay.neutralChroma)};`,
    '}',
  ].join('\n');
}

function buildGradientDeclarations(): string[] {
  return [
    '  background-image: linear-gradient(',
    '    var(--woodfish-overlay-angle),',
    '    var(--woodfish-overlay-gradient-light) 0%,',
    '    var(--woodfish-overlay-gradient-base) 50%,',
    '    var(--woodfish-overlay-gradient-dark) 100%',
    '  ) !important;',
    '  background-clip: text !important;',
    '  -webkit-background-clip: text !important;',
    '  -webkit-text-fill-color: transparent !important;',
    '  background-repeat: no-repeat !important;',
    '  background-size: 100% 100% !important;',
    '  background-position: center !important;',
  ];
}

function buildGlowDeclarations(intensity: number): string[] {
  return [
    '  text-shadow:',
    `    0 0 ${scaleGlowRadius(4, intensity)} var(--woodfish-overlay-glow-near),`,
    `    0 0 ${scaleGlowRadius(10, intensity)} var(--woodfish-overlay-glow-mid),`,
    `    0 0 ${scaleGlowRadius(20, intensity)} var(--woodfish-overlay-glow-far) !important;`,
  ];
}

function buildPunctuationGlowDeclarations(intensity: number): string[] {
  return [
    '  text-shadow:',
    `    0 0 ${scaleGlowRadius(2, intensity)} var(--woodfish-overlay-punctuation-glow-near),`,
    `    0 0 ${scaleGlowRadius(6, intensity)} var(--woodfish-overlay-punctuation-glow-far) !important;`,
  ];
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

  return parts.join('\n\n');
}

export function shouldInstallOverlayBootstrap(settings: ThemeRuntimeSettings): boolean {
  const safeSettings = normalizeRuntimeSettings(settings);
  return (
    safeSettings.overlay.enabled &&
    (safeSettings.syntaxGradient.enabled || safeSettings.glow.enabled)
  );
}
