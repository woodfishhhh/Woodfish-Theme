import { DEFAULT_BACKGROUND, normalizeBackground } from '@woodfish/theme-core';
import {
  base64ToBlob,
  buildBackgroundCopyDeclarations,
  buildBackgroundFillImage,
  buildBackgroundLayerCss,
  buildFrostedPanelDeclarations,
} from '../index';

const params = normalizeBackground();

describe('background CSS', () => {
  it('draws the layer as the theme color with the picture at `opacity`', () => {
    const css = buildBackgroundLayerCss(params, {
      layerSelector: 'body::before',
      base: 'var(--base)',
      lightScope: '.light',
    });
    expect(css).toContain('body::before {');
    expect(css).toContain('position: fixed;');
    expect(css).toContain('z-index: -1;');
    expect(css).toContain('pointer-events: none;');
    expect(css).toContain('background-color: var(--base);');
    // A veil of the theme color at 1 - 0.15 over the picture.
    expect(css).toContain('color-mix(in oklab, var(--base) 85%, transparent)');
    expect(css).toContain('var(--woodfish-background-image, none)');
    expect(css).toContain('background-size: auto, cover;');
    expect(css).toContain('background-position: center, center;');
    expect(css).toContain('.light {\n  --woodfish-background-luminosity: rgb(204 204 204 / 10%);');
  });

  it('uses a given image and the fill gradient', () => {
    const fill = buildBackgroundFillImage(DEFAULT_BACKGROUND.fill);
    expect(fill).toBe('linear-gradient(180deg, #2990bd, #e2ab5b, #e384be)');
    const css = buildBackgroundLayerCss(normalizeBackground({ opacity: 1 }), {
      layerSelector: 'x',
      base: 'red',
      lightScope: '.l',
      image: fill,
    });
    expect(css).toContain(`0%, transparent)), ${fill};`);
  });

  it('frosts panels with the mask tint, luminosity and an optional backdrop blur', () => {
    const frosted = buildFrostedPanelDeclarations('var(--panel)', params, 10).join('\n');
    expect(frosted).toContain(
      'background-color: var(--woodfish-background-luminosity) !important;'
    );
    expect(frosted).toContain('color-mix(in oklab, var(--panel) 35%, transparent)');
    expect(frosted).toContain('backdrop-filter: blur(10px) saturate(150%) !important;');
    expect(frosted).toContain('transition: background-color 30ms ease');
    const flat = buildFrostedPanelDeclarations('red', normalizeBackground({ transition: 0 }), null);
    expect(flat.join('\n')).not.toContain('backdrop-filter');
    expect(flat.join('\n')).not.toContain('transition');
  });

  it('draws static copies pinned to the window for bands and frosted panels', () => {
    const band = buildBackgroundCopyDeclarations(params, { base: 'var(--base)' }).join('\n');
    expect(band).toContain('background-attachment: fixed !important;');
    expect(band).toContain('var(--woodfish-background-image, none) !important;');
    expect(band).toContain('background-size: auto, cover !important;');
    expect(band).not.toContain('backdrop-filter');
    const panel = buildBackgroundCopyDeclarations(params, {
      base: 'var(--base)',
      soft: true,
      tint: 'var(--panel)',
    }).join('\n');
    expect(panel).toContain('color-mix(in oklab, var(--panel) 35%, transparent)');
    expect(panel).toContain('linear-gradient(var(--woodfish-background-luminosity)');
    expect(panel).toContain(
      'var(--woodfish-background-image-soft, var(--woodfish-background-image, none))'
    );
    expect(panel).toContain('background-size: auto, auto, auto, cover !important;');
  });

  it('decodes base64 into a typed blob without fetch', () => {
    const blob = base64ToBlob(btoa('RIFF'), 'image/webp');
    expect(blob.type).toBe('image/webp');
    expect(blob.size).toBe(4);
  });
});
