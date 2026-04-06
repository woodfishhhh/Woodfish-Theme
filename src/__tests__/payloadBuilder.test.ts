import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_RUNTIME_SETTINGS,
  buildRuntimeCss,
  normalizeRuntimeSettings,
} from '../services/runtime/payloadBuilder';

describe('runtime payload builder', () => {
  const assets = {
    activityBar: '.activity { color: red; }',
    tabBar: '.tab { color: blue; }',
    syntaxGradient: '.mtk1 { color: pink !important; }',
    glow: 'span.mtk1 { text-shadow: 0 0 30px currentColor !important; }',
    cursorCore:
      'div.cursor { animation: 30s linear infinite alternate bp-animation !important; border-radius: 2px !important; }',
    cursorTrail: 'div.cursor::after { box-shadow: 0 0 15px rgba(255, 255, 255, 0.7) !important; }',
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
    activityBar: '.activity { color: red; }',
    tabBar: '.tab { color: blue; }',
    syntaxGradient: '.mtk1 { color: pink !important; }',
    glow: 'span.mtk1 { text-shadow: 0 0 30px currentColor !important; }',
    cursorCore: fs.readFileSync(
      path.resolve(__dirname, '../../themes/Bearded Theme/cursor-animation.css'),
      'utf-8'
    ),
    cursorTrail: fs.readFileSync(
      path.resolve(__dirname, '../../themes/Bearded Theme/cursor-loader.css'),
      'utf-8'
    ),
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

    expect(css).toContain('.activity { color: red; }');
    expect(css).toContain('.tab { color: blue; }');
    expect(css).not.toContain('.mtk1 { color: pink !important; }');
    expect(css).not.toContain('text-shadow');
    expect(css).not.toContain('div.cursor');
  });

  it('exposes the expected defaults for an enabled integrated theme', () => {
    expect(DEFAULT_RUNTIME_SETTINGS.runtime.enabled).toBe(true);
    expect(DEFAULT_RUNTIME_SETTINGS.runtime.autoSwitchTheme).toBe(true);
    expect(DEFAULT_RUNTIME_SETTINGS.syntaxGradient.enabled).toBe(true);
    expect(DEFAULT_RUNTIME_SETTINGS.glow.enabled).toBe(true);
    expect(DEFAULT_RUNTIME_SETTINGS.cursor.enabled).toBe(true);
    expect(
      packageJson.contributes.configuration.properties['woodfishTheme.runtime.enabled'].default
    ).toBe(true);
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
    expect(css.match(/div\.cursor::after\s*\{/g)).toHaveLength(1);
  });
});
