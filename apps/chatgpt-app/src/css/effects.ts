import {
  PAINTED_TOKEN_SELECTOR,
  buildGlowDeclarations,
  buildGradientDeclarations,
  buildLightGlowDeclarations,
  buildPunctuationGlowDeclarations,
  formatCssNumber,
} from '@woodfish/renderer-runtime';
import { CODE_ROOT_SELECTOR } from '../selectors';
import { CodexCoreView } from '../settings';

const ANGLE_VARIABLE = '--woodfish-codex-angle';

function rule(selector: string, declarations: string[]): string {
  return [`${selector} {`, ...declarations, '}'].join('\n');
}

function scoped(scope: string, inner: string): string {
  return inner
    .split(',')
    .map((part) => `${scope} ${part.trim()}`)
    .join(',\n');
}

/** Gradient and glow on painted code tokens. */
export function buildCodeCss(settings: CodexCoreView): string {
  const parts: string[] = [];
  const tokens = scoped(CODE_ROOT_SELECTOR, PAINTED_TOKEN_SELECTOR);
  const declarations: string[] = [];
  if (settings.codeGradient.enabled) {
    parts.push(
      rule(':root', [`  ${ANGLE_VARIABLE}: ${formatCssNumber(settings.codeGradient.angle)}deg;`])
    );
    declarations.push(...buildGradientDeclarations(ANGLE_VARIABLE));
  }
  if (settings.codeGlow.enabled) {
    declarations.push(...buildGlowDeclarations(settings.codeGlow.intensity));
  }
  if (declarations.length > 0) {
    parts.push(rule(tokens, declarations));
  }
  if (settings.codeGlow.enabled) {
    const intensity = settings.codeGlow.intensity;
    parts.push(
      rule(
        scoped(CODE_ROOT_SELECTOR, `${PAINTED_TOKEN_SELECTOR}[data-woodfish-punctuation="true"]`),
        buildPunctuationGlowDeclarations(intensity)
      ),
      // Light mode glows in a bright tint of the text hue (theme-core), not a dark halo.
      rule(scoped('[data-theme="light"]', tokens), buildLightGlowDeclarations(intensity))
    );
  }
  return parts.join('\n\n');
}

/**
 * Gradient and glow for diff tokens. Codex's diff viewer renders into a shadow root,
 * which page styles cannot reach, so this sheet is mounted inside each one. Its colors
 * are fixed inline per token; the engine maps them into the palette and the text takes
 * the mapped color even when the gradient is off. Custom properties such as the angle
 * inherit into the shadow tree.
 */
export function buildDiffCss(settings: CodexCoreView): string {
  if (!settings.codeGradient.enabled && !settings.codeGlow.enabled) {
    return '';
  }
  const tokens = `[data-diff] ${PAINTED_TOKEN_SELECTOR}`;
  const declarations = ['  color: var(--woodfish-overlay-gradient-base) !important;'];
  if (settings.codeGradient.enabled) {
    declarations.push(...buildGradientDeclarations(ANGLE_VARIABLE));
  }
  if (settings.codeGlow.enabled) {
    declarations.push(...buildGlowDeclarations(settings.codeGlow.intensity));
  }
  const parts = [rule(tokens, declarations)];
  if (settings.codeGlow.enabled) {
    const intensity = settings.codeGlow.intensity;
    parts.push(
      rule(
        `${tokens}[data-woodfish-punctuation="true"]`,
        buildPunctuationGlowDeclarations(intensity)
      ),
      rule(`:host-context([data-theme="light"]) ${tokens}`, buildLightGlowDeclarations(intensity))
    );
  }
  return parts.join('\n\n');
}
