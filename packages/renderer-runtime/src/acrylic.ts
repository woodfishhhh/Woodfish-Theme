import { Disposer } from './disposers';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export const ACRYLIC_FILTER_ID = 'woodfish-acrylic';

export interface AcrylicFilterOptions {
  /** Gaussian blur radius, px. */
  blur: number;
  nodeAttributes?: Readonly<Record<string, string>>;
}

function svgElement(name: string, attributes: Record<string, string | number>): Element {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

/**
 * Mounts the acrylic SVG filter (Fluent recipe): backdrop blur, a luminosity-preserving
 * tint applied by CSS, and a faint monochrome grain so large surfaces do not look flat.
 * CSS references it as `url(#woodfish-acrylic)`.
 */
export function mountAcrylicFilter(options: AcrylicFilterOptions): Disposer {
  const blur = Math.max(0, options.blur);
  const host = svgElement('svg', {
    width: 0,
    height: 0,
    'aria-hidden': 'true',
    'data-woodfish-theme': 'acrylic',
    style: 'position:absolute;width:0;height:0;pointer-events:none',
    ...(options.nodeAttributes ?? {}),
  });
  const filter = svgElement('filter', {
    id: ACRYLIC_FILTER_ID,
    x: 0,
    y: 0,
    width: '100%',
    height: '100%',
    'color-interpolation-filters': 'sRGB',
  });
  filter.append(
    svgElement('feGaussianBlur', {
      in: 'SourceGraphic',
      stdDeviation: blur,
      edgeMode: 'duplicate',
      result: 'blur',
    }),
    svgElement('feTurbulence', {
      type: 'fractalNoise',
      baseFrequency: 0.8,
      numOctaves: 3,
      stitchTiles: 'stitch',
      result: 'noise',
    }),
    svgElement('feColorMatrix', {
      in: 'noise',
      type: 'matrix',
      values: '0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.03 0',
      result: 'grain',
    }),
    svgElement('feBlend', { in: 'grain', in2: 'blur', mode: 'overlay' })
  );
  const definitions = svgElement('defs', {});
  host.append(definitions);
  definitions.append(filter);
  document.body.append(host);
  return () => host.remove();
}
