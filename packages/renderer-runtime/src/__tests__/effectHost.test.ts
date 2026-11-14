import { EffectValues, normalizeEffectManifest } from '@woodfish/theme-core';
import { EffectContext, EffectFactory, EffectSource, startEffectHost } from '../index';

const THEME = {
  mode: 'dark' as const,
  stops: ['#ff0000', '#00ff00'],
  accent: '#ff0000',
  accent2: '#00ff00',
  background: '#000000',
  foreground: '#ffffff',
};

const MANIFEST = normalizeEffectManifest({
  name: '测试',
  hosts: ['codex'],
  params: { size: { type: 'number', default: 4, min: 1, max: 10, unit: 'px' } },
});

function source(
  id: string,
  factory: EffectFactory | undefined,
  values: Partial<EffectValues> = {},
  hash = 'h1'
): EffectSource {
  return {
    id,
    manifest: MANIFEST,
    values: { enabled: true, size: 4, ...values } as EffectValues,
    hash,
    factory,
  };
}

/** A factory that records what the effect saw. */
function recorder(
  log: string[],
  extra: (ctx: EffectContext) => void = () => undefined
): EffectFactory {
  return (module) => {
    module.exports = (ctx: EffectContext) => {
      log.push(`start ${ctx.id} ${String(ctx.params.size)}`);
      extra(ctx);
      return { dispose: () => log.push(`stop ${ctx.id}`) };
    };
  };
}

function host(extra: Partial<Parameters<typeof startEffectHost>[0]> = {}) {
  return startEffectHost({ host: 'codex', theme: () => THEME, idPrefix: 'wf-test-', ...extra });
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('effect host', () => {
  it('keeps running the other effects when one fails to start', () => {
    const log: string[] = [];
    const errors: string[] = [];
    const effects = host({ onError: (id, message) => errors.push(`${id}: ${message}`) });
    effects.apply([
      source('broken', (module) => {
        module.exports = () => {
          throw new Error('boom');
        };
      }),
      source('fine', recorder(log)),
      source('not-a-function', (module) => {
        module.exports = 42;
      }),
    ]);
    expect(log).toEqual(['start fine 4']);
    expect(errors).toEqual([
      'broken: 启动失败：boom',
      'not-a-function: 启动失败：effect.js 需要 module.exports = function (ctx) { … }',
    ]);
    expect(effects.status().map((status) => [status.id, status.state])).toEqual([
      ['broken', 'failed'],
      ['fine', 'running'],
      ['not-a-function', 'failed'],
    ]);
    effects.dispose();
  });

  it('restarts on new code, updates in place on new values, stops when disabled or removed', () => {
    const log: string[] = [];
    const updates: unknown[] = [];
    const effects = host();
    const withUpdate: EffectFactory = (module) => {
      module.exports = (ctx: EffectContext) => {
        log.push(`start ${ctx.id}`);
        return {
          update: (values: EffectValues) => updates.push(values.size),
          dispose: () => log.push('stop'),
        };
      };
    };
    effects.apply([source('a', withUpdate)]);
    effects.apply([source('a', withUpdate, { size: 7 })]);
    expect(updates).toEqual([7]);
    effects.apply([source('a', withUpdate, { size: 7 }, 'h2')]);
    expect(log).toEqual(['start a', 'stop', 'start a']);
    effects.apply([source('a', withUpdate, { size: 7, enabled: false }, 'h2')]);
    expect(log).toEqual(['start a', 'stop', 'start a', 'stop']);
    effects.apply([source('a', withUpdate, {}, 'h2')]);
    effects.apply([]);
    expect(log).toEqual(['start a', 'stop', 'start a', 'stop', 'start a', 'stop']);
    expect(effects.status()).toEqual([]);
    effects.dispose();
  });

  it('restarts effects without update() when values change and exposes params as variables', () => {
    const log: string[] = [];
    const effects = host();
    effects.apply([source('b', recorder(log))]);
    effects.apply([source('b', recorder(log), { size: 9 })]);
    expect(log).toEqual(['start b 4', 'stop b', 'start b 9']);
    expect(document.getElementById('wf-test-b-vars')?.textContent).toContain(
      '--woodfish-b-size: 9px;'
    );
    effects.dispose();
    expect(document.getElementById('wf-test-b-vars')).toBeNull();
  });

  it('stops an effect whose handlers keep throwing and removes its listeners', () => {
    const errors: string[] = [];
    const effects = host({ onError: (id, message) => errors.push(`${id}: ${message}`) });
    let clicks = 0;
    effects.apply([
      source(
        'noisy',
        recorder([], (ctx) => {
          ctx.onInsert(() => {
            throw new Error('bad insert');
          });
          ctx.on(document, 'click', () => {
            clicks += 1;
          });
        })
      ),
    ]);
    const insert = {
      x: 0,
      y: 0,
      height: 10,
      text: 'a',
      source: 'user' as const,
      rate: 1,
      rects: [],
      block: null,
      node: null,
      start: 0,
    };
    document.dispatchEvent(new Event('click'));
    effects.insert(insert);
    effects.insert(insert);
    expect(errors).toEqual([]);
    effects.insert(insert);
    expect(errors).toEqual(['noisy: 运行出错：bad insert']);
    document.dispatchEvent(new Event('click'));
    expect(clicks).toBe(1);
    // The same code stays off until the code changes or the user toggles it.
    effects.apply([source('noisy', recorder([]))]);
    expect(effects.status()[0].state).toBe('failed');
    effects.dispose();
  });

  it('hands core effects to the host and previews unsaved values', () => {
    const core: Array<[string, unknown]> = [];
    const effects = host({ core: (name, values) => core.push([name, values?.size ?? null]) });
    const manifest = normalizeEffectManifest({ ...MANIFEST, core: 'background' });
    effects.apply([{ ...source('background', undefined), manifest }]);
    expect(effects.preview('background', { size: 99, junk: 1 })).toEqual({
      enabled: true,
      size: 10,
    });
    effects.preview('background', { enabled: false });
    expect(core).toEqual([
      ['background', 4],
      ['background', 10],
      ['background', null],
    ]);
    expect(effects.status()[0].state).toBe('core');
    effects.dispose();
    expect(core[core.length - 1]).toEqual(['background', null]);
  });

  it('lets user.css override parameters, after every other stylesheet', () => {
    const updates: unknown[] = [];
    const core: unknown[] = [];
    const effects = host({ core: (_name, values) => core.push(values?.size ?? null) });
    const coreManifest = normalizeEffectManifest({ ...MANIFEST, core: 'background' });
    effects.apply([
      source('a', (module) => {
        module.exports = (ctx: EffectContext) => {
          updates.push(ctx.params.size);
          return { update: (values: EffectValues) => updates.push(values.size) };
        };
      }),
      { ...source('background', undefined), manifest: coreManifest },
    ]);
    effects.setUserCss(':root { --woodfish-a-size: 8px; --woodfish-background-size: 2px; }');
    const style = document.querySelector('[data-woodfish-user-css]');
    expect(style?.parentNode).toBe(document.body);
    expect(updates).toEqual([4, 8]);
    expect(core).toEqual([4, 2]);
    expect(effects.status().map((status) => status.overrides)).toEqual([['size'], ['size']]);
    // A value that does not fit leaves params.json in charge.
    effects.setUserCss(':root { --woodfish-a-size: huge; }');
    expect(updates).toEqual([4, 8, 4]);
    expect(core).toEqual([4, 2, 4]);
    expect(effects.status().map((status) => status.overrides)).toEqual([[], []]);
    effects.setUserCss('');
    expect(document.querySelector('[data-woodfish-user-css]')).toBeNull();
    effects.dispose();
  });

  it('ignores effects for other hosts and shows folders that could not load', () => {
    const effects = host();
    const vscodeOnly = normalizeEffectManifest({ name: 'x', hosts: ['vscode'] });
    effects.apply([
      { ...source('elsewhere', recorder([])), manifest: vscodeOnly },
      { ...source('syntax', undefined), error: 'effect.js 第 3 行语法错误' },
    ]);
    expect(effects.status().map((status) => [status.id, status.state, status.error])).toEqual([
      ['syntax', 'failed', 'effect.js 第 3 行语法错误'],
    ]);
    effects.dispose();
  });
});
