import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_BEARDED_THEME_VARIABLES,
  DEFAULT_RUNTIME_SETTINGS,
  buildRuntimeCss,
  normalizeRuntimeSettings,
} from '../services/runtime/payloadBuilder';

describe('runtime payload builder', () => {
  const assets = {
    themeVariables: DEFAULT_BEARDED_THEME_VARIABLES,
    activityBar: '.activity { color: red; }',
    tabBar: '.tab { color: blue; }',
    syntaxGradient: '.mtk1 { color: pink !important; }',
    glow: 'span.mtk1 { text-shadow: 0 0 30px currentColor !important; }',
    cursorCore:
      'div.cursor { animation: 30s linear infinite alternate bp-animation !important; border-radius: 2px !important; }',
    cursorGlow: 'div.cursor::after { box-shadow: 0 0 15px rgba(255, 255, 255, 0.7) !important; }',
  };
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
  ) as {
    contributes: {
      configuration: {
        properties: Record<string, { default: unknown }>;
      };
    };
  };
  const realCursorAssets = {
    themeVariables: DEFAULT_BEARDED_THEME_VARIABLES,
    activityBar: '.activity { color: red; }',
    tabBar: '.tab { color: blue; }',
    syntaxGradient: '.mtk1 { color: pink !important; }',
    glow: 'span.mtk1 { text-shadow: 0 0 30px currentColor !important; }',
    cursorCore: fs.readFileSync(
      path.resolve(__dirname, '../../themes/shared/cursor-core.css'),
      'utf-8'
    ),
    cursorGlow: fs.readFileSync(
      path.resolve(__dirname, '../../themes/shared/cursor-glow.css'),
      'utf-8'
    ),
  };
  const draculaCursorDefaults = {
    animationDuration: 12,
    gradientStops: ['#ff79c6', '#bd93f9', '#8be9fd', '#50fa7b', '#8be9fd', '#bd93f9', '#ff79c6'],
    borderRadius: 1,
    glowBlur: 0,
    glowOpacity: 0.45,
  };

  it('builds combined css and applies runtime overrides', () => {
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        syntaxGradient: {
          enabled: true,
          customRules: ['.mtk7 { letter-spacing: 0.02em; }'],
        },
        glow: {
          enabled: true,
          intensity: 0.5,
        },
        cursor: {
          enabled: true,
          animationDuration: 12,
          borderRadius: 6,
          glow: false,
          gradientStops: ['#111111', '#222222', '#333333'],
          customRules: ['div.cursor { width: 3px !important; }'],
        },
      }),
      assets
    );

    expect(css).toContain('--woodfish-activity-badge-gradient');
    expect(css).toContain('--woodfish-tab-border-gradient');
    expect(css).toContain('.activity { color: red; }');
    expect(css).toContain('.mtk1 { color: pink !important; }');
    expect(css).toContain('text-shadow: 0 0 15px currentColor !important;');
    expect(css).toContain('animation: 12s linear infinite alternate bp-animation !important;');
    expect(css).toContain('border-radius: 6px !important;');
    expect(css).toContain('linear-gradient(180deg, #111111, #222222, #333333)');
    expect(css).not.toContain('box-shadow: 0 0 15px rgba(255, 255, 255, 0.7) !important;');
    expect(css).toContain('.mtk7 { letter-spacing: 0.02em; }');
    expect(css).toContain('div.cursor { width: 3px !important; }');
  });

  it('omits disabled feature layers', () => {
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        syntaxGradient: { enabled: false },
        glow: { enabled: false },
        cursor: { enabled: false },
      }),
      assets
    );

    expect(css).toContain('--woodfish-activity-badge-gradient');
    expect(css).toContain('.activity { color: red; }');
    expect(css).toContain('.tab { color: blue; }');
    expect(css).not.toContain('.mtk1 { color: pink !important; }');
    expect(css).not.toContain('text-shadow');
    expect(css).not.toContain('div.cursor');
  });

  it('exposes the expected defaults for an enabled integrated theme', () => {
    expect((DEFAULT_RUNTIME_SETTINGS as Record<string, unknown>).runtime).toBeUndefined();
    expect(DEFAULT_RUNTIME_SETTINGS.syntaxGradient.enabled).toBe(true);
    expect(
      (DEFAULT_RUNTIME_SETTINGS.syntaxGradient as Record<string, unknown>).preset
    ).toBeUndefined();
    expect(DEFAULT_RUNTIME_SETTINGS.glow.enabled).toBe(true);
    expect(DEFAULT_RUNTIME_SETTINGS.cursor.enabled).toBe(true);
    expect(
      packageJson.contributes.configuration.properties['woodfishTheme.runtime.enabled']
    ).toBeUndefined();
    expect(
      packageJson.contributes.configuration.properties['woodfishTheme.runtime.autoSwitchTheme']
    ).toBeUndefined();
    expect(
      packageJson.contributes.configuration.properties['woodfishTheme.runtime.reapplyOnStartup']
    ).toBeUndefined();
    expect(
      packageJson.contributes.configuration.properties['woodfishTheme.syntaxGradient.preset']
    ).toBeUndefined();
    expect(
      packageJson.contributes.configuration.properties['woodfishTheme.cursor.enabled'].default
    ).toBe(true);
  });

  it('deduplicates cursor selectors and shared keyframes in the runtime payload', () => {
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        cursor: { enabled: true },
      }),
      realCursorAssets
    );

    expect(css.match(/@keyframes bp-animation\b/g)).toHaveLength(1);
    expect(css.match(/div\.cursor\s*\{/g)).toHaveLength(1);
    expect(css.match(/div\.cursor::before\s*\{/g)).toHaveLength(1);
    expect(css.match(/div\.cursor::after\s*\{/g)).toHaveLength(1);
  });

  it('keeps cursor glow filter-free by default and applies configured opacity', () => {
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        cursor: {
          enabled: true,
          glow: true,
          glowOpacity: 0.45,
        },
      }),
      realCursorAssets
    );
    const glowLayer = css.match(/div\.cursor::after\s*\{[\s\S]*?\}/)?.[0];

    expect(glowLayer).toContain('filter: none !important;');
    expect(glowLayer).toContain('opacity: 0.45 !important;');
    expect(glowLayer).toContain(
      'linear-gradient(180deg, #ff2d95, #ff4500, #ffd700, #7cfc00, #00ffff, #1e90ff, #9370db, #ff00ff, #ff1493)'
    );
    expect(glowLayer).not.toContain('brightness(');
  });

  it('allows cursor blur as an explicit opt-in', () => {
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        cursor: {
          enabled: true,
          glow: true,
          glowBlur: 6,
        },
      }),
      realCursorAssets
    );
    const glowLayer = css.match(/div\.cursor::after\s*\{[\s\S]*?\}/)?.[0];

    expect(glowLayer).toContain('filter: blur(6px) !important;');
  });

  it('uses theme cursor defaults while global cursor settings are untouched', () => {
    const css = buildRuntimeCss(DEFAULT_RUNTIME_SETTINGS, {
      ...realCursorAssets,
      cursorDefaults: draculaCursorDefaults,
    });
    const cursorCore = css.match(/div\.cursor\s*\{[\s\S]*?\}/)?.[0];
    const glowLayer = css.match(/div\.cursor::after\s*\{[\s\S]*?\}/)?.[0];

    expect(cursorCore).toContain('border-radius: 1px !important;');
    expect(css).toContain('animation: 12s linear infinite bp-animation !important;');
    expect(css).toContain(
      'linear-gradient(180deg, #ff79c6, #bd93f9, #8be9fd, #50fa7b, #8be9fd, #bd93f9, #ff79c6)'
    );
    expect(glowLayer).toContain('filter: none !important;');
    expect(glowLayer).toContain('opacity: 0.45 !important;');
  });

  it('preserves explicit cursor settings over theme defaults', () => {
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        cursor: {
          animationDuration: 5,
          gradientStops: ['#111111', '#222222'],
          borderRadius: 4,
          glowBlur: 3,
          glowOpacity: 0.8,
        },
      }),
      {
        ...realCursorAssets,
        cursorDefaults: draculaCursorDefaults,
      }
    );

    expect(css).toContain('animation: 5s linear infinite bp-animation !important;');
    expect(css).toContain('linear-gradient(180deg, #111111, #222222)');
    expect(css).toContain('border-radius: 4px !important;');
    expect(css).toContain('filter: blur(3px) !important;');
    expect(css).toContain('opacity: 0.8 !important;');
  });

  it('preserves explicit cursor settings that equal extension defaults', () => {
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        cursor: {
          animationDuration: DEFAULT_RUNTIME_SETTINGS.cursor.animationDuration,
          gradientStops: DEFAULT_RUNTIME_SETTINGS.cursor.gradientStops,
          borderRadius: DEFAULT_RUNTIME_SETTINGS.cursor.borderRadius,
          glowBlur: DEFAULT_RUNTIME_SETTINGS.cursor.glowBlur,
          glowOpacity: DEFAULT_RUNTIME_SETTINGS.cursor.glowOpacity,
        },
        explicitSettings: {
          cursor: {
            animationDuration: true,
            gradientStops: true,
            borderRadius: true,
            glowBlur: true,
            glowOpacity: true,
          },
        },
      }),
      {
        ...realCursorAssets,
        cursorDefaults: draculaCursorDefaults,
      }
    );

    expect(css).toContain('animation: 8s linear infinite bp-animation !important;');
    expect(css).toContain(
      'linear-gradient(180deg, #ff2d95, #ff4500, #ffd700, #7cfc00, #00ffff, #1e90ff, #9370db, #ff00ff, #ff1493)'
    );
    expect(css).toContain('border-radius: 2px !important;');
    expect(css).toContain('filter: none !important;');
    expect(css).toContain('opacity: 0.7 !important;');
  });

  it('uses transform-driven cursor flow in the runtime payload', () => {
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        cursor: { enabled: true },
      }),
      realCursorAssets
    );

    expect(css).toMatch(
      /@keyframes bp-animation\s*\{[\s\S]*?from\s*\{\s*transform: translateY\(0\);\s*\}[\s\S]*?to\s*\{\s*transform: translateY\(-88\.8889%\);\s*\}/
    );
    expect(css).not.toMatch(/@keyframes bp-animation[\s\S]*background-position/);
    expect(css).toContain('will-change: transform !important;');
    expect(css).not.toContain('cursor-hue');
  });

  it('supports shared selectors with theme variable fallbacks', () => {
    const sharedAssets = {
      ...assets,
      activityBar:
        '.activitybar .badge .badge-content { background-image: var(--woodfish-activity-badge-gradient, linear-gradient(45deg, #eacd61, #ea618e)) !important; }',
      tabBar:
        '.tab.tab-actions-right.sizing-fit.has-icon.tab-border-bottom.tab-border-top.active:after { background-image: var(--woodfish-tab-border-gradient, linear-gradient(to right, #eacd61, #ea618e, #3cec85, #61afea)) !important; }',
    };
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        syntaxGradient: { enabled: false },
        glow: { enabled: false },
        cursor: { enabled: false },
      }),
      sharedAssets
    );

    expect(css).toContain('--woodfish-activity-badge-gradient');
    expect(css).toContain('--woodfish-tab-border-gradient');
    expect(css).toContain('.activitybar .badge .badge-content');
    expect(css).toContain(
      '.tab.tab-actions-right.sizing-fit.has-icon.tab-border-bottom.tab-border-top.active:after'
    );
    expect(css).toContain('var(--woodfish-activity-badge-gradient');
    expect(css).toContain('var(--woodfish-tab-border-gradient');
  });

  it('omits theme variable block when assets do not provide it', () => {
    const css = buildRuntimeCss(
      normalizeRuntimeSettings({
        syntaxGradient: { enabled: false },
        glow: { enabled: false },
        cursor: { enabled: false },
      }),
      {
        activityBar: '.activitybar .badge .badge-content { color: red; }',
        tabBar: '.tab { color: blue; }',
        syntaxGradient: '.mtk1 { color: pink !important; }',
        glow: 'span.mtk1 { text-shadow: 0 0 30px currentColor !important; }',
        cursorCore: 'div.cursor { border-radius: 2px !important; }',
        cursorGlow: 'div.cursor::after { opacity: 0.7 !important; }',
      }
    );

    expect(css).toContain('.activitybar .badge .badge-content');
    expect(css).not.toContain('--woodfish-activity-badge-gradient');
    expect(css).not.toContain('--woodfish-tab-border-gradient');
  });
});
