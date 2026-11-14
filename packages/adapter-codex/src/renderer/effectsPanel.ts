import { EffectStatus } from '@woodfish/renderer-runtime';
import { EffectParamSpec } from '@woodfish/theme-core';
import { Look, element, labelBlock } from './panelDom';

/*
 * The 「效果插件」 card of the Woodfish settings section. It is built from each effect's
 * `effect.json`: a switch per effect and, unfolded, one control per parameter (slider,
 * switch, segmented choice or color). An effect someone (or an AI) adds to the effects
 * folder shows up here with its controls, nothing in Woodfish needs to change.
 */

export interface EffectsPanelOptions {
  effects: () => EffectStatus[];
  /** Applies values to one effect right away and saves them. */
  change: (id: string, values: Record<string, unknown>) => void;
  /** Puts one effect (or all, with null) back to its defaults. */
  reset: (id: string | null) => void;
  /** Reloads every effect from disk; null when this page cannot (no watcher). */
  reload: (() => void) | null;
  /** Where the values are saved, shown in the card header. */
  location: string;
  /**
   * Opens `user.css` in the default editor / puts its template back (false when that did
   * not reach the watcher); null when this page cannot (a user script).
   */
  userCss: { open: () => boolean; reset: () => boolean } | null;
}

export interface EffectsCard {
  card: HTMLElement;
  sync: () => void;
  /** Shows a short message under the header (e.g. after a reload). */
  say: (text: string) => void;
}

const STATE_TEXT: Readonly<Record<EffectStatus['state'], string>> = {
  running: '',
  core: '',
  off: '',
  failed: '加载失败',
};
/** Selects with this many options or fewer are shown as segmented buttons. */
const SEGMENT_LIMIT = 4;

function format(spec: EffectParamSpec, value: unknown): string {
  if (typeof value !== 'number') {
    return String(value);
  }
  const step = spec.step ?? 1;
  const decimals = step >= 1 ? 0 : Math.min(3, String(step).split('.')[1]?.length ?? 2);
  return `${value.toFixed(decimals)}${spec.unit === 'deg' ? '°' : (spec.unit ?? '')}`;
}

function switchControl(label: string, attributes: Record<string, string>): HTMLButtonElement {
  return element(
    'button',
    'woodfish-settings-switch',
    { type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': label, ...attributes },
    [
      element('span', 'woodfish-settings-switch-track', { 'aria-hidden': 'true' }, [
        element('span', 'woodfish-settings-switch-thumb'),
      ]),
    ]
  );
}

function paramControl(id: string, key: string, spec: EffectParamSpec): HTMLElement {
  const data = { 'data-woodfish-effect-param': key, 'data-woodfish-effect-id': id };
  if (spec.type === 'boolean') {
    return switchControl(spec.label, data);
  }
  if (spec.type === 'number') {
    return element('div', 'woodfish-effect-slider', {}, [
      element('input', 'woodfish-background-range', {
        type: 'range',
        min: String(spec.min),
        max: String(spec.max),
        step: String(spec.step ?? 'any'),
        'aria-label': spec.label,
        ...data,
      }),
      element('span', 'woodfish-background-value', { 'data-woodfish-effect-output': key }),
    ]);
  }
  if (spec.type === 'color') {
    return element('div', 'woodfish-effect-color', {}, [
      element('input', '', { type: 'color', 'aria-label': spec.label, ...data }),
      element('span', 'woodfish-background-value', { 'data-woodfish-effect-output': key }),
    ]);
  }
  const options = spec.options ?? [];
  if (options.length <= SEGMENT_LIMIT) {
    return element(
      'div',
      'woodfish-effect-segments',
      { role: 'radiogroup', 'aria-label': spec.label, ...data },
      options.map((option) =>
        element(
          'button',
          'woodfish-effect-segment',
          { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-value': option.value },
          [option.label]
        )
      )
    );
  }
  const select = element('select', 'woodfish-effect-select', { 'aria-label': spec.label, ...data });
  for (const option of options) {
    select.append(element('option', '', { value: option.value }, [option.label]));
  }
  return select;
}

/** Effect ids and parameter names are validated (letters, digits, dashes), so they are safe
 * inside attribute selectors without escaping. */
/** A plain hex color for `<input type=color>` (it only takes #rrggbb). */
function toHex(value: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return value;
  }
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : '#ffffff';
}

export function buildEffectsCard(look: Look, options: EffectsPanelOptions): EffectsCard {
  const expanded = new Set<string>();
  const card = element(
    'div',
    `${look.card} woodfish-effects-card`,
    look.cardStyle ? { style: look.cardStyle } : {}
  );
  const status = element('div', 'woodfish-background-status', { role: 'status' });
  let signature = '';

  function effectGroup(effect: EffectStatus): HTMLElement {
    const { id, manifest } = effect;
    const description = element('div', look.description, {}, [manifest.description]);
    const error = element('div', 'woodfish-effect-error', { 'data-woodfish-effect-error': id });
    const left = element('div', look.rowLeft, {}, [
      element('div', look.labelWrap, {}, [
        element('div', look.label, {}, [
          manifest.name,
          element('span', 'woodfish-effect-id', {}, [` ${id}`]),
        ]),
        description,
        error,
      ]),
    ]);
    const params = Object.entries(manifest.params);
    const toggle = element(
      'button',
      'woodfish-effect-toggle',
      {
        type: 'button',
        'aria-expanded': 'false',
        'data-woodfish-effect-toggle': id,
        ...(params.length === 0 ? { hidden: '' } : {}),
      },
      ['参数']
    );
    const head = element('div', `${look.row} woodfish-effect-head`, {}, [
      left,
      element('div', `${look.rowRight} woodfish-effect-actions`, {}, [
        toggle,
        switchControl(manifest.name, { 'data-woodfish-effect-switch': id }),
      ]),
    ]);
    const rows = params.map(([key, spec]) =>
      element('div', `${look.row} woodfish-effect-param`, {}, [
        labelBlock(look, spec.label, spec.description),
        element('div', look.rowRight, {}, [
          element(
            'span',
            'woodfish-effect-overridden',
            { 'data-woodfish-effect-overridden': key },
            ['user.css 覆盖']
          ),
          paramControl(id, key, spec),
        ]),
      ])
    );
    const body = element(
      'div',
      'woodfish-effect-body',
      { 'data-woodfish-effect-body': id, hidden: '' },
      [
        ...rows,
        element('div', `${look.row} woodfish-effect-param woodfish-effect-reset-row`, {}, [
          element('div', look.description, {}, [`参数存在 ${id}\\params.json`]),
          element(
            'button',
            'woodfish-background-button',
            { type: 'button', 'data-woodfish-effect-reset': id },
            ['恢复默认']
          ),
        ]),
      ]
    );
    return element('div', 'woodfish-effect', { 'data-woodfish-effect': id }, [head, body]);
  }

  function header(): HTMLElement {
    const buttons: HTMLElement[] = [];
    if (options.reload) {
      buttons.push(
        element(
          'button',
          'woodfish-background-button woodfish-background-primary',
          {
            type: 'button',
            'data-woodfish-effects-reload': '',
          },
          ['刷新效果']
        )
      );
    }
    buttons.push(
      element(
        'button',
        'woodfish-background-button',
        { type: 'button', 'data-woodfish-effects-reset-all': '' },
        ['全部恢复默认']
      )
    );
    return element('div', `${look.row} woodfish-effects-header`, {}, [
      labelBlock(
        look,
        '效果插件',
        `每个效果是一个文件夹（${options.location}），这里改的和 AI 改文件的是同一份参数。改了 effect.js 之后点「刷新效果」或按 Ctrl+Alt+R。`
      ),
      element('div', `${look.rowRight} woodfish-background-buttons`, {}, buttons),
      status,
    ]);
  }

  function userCssRow(): HTMLElement {
    const buttons = options.userCss
      ? [
          element(
            'button',
            'woodfish-background-button',
            { type: 'button', 'data-woodfish-user-css': 'open' },
            ['打开 user.css']
          ),
          element(
            'button',
            'woodfish-background-button',
            { type: 'button', 'data-woodfish-user-css': 'reset' },
            ['恢复默认']
          ),
        ]
      : [];
    return element('div', `${look.row} woodfish-effects-user-css`, {}, [
      labelBlock(
        look,
        '自定义 CSS（user.css）',
        `${options.location}\\user.css 最后加载、优先级最高，保存后一两秒生效，升级不会覆盖。写一行 :root { --woodfish-caret-trail-color: #ff4d4f; } 就能换光标拖尾的颜色；所有变量和例子在效果文件夹的 README.md。${options.userCss ? '' : '用户脚本模式下改完要重新运行 woodfish codex install-userscript。'}`
      ),
      element('div', `${look.rowRight} woodfish-background-buttons`, {}, buttons),
    ]);
  }

  function render(effects: EffectStatus[]): void {
    card.replaceChildren(header(), userCssRow(), ...effects.map(effectGroup));
    for (const id of expanded) {
      unfold(id, true);
    }
  }

  function unfold(id: string, open: boolean): void {
    const body = card.querySelector<HTMLElement>(`[data-woodfish-effect-body="${id}"]`);
    const toggle = card.querySelector<HTMLElement>(`[data-woodfish-effect-toggle="${id}"]`);
    if (!body || !toggle) {
      return;
    }
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      expanded.add(id);
    } else {
      expanded.delete(id);
    }
  }

  function syncValues(effect: EffectStatus): void {
    const group = card.querySelector<HTMLElement>(`[data-woodfish-effect="${effect.id}"]`);
    if (!group) {
      return;
    }
    group.dataset.state = effect.state;
    group
      .querySelector('[data-woodfish-effect-switch]')
      ?.setAttribute('aria-checked', String(effect.values.enabled));
    const error = group.querySelector<HTMLElement>('[data-woodfish-effect-error]');
    if (error) {
      error.textContent = effect.error ? `${STATE_TEXT.failed}：${effect.error}` : '';
    }
    for (const [key, spec] of Object.entries(effect.manifest.params)) {
      const value = effect.values[key];
      group
        .querySelector(`[data-woodfish-effect-overridden="${key}"]`)
        ?.toggleAttribute('data-on', (effect.overrides ?? []).includes(key));
      const control = group.querySelector<HTMLElement>(`[data-woodfish-effect-param="${key}"]`);
      const output = group.querySelector<HTMLElement>(`[data-woodfish-effect-output="${key}"]`);
      if (!control || control === document.activeElement) {
        continue;
      }
      if (spec.type === 'boolean') {
        control.setAttribute('aria-checked', String(value === true));
      } else if (control instanceof HTMLInputElement) {
        control.value = spec.type === 'color' ? toHex(String(value)) : String(value);
      } else if (control instanceof HTMLSelectElement) {
        control.value = String(value);
      } else {
        for (const segment of control.querySelectorAll<HTMLElement>('[data-value]')) {
          segment.setAttribute('aria-checked', String(segment.dataset.value === value));
        }
      }
      if (output) {
        output.textContent = format(spec, value);
      }
    }
  }

  function sync(): void {
    const effects = options.effects();
    const next = effects
      .map((effect) => `${effect.id}:${JSON.stringify(effect.manifest)}`)
      .join('|');
    if (next !== signature) {
      signature = next;
      render(effects);
    }
    effects.forEach(syncValues);
  }

  function specOf(id: string, key: string): EffectParamSpec | undefined {
    return options.effects().find((effect) => effect.id === id)?.manifest.params[key];
  }

  function readControl(control: HTMLElement, spec: EffectParamSpec): unknown {
    if (control instanceof HTMLInputElement) {
      return spec.type === 'number' ? Number(control.value) : control.value;
    }
    if (control instanceof HTMLSelectElement) {
      return control.value;
    }
    return undefined;
  }

  card.addEventListener('input', (event) => {
    const control = event.target instanceof HTMLElement ? event.target : null;
    const key = control?.dataset.woodfishEffectParam;
    const id = control?.dataset.woodfishEffectId;
    const spec = id && key ? specOf(id, key) : undefined;
    if (!control || !id || !key || !spec) {
      return;
    }
    const value = readControl(control, spec);
    const output = control.parentElement?.querySelector<HTMLElement>(
      '[data-woodfish-effect-output]'
    );
    if (output) {
      output.textContent = format(spec, value);
    }
    options.change(id, { [key]: value });
  });
  card.addEventListener('change', (event) => {
    const control = event.target instanceof HTMLSelectElement ? event.target : null;
    const key = control?.dataset.woodfishEffectParam;
    const id = control?.dataset.woodfishEffectId;
    if (control && id && key) {
      options.change(id, { [key]: control.value });
    }
  });
  card.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }
    const toggle = target.closest<HTMLElement>('[data-woodfish-effect-toggle]');
    if (toggle) {
      const id = toggle.dataset.woodfishEffectToggle ?? '';
      unfold(id, !expanded.has(id));
      return;
    }
    const effectSwitch = target.closest<HTMLElement>('[data-woodfish-effect-switch]');
    if (effectSwitch) {
      options.change(effectSwitch.dataset.woodfishEffectSwitch ?? '', {
        enabled: effectSwitch.getAttribute('aria-checked') !== 'true',
      });
      sync();
      return;
    }
    const paramSwitch = target.closest<HTMLElement>(
      'button[role="switch"][data-woodfish-effect-param]'
    );
    if (paramSwitch) {
      options.change(paramSwitch.dataset.woodfishEffectId ?? '', {
        [paramSwitch.dataset.woodfishEffectParam ?? '']:
          paramSwitch.getAttribute('aria-checked') !== 'true',
      });
      sync();
      return;
    }
    const segment = target.closest<HTMLElement>('[data-value]');
    const group = segment?.closest<HTMLElement>('[data-woodfish-effect-param]');
    if (segment && group) {
      options.change(group.dataset.woodfishEffectId ?? '', {
        [group.dataset.woodfishEffectParam ?? '']: segment.dataset.value,
      });
      sync();
      return;
    }
    const userCss = target.closest<HTMLElement>('[data-woodfish-user-css]');
    if (userCss && options.userCss) {
      const open = userCss.dataset.woodfishUserCss === 'open';
      if (open ? options.userCss.open() : options.userCss.reset()) {
        status.textContent = open
          ? '已用默认编辑器打开 user.css'
          : 'user.css 已恢复默认（原来的内容留在 user.css.bak）';
      }
      return;
    }
    const reset = target.closest<HTMLElement>('[data-woodfish-effect-reset]');
    if (reset) {
      options.reset(reset.dataset.woodfishEffectReset ?? '');
      sync();
      return;
    }
    if (target.closest('[data-woodfish-effects-reset-all]')) {
      options.reset(null);
      sync();
      status.textContent = '所有效果已恢复默认';
      return;
    }
    if (target.closest('[data-woodfish-effects-reload]') && options.reload) {
      status.textContent = '正在从磁盘重新加载效果……';
      options.reload();
    }
  });

  sync();
  return {
    card,
    sync,
    say: (text: string): void => {
      status.textContent = text;
    },
  };
}
