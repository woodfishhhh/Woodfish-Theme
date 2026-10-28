import {
  createDisposerRegistry,
  createStyleManager,
  disposeController,
  installController,
  readController,
  readNumberVariable,
  readStringVariable,
  readThemeMode,
  runSteps,
  uninstallController,
  watchThemeMode,
} from '../index';

afterEach(() => {
  document.head.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
});

describe('createStyleManager', () => {
  it('upserts, replaces and removes prefixed style elements with extra attributes', () => {
    const styles = createStyleManager({
      idPrefix: 'woodfish-test-',
      nodeAttributes: { 'data-codex-plus-ext': 'woodfish' },
    });
    styles.upsert('base', ':root { --a: 1; }');
    styles.upsert('glass', '.x { color: red; }');
    const base = document.getElementById('woodfish-test-base');
    expect(base?.textContent).toBe(':root { --a: 1; }');
    expect(base?.getAttribute('data-codex-plus-ext')).toBe('woodfish');
    expect(styles.names()).toEqual(['base', 'glass']);

    styles.upsert('base', ':root { --a: 2; }');
    expect(document.querySelectorAll('#woodfish-test-base')).toHaveLength(1);
    expect(document.getElementById('woodfish-test-base')?.textContent).toBe(':root { --a: 2; }');

    styles.upsert('glass', '   ');
    expect(document.getElementById('woodfish-test-glass')).toBeNull();

    styles.removeAll();
    expect(document.head.querySelectorAll('style')).toHaveLength(0);
    expect(styles.names()).toEqual([]);
  });

  it('re-mounts a style the host removed from the DOM', () => {
    const styles = createStyleManager({ idPrefix: 'wf-' });
    styles.upsert('base', 'a{}');
    document.getElementById('wf-base')?.remove();
    styles.upsert('base', 'a{}');
    expect(document.getElementById('wf-base')).not.toBeNull();
  });
});

describe('controller helpers', () => {
  const key = '__woodfishTestController';

  it('installs, disposes the previous controller and uninstalls only its own', () => {
    const first = { version: '1', dispose: jest.fn() };
    installController(key, first);
    expect(readController(key)).toBe(first);

    disposeController(key);
    expect(first.dispose).toHaveBeenCalledTimes(1);

    const second = { version: '2', dispose: jest.fn() };
    installController(key, second);
    uninstallController(key, first);
    expect(readController(key)).toBe(second);
    uninstallController(key, second);
    expect(readController(key)).toBeUndefined();
  });

  it('ignores non-object globals', () => {
    (globalThis as unknown as Record<string, unknown>)[key] = 'not a controller';
    expect(readController(key)).toBeUndefined();
    expect(() => disposeController(key)).not.toThrow();
    delete (globalThis as unknown as Record<string, unknown>)[key];
  });
});

describe('lifecycle helpers', () => {
  it('runs every disposer once even when one throws', () => {
    const registry = createDisposerRegistry();
    const calls: string[] = [];
    registry.add(() => calls.push('a'));
    registry.add(() => {
      throw new Error('boom');
    });
    registry.add(() => calls.push('c'));
    expect(registry.size).toBe(3);
    registry.disposeAll();
    registry.disposeAll();
    expect(calls).toEqual(['a', 'c']);
    expect(registry.size).toBe(0);
  });

  it('keeps running steps after a failure and returns the last refresh', () => {
    const refresh = jest.fn();
    const onError = jest.fn();
    const result = runSteps(
      [
        () => undefined,
        () => {
          throw new Error('step failed');
        },
        () => refresh,
      ],
      onError
    );
    result.refresh();
    expect(refresh).toHaveBeenCalled();
    expect(result.failures.map((failure) => failure.index)).toEqual([1]);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('CSS variables and theme mode', () => {
  it('reads numeric and string custom properties with fallbacks', () => {
    document.documentElement.style.setProperty('--wf-number', ' 42.5 ');
    document.documentElement.style.setProperty('--wf-text', '  acrylic ');
    expect(readNumberVariable('--wf-number', 1)).toBe(42.5);
    expect(readNumberVariable('--wf-missing', 7)).toBe(7);
    expect(readStringVariable('--wf-text')).toBe('acrylic');
  });

  it('follows the data-theme attribute and reports changes', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(readThemeMode({ attribute: 'data-theme' })).toBe('dark');
    const modes: string[] = [];
    const stop = watchThemeMode({ attribute: 'data-theme' }, (mode) => modes.push(mode));
    document.documentElement.setAttribute('data-theme', 'light');
    await Promise.resolve();
    document.documentElement.setAttribute('data-theme', 'light');
    await Promise.resolve();
    stop();
    document.documentElement.setAttribute('data-theme', 'dark');
    await Promise.resolve();
    expect(modes).toEqual(['light']);
  });

  it('falls back to light when no attribute and no media support', () => {
    expect(readThemeMode({ attribute: 'data-theme' })).toBe('light');
  });
});
