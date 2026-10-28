import {
  TOKEN_MARKER_ATTRIBUTE,
  TOKEN_VARIABLES,
  clearTextGradientMarks,
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
    expect(pink.style.getPropertyValue(TOKEN_VARIABLES.gradientLight)).not.toBe(
      pink.style.getPropertyValue(TOKEN_VARIABLES.gradientBase)
    );
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
    const before = token?.style.getPropertyValue(TOKEN_VARIABLES.gradientLight);

    engine.update({ hueShift: 0, lightnessDelta: 0, neutralChroma: 0.06 });
    jest.runOnlyPendingTimers();
    const after = token?.style.getPropertyValue(TOKEN_VARIABLES.gradientLight);
    expect(after).not.toBe(before);
    expect(after).toBe(token?.style.getPropertyValue(TOKEN_VARIABLES.gradientBase));
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
      expect(token.style.color).not.toBe('');
    }
  });
});
