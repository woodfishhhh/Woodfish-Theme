import { GradientPreset } from '@woodfish/theme-core';
import {
  GradientContext,
  RUN_VARIABLES,
  TOKEN_MARKER_ATTRIBUTE,
  TOKEN_VARIABLES,
  clearTextGradientMarks,
  formatGradientStops,
  startTextGradientEngine,
} from '../index';

function mountCode(colors: string[]): HTMLElement {
  const root = document.createElement('div');
  root.className = 'code-root';
  for (const [index, color] of colors.entries()) {
    const span = document.createElement('span');
    span.className = `tok tok-${index}`;
    span.style.color = color;
    span.textContent = index % 3 === 2 ? '{' : `word${index}`;
    root.append(span);
  }
  document.body.append(root);
  return root;
}

function startEngine(
  options: {
    acceptToken?: (token: HTMLElement) => boolean;
    mapColor?: (cssColor: string, token: HTMLElement) => string;
    gradientContext?: () => GradientContext;
    continuousRuns?: boolean;
  } = {}
) {
  return startTextGradientEngine({
    tokenSelector: '.code-root span.tok',
    rootSelector: '.code-root',
    params: { hueShift: 24, lightnessDelta: 0.06, neutralChroma: 0.06 },
    accentVariables: ['--accent'],
    themeAttributes: ['data-theme'],
    themeSignature: ({ tokenPaletteSignature }) => tokenPaletteSignature(),
    ...options,
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback: FrameRequestCallback) =>
      Number(setTimeout(() => callback(0), 0))
    );
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.woodfishOverlayProfile;
});

describe('startTextGradientEngine', () => {
  it('marks tokens with gradient variables derived from their color', () => {
    const root = mountCode(['rgb(255, 121, 198)', 'rgb(139, 233, 253)', 'rgb(248, 248, 242)']);
    const engine = startEngine();
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();

    const [pink, cyan, punctuation] = [...root.querySelectorAll<HTMLElement>('span')];
    expect(pink.getAttribute(TOKEN_MARKER_ATTRIBUTE)).toBe('true');
    expect(pink.style.getPropertyValue(TOKEN_VARIABLES.gradientBase)).toBe(
      'rgba(255, 121, 198, 1)'
    );
    const stops = pink.style.getPropertyValue(TOKEN_VARIABLES.gradientStops);
    expect(stops.startsWith('rgba(255, 121, 198, 1) 0%, ')).toBe(true);
    expect(stops.endsWith(' 100%')).toBe(true);
    expect(pink.style.getPropertyValue(TOKEN_VARIABLES.gradientAngle)).toBe('initial');
    expect(pink.dataset.woodfishPreset).toBe('false');
    expect(cyan.dataset.woodfishNeutral).toBe('false');
    expect(punctuation.dataset.woodfishPunctuation).toBe('true');
    expect(document.documentElement.dataset.woodfishOverlayProfile).toMatch(/^h-?\d+\.\d$/);
    engine.dispose();
  });

  it('derives the gradient from mapColor when given', () => {
    const root = mountCode(['rgb(255, 121, 198)']);
    const engine = startEngine({ mapColor: () => 'rgb(80, 250, 123)' });
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    expect(root.querySelector('span')?.style.getPropertyValue(TOKEN_VARIABLES.gradientBase)).toBe(
      'rgba(80, 250, 123, 1)'
    );
    engine.dispose();
  });

  it('paints and watches shadow roots handed to observeRoot', async () => {
    const shadowHost = document.createElement('woodfish-viewer');
    document.body.append(shadowHost);
    const shadow = shadowHost.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<div class="code-root"><span class="tok" style="color: rgb(255, 121, 198)">a</span></div>';
    const engine = startEngine();
    engine.observeRoot(shadow);
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    expect(shadow.querySelector('span')?.getAttribute(TOKEN_MARKER_ATTRIBUTE)).toBe('true');

    const added = document.createElement('span');
    added.className = 'tok';
    added.style.color = 'rgb(139, 233, 253)';
    added.textContent = 'b';
    shadow.querySelector('.code-root')?.append(added);
    await Promise.resolve();
    jest.runOnlyPendingTimers();
    expect(added.getAttribute(TOKEN_MARKER_ATTRIBUTE)).toBe('true');

    clearTextGradientMarks(shadow);
    expect(shadow.querySelectorAll(`[${TOKEN_MARKER_ATTRIBUTE}]`)).toHaveLength(0);
    engine.dispose();
  });

  it('skips tokens rejected by acceptToken and clears earlier marks', () => {
    const root = mountCode(['rgb(255, 121, 198)', 'rgb(139, 233, 253)']);
    let accept = true;
    const engine = startEngine({ acceptToken: () => accept });
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    const first = root.querySelector<HTMLElement>('span');
    expect(first?.getAttribute(TOKEN_MARKER_ATTRIBUTE)).toBe('true');

    accept = false;
    engine.refresh();
    jest.runOnlyPendingTimers();
    expect(first?.hasAttribute(TOKEN_MARKER_ATTRIBUTE)).toBe(false);
    engine.dispose();
  });

  it('picks up tokens added after start', async () => {
    const root = mountCode(['rgb(255, 121, 198)']);
    const engine = startEngine();
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();

    const added = document.createElement('span');
    added.className = 'tok tok-new';
    added.style.color = 'rgb(80, 250, 123)';
    added.textContent = 'later';
    root.append(added);
    // MutationObserver callbacks are microtasks; the paint is queued on the next frame.
    await Promise.resolve();
    jest.runOnlyPendingTimers();
    expect(added.getAttribute(TOKEN_MARKER_ATTRIBUTE)).toBe('true');
    engine.dispose();
  });

  it('applies new parameters on update', () => {
    const root = mountCode(['rgb(255, 121, 198)']);
    const engine = startEngine();
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    const token = root.querySelector<HTMLElement>('span');
    const before = token?.style.getPropertyValue(TOKEN_VARIABLES.gradientStops);

    engine.update({ hueShift: 0, lightnessDelta: 0, neutralChroma: 0.06 });
    jest.runOnlyPendingTimers();
    const after = token?.style.getPropertyValue(TOKEN_VARIABLES.gradientStops);
    expect(after).not.toBe(before);
    expect(after?.startsWith('rgba(255, 121, 198, 1) 0%, ')).toBe(true);
    engine.dispose();
  });

  it('stops observing on dispose and clearTextGradientMarks removes every trace', () => {
    const root = mountCode(['rgb(255, 121, 198)', 'rgb(139, 233, 253)']);
    const engine = startEngine();
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    engine.dispose();
    engine.dispose();
    expect(document.documentElement.dataset.woodfishOverlayProfile).toBeUndefined();

    clearTextGradientMarks();
    for (const token of root.querySelectorAll<HTMLElement>('span')) {
      expect(token.hasAttribute(TOKEN_MARKER_ATTRIBUTE)).toBe(false);
      expect(token.dataset.woodfishNeutral).toBeUndefined();
      expect(token.style.getPropertyValue(TOKEN_VARIABLES.gradientBase)).toBe('');
      expect(token.style.getPropertyValue(TOKEN_VARIABLES.gradientStops)).toBe('');
      expect(token.dataset.woodfishPreset).toBeUndefined();
      expect(token.style.color).not.toBe('');
    }
  });

  it('paints hand-tuned gradients from the context and re-reads it on refresh', () => {
    const preset: GradientPreset = {
      slug: 'test',
      background: '#000000',
      foreground: '#ffffff',
      tokens: { '#FF79C6': { angle: 45, stops: ['#ff79c6', '#cc6dff'] } },
    };
    let context: GradientContext = { background: '#000000', foreground: null, preset };
    const root = mountCode(['rgb(255, 121, 198)', 'rgb(139, 233, 253)']);
    const engine = startEngine({ gradientContext: () => context });
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    const [pink, cyan] = [...root.querySelectorAll<HTMLElement>('span')];
    expect(pink.style.getPropertyValue(TOKEN_VARIABLES.gradientStops)).toBe(
      '#ff79c6 0%, #cc6dff 100%'
    );
    expect(pink.style.getPropertyValue(TOKEN_VARIABLES.gradientAngle)).toBe('45deg');
    expect(pink.dataset.woodfishPreset).toBe('true');
    expect(cyan.dataset.woodfishPreset).toBe('false');

    context = { background: '#000000', foreground: null, preset: null };
    engine.refresh();
    jest.runOnlyPendingTimers();
    expect(pink.dataset.woodfishPreset).toBe('false');
    expect(pink.style.getPropertyValue(TOKEN_VARIABLES.gradientAngle)).toBe('initial');
    engine.dispose();
  });
});

describe('continuous gradients across split tokens', () => {
  function placeSpans(root: HTMLElement, widths: number[]): void {
    let left = 10;
    [...root.querySelectorAll<HTMLElement>('span')].forEach((span, index) => {
      const start = left;
      const width = widths[index];
      span.getBoundingClientRect = () =>
        ({ left: start, right: start + width, top: 20, bottom: 40, width, height: 20 }) as DOMRect;
      left += width;
    });
  }

  it('shares one gradient across adjacent spans of the same color', () => {
    // Monaco splits a long token: three same-colored pieces, then a different token.
    const root = mountCode([
      'rgb(97, 175, 234)',
      'rgb(97, 175, 234)',
      'rgb(97, 175, 234)',
      'rgb(255, 121, 198)',
    ]);
    for (const span of root.querySelectorAll('span')) {
      span.textContent = 'x'.repeat(50);
    }
    placeSpans(root, [100, 100, 40, 30]);
    const engine = startEngine();
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    const spans = [...root.querySelectorAll<HTMLElement>('span')];
    expect(spans.map((span) => span.style.getPropertyValue(RUN_VARIABLES.size))).toEqual([
      '240px 100%',
      '240px 100%',
      '240px 100%',
      '',
    ]);
    expect(spans.map((span) => span.style.getPropertyValue(RUN_VARIABLES.position))).toEqual([
      '0px 0',
      '-100px 0',
      '-200px 0',
      '',
    ]);
    engine.dispose();
    clearTextGradientMarks();
    expect(spans[1].style.getPropertyValue(RUN_VARIABLES.size)).toBe('');
  });

  it('does not join spans split by text, wrapped onto another row, or when disabled', () => {
    const root = mountCode(['rgb(97, 175, 234)', 'rgb(97, 175, 234)', 'rgb(97, 175, 234)']);
    const [first, second, third] = [...root.querySelectorAll<HTMLElement>('span')];
    third.textContent = 'word';
    root.insertBefore(document.createTextNode(' '), second);
    placeSpans(root, [50, 50, 50]);
    third.getBoundingClientRect = () =>
      ({ left: 0, right: 50, top: 60, bottom: 80, width: 50, height: 20 }) as DOMRect;
    const engine = startEngine();
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    for (const span of [first, second, third]) {
      expect(span.style.getPropertyValue(RUN_VARIABLES.size)).toBe('');
    }
    engine.dispose();

    document.body.innerHTML = '';
    const plain = mountCode(['rgb(97, 175, 234)', 'rgb(97, 175, 234)']);
    placeSpans(plain, [50, 50]);
    const off = startEngine({ continuousRuns: false });
    jest.runOnlyPendingTimers();
    jest.runOnlyPendingTimers();
    for (const span of plain.querySelectorAll<HTMLElement>('span')) {
      expect(span.style.getPropertyValue(RUN_VARIABLES.size)).toBe('');
    }
    off.dispose();
  });

  it('formats evenly spread stops', () => {
    expect(formatGradientStops(['a', 'b'])).toBe('a 0%, b 100%');
    expect(formatGradientStops(['a', 'b', 'c'])).toBe('a 0%, b 50%, c 100%');
    expect(formatGradientStops(['a', 'b', 'c', 'd'])).toBe('a 0%, b 33.33%, c 66.67%, d 100%');
  });
});
