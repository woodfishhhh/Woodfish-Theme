import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { buildUniversalOverlayCss } from '../services/runtime/overlay';
import { DEFAULT_RUNTIME_SETTINGS, normalizeRuntimeSettings } from '../types/features';

class FakeStyle {
  private readonly values = new Map<string, string>();

  public setProperty(name: string, value: string): void {
    this.values.set(name, value);
  }

  public getPropertyValue(name: string): string {
    return this.values.get(name) ?? '';
  }
}

class FakeElement {
  public readonly dataset: Record<string, string> = {};
  public readonly style = new FakeStyle();
  public className = '';
  public isConnected = true;
  public textContent = '';

  public matches(_selector: string): boolean {
    return false;
  }

  public querySelectorAll(_selector: string): FakeElement[] {
    return [];
  }
}

class FakeToken extends FakeElement {
  public constructor(
    public readonly cssColor: string,
    text: string
  ) {
    super();
    this.textContent = text;
  }

  public override matches(selector: string): boolean {
    return selector.includes('[class*="mtk"]');
  }
}

class FakeViewLines extends FakeElement {
  public constructor(private readonly tokens: FakeToken[]) {
    super();
  }

  public override matches(selector: string): boolean {
    return selector.includes('.view-lines') && !selector.includes('[class*="mtk"]');
  }

  public override querySelectorAll(selector: string): FakeElement[] {
    return selector.includes('[class*="mtk"]') ? this.tokens : [];
  }
}

class FakeMutationObserver {
  public constructor(private readonly callback: () => void) {}

  public observe(): void {
    void this.callback;
  }

  public disconnect(): void {}
}

describe('universal token overlay', () => {
  const bootstrap = fs.readFileSync(
    path.resolve(__dirname, '../../themes/shared/overlay-bootstrap.js'),
    'utf-8'
  );

  it('emits theme-agnostic gradient and glow CSS without fixed token ids or CSS OKLCH', () => {
    const css = buildUniversalOverlayCss(
      normalizeRuntimeSettings({
        overlay: {
          hueShift: 24,
          lightnessDelta: 0.06,
          neutralChroma: 0.06,
          angle: 90,
        },
      })
    );

    expect(css).toContain('[data-woodfish-overlay-token="true"]');
    expect(css).toContain('--woodfish-overlay-hue-shift: 24');
    expect(css).toContain('--woodfish-overlay-lightness-delta: 0.06');
    expect(css).toContain('--woodfish-overlay-neutral-chroma: 0.06');
    expect(css).toContain('--woodfish-overlay-angle: 90deg');
    expect(css).toContain('var(--woodfish-overlay-gradient-base) 50%');
    expect(css).toContain('var(--woodfish-overlay-glow-near)');
    expect(css).not.toMatch(/\.mtk\d+/);
    expect(css).not.toContain('oklch(');
  });

  it('turns the complete overlay CSS off through its persistent master setting', () => {
    const settings = normalizeRuntimeSettings({
      overlay: { enabled: false },
    });

    expect(buildUniversalOverlayCss(settings)).toBe('');
  });

  it('derives a visible gradient and glow variables for neutral white tokens', () => {
    const neutralToken = new FakeToken('rgb(255, 255, 255)', 'method');
    const punctuationToken = new FakeToken('rgb(255, 255, 255)', '{');
    const tokens = [neutralToken, punctuationToken];
    const viewLines = new FakeViewLines(tokens);
    const documentElement = new FakeElement();
    const body = new FakeElement();
    const animationFrames: Array<() => void> = [];
    const accentVariables: Record<string, string> = {
      '--vscode-activityBarBadge-background': '#ff79c6',
      '--vscode-editorCursor-foreground': '#f8f8f2',
      '--vscode-focusBorder': '#bd93f9',
      '--vscode-textLink-foreground': '#8be9fd',
    };

    const context = {
      Element: FakeElement,
      MutationObserver: FakeMutationObserver,
      Node: { TEXT_NODE: 3 },
      cancelAnimationFrame: jest.fn(),
      clearInterval: jest.fn(),
      clearTimeout: jest.fn(),
      document: {
        body,
        documentElement,
        querySelectorAll: (selector: string) =>
          selector.includes('[class*="mtk"]') ? tokens : [viewLines],
      },
      getComputedStyle: (element: FakeElement) => ({
        color: element instanceof FakeToken ? element.cssColor : 'rgb(248, 248, 242)',
        getPropertyValue: (name: string) =>
          element === documentElement
            ? documentElement.style.getPropertyValue(name) || accentVariables[name] || ''
            : '',
      }),
      requestAnimationFrame: (callback: () => void) => {
        animationFrames.push(callback);
        return animationFrames.length;
      },
      setInterval: jest.fn(() => 1),
      setTimeout: jest.fn(() => 1),
    };

    expect(() => vm.runInNewContext(bootstrap, context)).not.toThrow();
    while (animationFrames.length > 0) {
      animationFrames.shift()?.();
    }

    const originalWhite = 'rgba(255, 255, 255, 1)';
    expect(neutralToken.dataset.woodfishOverlayToken).toBe('true');
    expect(neutralToken.dataset.woodfishNeutral).toBe('true');
    expect(neutralToken.style.getPropertyValue('--woodfish-overlay-gradient-base')).toBe(
      originalWhite
    );
    expect(neutralToken.style.getPropertyValue('--woodfish-overlay-gradient-light')).not.toBe(
      originalWhite
    );
    expect(neutralToken.style.getPropertyValue('--woodfish-overlay-gradient-dark')).not.toBe(
      originalWhite
    );
    expect(neutralToken.style.getPropertyValue('--woodfish-overlay-glow-near')).toContain('0.58');
    expect(punctuationToken.dataset.woodfishPunctuation).toBe('true');
    expect(documentElement.dataset.woodfishOverlay).toBe('active');
  });

  it('ships a bounded, batched bootstrap compatible with the minimum VS Code engine', () => {
    expect(() => new vm.Script(bootstrap)).not.toThrow();
    expect(bootstrap).toContain('MAX_TOKENS_PER_FRAME = 600');
    expect(bootstrap).toContain('requestAnimationFrame(flushTokens)');
    expect(bootstrap).toContain('new MutationObserver');
    expect(bootstrap).toContain('const tokenState = new WeakMap()');
    expect(bootstrap).toContain('function pruneViewLines()');
    expect(bootstrap).not.toMatch(/mtk\d+/);
    expect(bootstrap).not.toContain('oklch(from');
  });

  it('keeps the approved overlay defaults stable', () => {
    expect(DEFAULT_RUNTIME_SETTINGS.overlay).toEqual({
      enabled: true,
      hueShift: 24,
      lightnessDelta: 0.06,
      neutralChroma: 0.06,
      angle: 90,
    });
  });
});
