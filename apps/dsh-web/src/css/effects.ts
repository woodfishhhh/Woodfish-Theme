import {
  PAINTED_TOKEN_SELECTOR,
  buildGlowDeclarations,
  buildGradientDeclarations,
  buildLightGlowDeclarations,
  buildPunctuationGlowDeclarations,
  formatCssNumber,
} from '@woodfish/renderer-runtime';
import { CODE_ROOT_SELECTOR, LIGHT_BODY } from '../selectors';
import { DshCoreView } from '../settings';

const ANGLE_VARIABLE = '--woodfish-dsh-angle';

function rule(selector: string, declarations: string[]): string {
  return [`${selector} {`, ...declarations, '}'].join('\n');
}

function scoped(scope: string, inner: string): string {
  const scopes = scope
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const targets = inner
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return scopes.flatMap((s) => targets.map((t) => `${s} ${t}`)).join(',\n');
}

/** Gradient and optional glow on painted code and diff tokens (the `code-gradient` effect). */
export function buildCodeCss(settings: DshCoreView): string {
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
      rule(scoped(LIGHT_BODY, tokens), buildLightGlowDeclarations(intensity))
    );
  }
  return parts.join('\n\n');
}
