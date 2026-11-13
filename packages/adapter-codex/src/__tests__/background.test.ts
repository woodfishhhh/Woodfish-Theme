import { EffectValues } from '@woodfish/theme-core';
import {
  CODEX_DEFAULT_BACKGROUND_ID,
  CODEX_GRADIENT_BACKGROUND_ID,
  DEFAULT_CODEX_SETTINGS,
  applyCodexSettingsPatch,
  buildBackgroundCss,
  composeCodexCoreView,
  isCodexBackgroundId,
  normalizeCodexSettings,
} from '../index';

/** The background effect at its defaults (its values come from effects/background). */
const ON = { enabled: true } as EffectValues;

function view(image = CODEX_DEFAULT_BACKGROUND_ID, values: EffectValues | null = ON) {
  return composeCodexCoreView(normalizeCodexSettings({ backgroundImage: image }), {
    background: values,
  });
}

describe('Codex background settings', () => {
  it("uses 《彩云》 and the owner's defaults when the effect is on", () => {
    expect(view().background).toMatchObject({
      enabled: true,
      image: CODEX_DEFAULT_BACKGROUND_ID,
      opacity: 0.15,
      blur: 10,
      mask: 0.35,
      saturate: 150,
    });
  });

  it('accepts only built-in ids and 12-hex saved ids', () => {
    expect(isCodexBackgroundId('caiyun')).toBe(true);
    expect(isCodexBackgroundId('gradient')).toBe(true);
    expect(isCodexBackgroundId('0123456789ab')).toBe(true);
    expect(isCodexBackgroundId('../../secret')).toBe(false);
    expect(isCodexBackgroundId('0123456789AB')).toBe(false);
    expect(normalizeCodexSettings({ backgroundImage: 'x.png' }).backgroundImage).toBe(
      CODEX_DEFAULT_BACKGROUND_ID
    );
  });

  it('lets the panel pick a picture, nothing else', () => {
    const next = applyCodexSettingsPatch(DEFAULT_CODEX_SETTINGS, {
      backgroundImage: 'abcdefabcdef',
    });
    expect(next.backgroundImage).toBe('abcdefabcdef');
    expect(applyCodexSettingsPatch(next, { backgroundImage: 'javascript:1' }).backgroundImage).toBe(
      'abcdefabcdef'
    );
  });
});

describe('buildBackgroundCss', () => {
  it('emits nothing when the effect is off', () => {
    expect(buildBackgroundCss(view(CODEX_DEFAULT_BACKGROUND_ID, null))).toBe('');
  });

  it('clears the thread and draws panels and bands as static copies of the layer', () => {
    const css = buildBackgroundCss(view());
    expect(css.startsWith('@media not (prefers-reduced-transparency: reduce) {')).toBe(true);
    expect(css).toContain('body::before {');
    expect(css).toContain('--woodfish-codex-surface: var(--color-surface);');
    expect(css).toContain(
      'main.bg-surface,\n[data-app-shell-main-surface],\n[data-codex-history-swipe-page] > .electron\\:bg-surface {\n  background-color: transparent !important;'
    );
    // Frosted panels: the pre-blurred copy under the luminosity layer and a 35 % tint.
    const sidebar = css.slice(css.indexOf('[data-sidebar-navigation-root] {'));
    expect(sidebar.slice(0, sidebar.indexOf('}'))).toContain(
      'var(--woodfish-codex-surface) 35%, transparent)'
    );
    expect(sidebar.slice(0, sidebar.indexOf('}'))).toContain(
      'var(--woodfish-background-image-soft'
    );
    expect(css).toContain('--composer-layout-surface-backdrop-filter: none !important;');
    const footer = css.slice(css.indexOf('[data-thread-scroll-footer]'));
    expect(footer.slice(0, footer.indexOf('}'))).toContain(
      'background-attachment: fixed !important;'
    );
    expect(css).toContain('mask-image: linear-gradient(to bottom, #000, transparent);');
    // No live backdrop filter anywhere: it is recomputed every frame while a reply streams.
    expect(css).not.toContain('backdrop-filter: blur');
    expect(css).toContain('var(--woodfish-background-image, none)');
  });

  it('paints the fill gradient instead of a picture', () => {
    const css = buildBackgroundCss(view(CODEX_GRADIENT_BACKGROUND_ID));
    expect(css).toContain('linear-gradient(180deg, #2990bd, #e2ab5b, #e384be)');
    expect(css).not.toContain('--woodfish-background-image');
  });
});
