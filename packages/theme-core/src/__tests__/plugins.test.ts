import {
  EffectManifestError,
  defaultEffectValues,
  effectCssVariable,
  effectCssVariables,
  effectValuesFromCss,
  isEffectId,
  normalizeEffectManifest,
  normalizeEffectValues,
  patchEffectValues,
} from '../effects/plugins';

const RAW = {
  name: '光标拖尾',
  description: '光标后面拖一条带子',
  version: 2,
  hosts: ['codex', 'vscode', 'browser'],
  params: {
    length: { type: 'number', default: 12, min: 1, max: 50, step: 1, label: '长度' },
    width: { type: 'number', default: 7, min: 1, max: 30, unit: 'px' },
    color: { type: 'color', default: '#ffffff' },
    followTheme: { type: 'boolean', default: false },
    style: {
      type: 'select',
      default: 'block',
      options: ['block', { value: 'line', label: '细线' }],
    },
  },
};

describe('effect manifests', () => {
  const manifest = normalizeEffectManifest(RAW);

  it('keeps known hosts and fills defaults', () => {
    expect(manifest.hosts).toEqual(['codex', 'vscode']);
    expect(manifest.enabled).toBe(true);
    expect(manifest.version).toBe(2);
    expect(manifest.params.style.options).toEqual([
      { value: 'block', label: 'block' },
      { value: 'line', label: '细线' },
    ]);
    expect(manifest.params.length.label).toBe('长度');
    expect(manifest.params.width.label).toBe('width');
  });

  it('rejects unusable manifests with a message', () => {
    expect(() => normalizeEffectManifest([])).toThrow(EffectManifestError);
    expect(() =>
      normalizeEffectManifest({ params: { size: { type: 'number', default: 1 } } })
    ).toThrow(/min、max/);
    expect(() =>
      normalizeEffectManifest({ params: { enabled: { type: 'boolean', default: true } } })
    ).toThrow(/enabled/);
    expect(() =>
      normalizeEffectManifest({ params: { tint: { type: 'color', default: 'var(--x)' } } })
    ).toThrow(/color/);
    expect(() =>
      normalizeEffectManifest({ params: { x: { type: 'string', default: '' } } })
    ).toThrow(/type/);
  });

  it('normalizes values: clamps, validates colors and options, drops unknown keys', () => {
    const values = normalizeEffectValues(manifest, {
      enabled: false,
      length: 500,
      width: 'wide',
      color: 'red; } body { display: none',
      style: 'line',
      extra: 'ignored',
    });
    expect(values).toEqual({
      enabled: false,
      length: 50,
      width: 7,
      color: '#ffffff',
      followTheme: false,
      style: 'line',
    });
    expect(defaultEffectValues(manifest)).toEqual({
      enabled: true,
      length: 12,
      width: 7,
      color: '#ffffff',
      followTheme: false,
      style: 'block',
    });
  });

  it('applies untrusted patches on top of current values', () => {
    const current = defaultEffectValues(manifest);
    expect(patchEffectValues(manifest, current, { length: 3, unknown: 1 })).toEqual({
      ...current,
      length: 3,
    });
    expect(patchEffectValues(manifest, current, 'nonsense')).toEqual(current);
  });

  it('exposes values as CSS variables with units', () => {
    const variables = effectCssVariables('demo-trail', manifest, defaultEffectValues(manifest));
    expect(variables).toContain('--woodfish-demo-trail-width: 7px;');
    expect(variables).toContain('--woodfish-demo-trail-follow-theme: 0;');
    expect(variables).toContain('--woodfish-demo-trail-color: #ffffff;');
  });

  it('reads parameters back from CSS, keeping only values that fit', () => {
    const css: Record<string, string> = {
      '--woodfish-demo-trail-width': ' 9px',
      '--woodfish-demo-trail-length': '500',
      '--woodfish-demo-trail-color': 'banana',
      '--woodfish-demo-trail-follow-theme': '1',
      '--woodfish-demo-trail-style': 'line',
    };
    expect(effectValuesFromCss('demo-trail', manifest, (name) => css[name] ?? '')).toEqual({
      width: 9,
      length: 50,
      followTheme: true,
      style: 'line',
    });
    expect(
      effectValuesFromCss('demo-trail', manifest, (name) =>
        name.endsWith('-width') ? '2em' : name.endsWith('-color') ? 'rgb(255 0 0)' : ''
      )
    ).toEqual({ color: 'rgb(255 0 0)' });
    const timed = normalizeEffectManifest({
      params: { turn: { type: 'number', default: 3, min: 0.5, max: 10, unit: 's' } },
    });
    expect(effectValuesFromCss('ring', timed, () => '1500ms')).toEqual({ turn: 1.5 });
    expect(effectCssVariable('caret-trail', 'followTheme')).toBe(
      '--woodfish-caret-trail-follow-theme'
    );
  });

  it('accepts folder-style ids only', () => {
    expect(isEffectId('typing-particles')).toBe(true);
    expect(isEffectId('Typing')).toBe(false);
    expect(isEffectId('../x')).toBe(false);
  });
});
