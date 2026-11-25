import * as React from 'react';
import {
  BackgroundImageError,
  EffectStatus,
  buildBackgroundFillImage,
  resizeBackgroundImage,
} from '@woodfish/renderer-runtime';
import {
  DEFAULT_BACKGROUND,
  EffectParamSpec,
  WoodfishPalette,
  isValidCssColor,
} from '@woodfish/theme-core';
import { DshBackgroundEntry } from '../protocol';
import {
  DSH_DEFAULT_BACKGROUND_ID,
  DSH_GRADIENT_BACKGROUND_ID,
  DshMode,
  dshPalettes,
} from '../settings';
import { DshBackgroundClient } from './backgrounds';
import { DshThemePreference } from './dshClientTypes';
import { WoodfishClientRuntime } from './runtime';

type SectionTab = 'all' | 'theme' | 'background' | 'effects' | 'css';

const h = React.createElement;
const SEGMENT_LIMIT = 4;
const THUMB_EDGE = 240;

const TABS: ReadonlyArray<{ id: SectionTab; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'theme', label: '主题' },
  { id: 'background', label: '背景' },
  { id: 'effects', label: '效果参数' },
  { id: 'css', label: '自定义 CSS' },
];

const APPEARANCES: ReadonlyArray<{ id: DshThemePreference; label: string }> = [
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' },
  { id: 'system', label: '跟随系统' },
];

const DEFAULT_EXPANDED_EFFECTS = ['squircle-corners', 'code-gradient', 'rainbow-text', 'glass'];

function formatParamValue(
  spec: EffectParamSpec,
  value: number | boolean | string | undefined
): string {
  if (typeof value !== 'number') {
    return String(value ?? '');
  }
  const step = spec.step ?? 1;
  const decimals = step >= 1 ? 0 : Math.min(3, String(step).split('.')[1]?.length ?? 2);
  const unit = spec.unit === 'deg' ? '°' : (spec.unit ?? '');
  return `${value.toFixed(decimals)}${unit}`;
}

function toHexColor(value: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return value;
  }
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : '#ffffff';
}

function renderSwitch(
  checked: boolean,
  label: string,
  onToggle: () => void,
  extraProps: Record<string, unknown> = {}
): React.ReactElement {
  return h(
    'button',
    {
      type: 'button',
      role: 'switch',
      className: 'wf-switch',
      'aria-checked': String(checked),
      'aria-label': label,
      onClick: onToggle,
      ...extraProps,
    },
    h('span', { className: 'wf-switch-thumb', 'aria-hidden': 'true' })
  );
}

function renderParamControl(
  effectId: string,
  key: string,
  spec: EffectParamSpec,
  value: number | boolean | string | undefined,
  onChange: (next: number | boolean | string, immediate: boolean) => void
): React.ReactElement {
  const dataProps = {
    'data-woodfish-effect-id': effectId,
    'data-woodfish-effect-param': key,
  };

  if (spec.type === 'boolean') {
    const checked = value === true;
    return renderSwitch(checked, spec.label, () => onChange(!checked, true), dataProps);
  }

  if (spec.type === 'number') {
    const numeric = typeof value === 'number' ? value : Number(spec.default);
    return h(
      'div',
      { className: 'wf-slider-wrap' },
      h('input', {
        type: 'range',
        className: 'wf-range',
        min: spec.min,
        max: spec.max,
        step: spec.step ?? 'any',
        value: numeric,
        'aria-label': spec.label,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          onChange(Number(event.target.value), false);
        },
        ...dataProps,
      }),
      h(
        'span',
        {
          className: 'wf-value-badge',
          'data-woodfish-effect-output': key,
        },
        formatParamValue(spec, numeric)
      )
    );
  }

  if (spec.type === 'color') {
    const textValue = typeof value === 'string' ? value : String(spec.default);
    return h(
      'div',
      { className: 'wf-color-wrap' },
      h('input', {
        type: 'color',
        className: 'wf-color-input',
        value: toHexColor(textValue),
        'aria-label': spec.label,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          onChange(event.target.value, false);
        },
        ...dataProps,
      }),
      h('input', {
        type: 'text',
        className: 'wf-color-text',
        value: textValue,
        'aria-label': `${spec.label} 色值`,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          const candidate = event.target.value.trim();
          if (isValidCssColor(candidate)) {
            onChange(candidate, false);
          }
        },
      })
    );
  }

  const options = spec.options ?? [];
  const current = typeof value === 'string' ? value : String(spec.default);
  if (options.length <= SEGMENT_LIMIT) {
    return h(
      'div',
      {
        className: 'wf-segments',
        role: 'radiogroup',
        'aria-label': spec.label,
        ...dataProps,
      },
      ...options.map((option) =>
        h(
          'button',
          {
            key: option.value,
            type: 'button',
            role: 'radio',
            className: 'wf-segment',
            'aria-checked': String(option.value === current),
            'data-value': option.value,
            onClick: () => onChange(option.value, true),
          },
          option.label
        )
      )
    );
  }

  return h(
    'select',
    {
      className: 'wf-select',
      value: current,
      'aria-label': spec.label,
      onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(event.target.value, true);
      },
      ...dataProps,
    },
    ...options.map((option) =>
      h('option', { key: option.value, value: option.value }, option.label)
    )
  );
}

function needsStackedRow(spec: EffectParamSpec): boolean {
  if (spec.type !== 'select') {
    return false;
  }
  const options = spec.options ?? [];
  if (options.length > SEGMENT_LIMIT) {
    return false;
  }
  const totalChars = options.reduce((sum, option) => sum + option.label.length, 0);
  return totalChars > 14 || options.length >= 3;
}

function renderParamRows(
  effect: EffectStatus,
  runtime: WoodfishClientRuntime
): React.ReactElement[] {
  return Object.entries(effect.manifest.params).map(([key, spec]) => {
    const overridden = effect.overrides.includes(key);
    const stacked = needsStackedRow(spec);
    return h(
      'div',
      { key, className: stacked ? 'wf-param-row wf-param-stacked' : 'wf-param-row' },
      h(
        'div',
        { className: 'wf-param-label-wrap' },
        h(
          'div',
          { className: 'wf-param-label' },
          spec.label,
          overridden ? h('span', { className: 'wf-param-override' }, 'user.css 覆盖') : null
        ),
        spec.description ? h('div', { className: 'wf-param-desc' }, spec.description) : null
      ),
      h(
        'div',
        { className: 'wf-param-control' },
        renderParamControl(effect.id, key, spec, effect.values[key], (next, immediate) => {
          runtime.setEffectParam(effect.id, { [key]: next }, immediate);
        })
      )
    );
  });
}

function renderPaletteCard(
  mode: DshMode,
  selectedSlug: string | null,
  palette: WoodfishPalette | null,
  onSelect: (slug: string | null) => void
): React.ReactElement {
  const slug = palette?.slug ?? null;
  const active = selectedSlug === slug;
  const bg = palette ? palette.ui.bg : mode === 'dark' ? '#151517' : '#ffffff';
  const sidebar = palette ? palette.ui.bgAlt : mode === 'dark' ? '#1c1d20' : '#f3f4f6';
  const accent = palette ? palette.ui.accent : '#4176e6';
  const keyword = palette ? palette.tokens.keyword : mode === 'dark' ? '#93c5fd' : '#2563eb';
  const fn = palette ? palette.tokens.function : mode === 'dark' ? '#c4b5fd' : '#7c3aed';
  const str = palette ? palette.tokens.string : mode === 'dark' ? '#86efac' : '#16a34a';
  const label = palette ? palette.label : mode === 'dark' ? 'dsh 原生深色' : 'dsh 原生浅色';
  const dataAttr =
    mode === 'dark'
      ? { 'data-woodfish-palette-dark': slug ?? 'default' }
      : { 'data-woodfish-palette-light': slug ?? 'default' };

  return h(
    'button',
    {
      key: slug ?? `default-${mode}`,
      type: 'button',
      role: 'radio',
      className: 'wf-palette-card',
      'aria-checked': String(active),
      onClick: () => onSelect(slug),
      ...dataAttr,
    },
    h(
      'div',
      {
        className: 'wf-palette-preview',
        style: { background: `linear-gradient(90deg, ${sidebar} 0 28%, ${bg} 28% 100%)` },
        'aria-hidden': 'true',
      },
      h(
        'div',
        { className: 'wf-palette-bars' },
        h('span', { className: 'wf-palette-dot', style: { background: accent } }),
        h('span', { className: 'wf-palette-bar', style: { background: keyword } }),
        h('span', { className: 'wf-palette-bar', style: { background: fn } })
      ),
      h(
        'div',
        { className: 'wf-palette-bars' },
        h('span', { className: 'wf-palette-bar', style: { background: str } }),
        h('span', { className: 'wf-palette-bar', style: { background: accent } })
      )
    ),
    h('span', { className: 'wf-palette-name', title: label }, label)
  );
}

/** Crisp 16x16 icon rendered in dsh's Settings navigation rail for the Woodfish tab. */
export function WoodfishNavIcon(): React.ReactElement {
  return h(
    'svg',
    {
      width: 16,
      height: 16,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    h('path', {
      d: 'M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h4.5a4.5 4.5 0 0 0 0-9H12Z',
    }),
    h('circle', { cx: 8.5, cy: 9.5, r: 1.1, fill: 'currentColor', stroke: 'none' }),
    h('circle', { cx: 12, cy: 7.5, r: 1.1, fill: 'currentColor', stroke: 'none' }),
    h('circle', { cx: 15.5, cy: 9.5, r: 1.1, fill: 'currentColor', stroke: 'none' })
  );
}

/**
 * Factory creating the Settings section React component bound to one live Woodfish runtime
 * and background API client.
 */
export function createWoodfishSettingsSection(
  runtime: WoodfishClientRuntime,
  backgrounds: DshBackgroundClient
): () => React.ReactElement {
  const darkPalettes = dshPalettes('dark');
  const lightPalettes = dshPalettes('light');

  return function WoodfishSettingsSection(): React.ReactElement {
    const snap = React.useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
    const [activeTab, setActiveTab] = React.useState<SectionTab>('all');
    const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(
      () => new Set(DEFAULT_EXPANDED_EFFECTS)
    );
    const [entries, setEntries] = React.useState<readonly DshBackgroundEntry[]>([]);
    const [thumbs, setThumbs] = React.useState<Readonly<Record<string, string>>>({});
    const [bgStatus, setBgStatus] = React.useState<string>('');
    const [uploading, setUploading] = React.useState<boolean>(false);
    const [dragging, setDragging] = React.useState<boolean>(false);
    const [cssDraft, setCssDraft] = React.useState<string>(() => snap.settings.userCss);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const thumbUrlsRef = React.useRef<Map<string, string>>(new Map());

    React.useEffect(() => {
      setCssDraft(snap.settings.userCss);
    }, [snap.settings.userCss]);

    React.useEffect(() => {
      let alive = true;
      void backgrounds
        .list()
        .then((list) => {
          if (alive) {
            setEntries(list);
          }
        })
        .catch(() => undefined);
      return (): void => {
        alive = false;
      };
    }, []);

    React.useEffect(() => {
      let alive = true;
      const needed = [DSH_DEFAULT_BACKGROUND_ID, ...entries.map((entry) => entry.id)];
      for (const id of needed) {
        if (thumbUrlsRef.current.has(id)) {
          continue;
        }
        void backgrounds
          .load(id)
          .then((blob) => resizeBackgroundImage(blob, THUMB_EDGE, 0.8).catch(() => blob))
          .then((thumb) => {
            if (!alive) {
              return;
            }
            const url = URL.createObjectURL(thumb);
            thumbUrlsRef.current.set(id, url);
            setThumbs((prev) => ({ ...prev, [id]: url }));
          })
          .catch(() => undefined);
      }
      return (): void => {
        alive = false;
      };
    }, [entries]);

    React.useEffect(() => {
      const urls = thumbUrlsRef.current;
      return (): void => {
        for (const url of urls.values()) {
          URL.revokeObjectURL(url);
        }
        urls.clear();
      };
    }, []);

    const handleUpload = React.useCallback(async (file: File) => {
      setUploading(true);
      setBgStatus('正在处理并上传图片……');
      try {
        const saved = await backgrounds.upload(file);
        const list = await backgrounds.list().catch(() => [saved]);
        setEntries(list);
        runtime.setBackgroundImage(saved.id);
        setBgStatus(`已上传并应用：${saved.name}`);
      } catch (error) {
        setBgStatus(
          error instanceof BackgroundImageError
            ? error.message
            : `上传失败：${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        setUploading(false);
      }
    }, []);

    const handleRemoveBackground = React.useCallback(
      async (id: string) => {
        setUploading(true);
        try {
          await backgrounds.remove(id);
          setEntries((prev) => prev.filter((item) => item.id !== id));
          const oldUrl = thumbUrlsRef.current.get(id);
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
            thumbUrlsRef.current.delete(id);
          }
          if (snap.settings.backgroundImage === id) {
            runtime.setBackgroundImage(DSH_DEFAULT_BACKGROUND_ID);
          }
          setBgStatus('已删除自定义背景图');
        } catch (error) {
          setBgStatus(`删除失败：${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setUploading(false);
        }
      },
      [snap.settings.backgroundImage]
    );

    const toggleExpanded = (id: string): void => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    const backgroundEffect = snap.effects.find((effect) => effect.id === 'background') ?? null;
    const otherEffects = snap.effects.filter((effect) => effect.id !== 'background');
    const allExpanded =
      otherEffects.length > 0 && otherEffects.every((effect) => expanded.has(effect.id));

    const saveText =
      snap.saveState === 'saving'
        ? '正在保存…'
        : snap.saveState === 'saved'
          ? '已保存'
          : snap.saveState === 'error'
            ? (snap.saveError ?? '保存失败')
            : '实时同步';

    const show = (section: Exclude<SectionTab, 'all'>): boolean =>
      activeTab === 'all' || activeTab === section;

    return h(
      'div',
      { className: 'wf-root', 'data-woodfish-settings-root': 'true' },
      // Top header
      h(
        'div',
        { className: 'wf-topbar' },
        h(
          'div',
          { className: 'wf-title-wrap' },
          h('h2', { className: 'wf-title' }, 'Woodfish 主题与视觉效果'),
          h(
            'p',
            { className: 'wf-subtitle' },
            '全量侵入式主题与效果面板：所有修改即时生效并原生持久保存。'
          )
        ),
        h(
          'div',
          { className: 'wf-topbar-actions' },
          h(
            'span',
            {
              className: 'wf-status-pill',
              'data-state': snap.saveState,
              'data-woodfish-save-state': snap.saveState,
              role: 'status',
            },
            saveText
          ),
          snap.saveState === 'error'
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'wf-btn',
                  'data-woodfish-retry-save': 'true',
                  onClick: () => runtime.retryPersist(),
                },
                '重试保存'
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'wf-btn',
              'data-woodfish-reset-all': 'true',
              onClick: () => runtime.resetAll(),
            },
            '全部恢复默认'
          )
        )
      ),

      // Category tabs
      h(
        'div',
        { className: 'wf-tabs', role: 'tablist', 'aria-label': 'Woodfish 设置分区' },
        ...TABS.map((tab) =>
          h(
            'button',
            {
              key: tab.id,
              type: 'button',
              role: 'tab',
              className: 'wf-tab',
              'aria-selected': String(activeTab === tab.id),
              'data-woodfish-tab': tab.id,
              onClick: () => setActiveTab(tab.id),
            },
            tab.label
          )
        )
      ),

      // Section 1: Theme palettes
      show('theme')
        ? h(
            'section',
            { className: 'wf-section', 'data-woodfish-section': 'theme' },
            h(
              'div',
              { className: 'wf-section-head' },
              h(
                'div',
                null,
                h('h3', { className: 'wf-section-title' }, '主题配色'),
                h(
                  'p',
                  { className: 'wf-section-desc' },
                  '为深色与浅色外观分别选择 Woodfish 主题（涵盖全部 15 套配色、代码高亮、Diff 与侧栏终端）。'
                )
              ),
              h(
                'div',
                {
                  className: 'wf-segments',
                  role: 'radiogroup',
                  'aria-label': 'dsh 外观模式',
                },
                ...APPEARANCES.map((mode) =>
                  h(
                    'button',
                    {
                      key: mode.id,
                      type: 'button',
                      role: 'radio',
                      className: 'wf-segment',
                      'aria-checked': String(snap.appearance === mode.id),
                      'data-woodfish-appearance': mode.id,
                      onClick: () => runtime.setAppearance(mode.id),
                    },
                    mode.label
                  )
                )
              )
            ),
            h('div', { className: 'wf-group-label' }, `深色外观主题（${darkPalettes.length} 套）`),
            h(
              'div',
              {
                className: 'wf-palette-grid',
                role: 'radiogroup',
                'aria-label': '深色外观主题',
              },
              renderPaletteCard('dark', snap.settings.palette.dark, null, (slug) =>
                runtime.setPalette('dark', slug)
              ),
              ...darkPalettes.map((palette) =>
                renderPaletteCard('dark', snap.settings.palette.dark, palette, (slug) =>
                  runtime.setPalette('dark', slug)
                )
              )
            ),
            h('div', { className: 'wf-group-label' }, `浅色外观主题（${lightPalettes.length} 套）`),
            h(
              'div',
              {
                className: 'wf-palette-grid',
                role: 'radiogroup',
                'aria-label': '浅色外观主题',
              },
              renderPaletteCard('light', snap.settings.palette.light, null, (slug) =>
                runtime.setPalette('light', slug)
              ),
              ...lightPalettes.map((palette) =>
                renderPaletteCard('light', snap.settings.palette.light, palette, (slug) =>
                  runtime.setPalette('light', slug)
                )
              )
            )
          )
        : null,

      // Section 2: Window background & custom image upload + all 7 background params
      show('background')
        ? h(
            'section',
            {
              className: 'wf-section wf-bg-dropzone',
              'data-woodfish-section': 'background',
              'data-dragging': String(dragging),
              onDragOver: (event: React.DragEvent) => {
                event.preventDefault();
                setDragging(true);
              },
              onDragLeave: () => setDragging(false),
              onDrop: (event: React.DragEvent) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer?.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
              },
            },
            h(
              'div',
              { className: 'wf-section-head' },
              h(
                'div',
                null,
                h('h3', { className: 'wf-section-title' }, '窗口背景与毛玻璃'),
                h(
                  'p',
                  { className: 'wf-section-desc' },
                  '选择预设《彩云》、彩云渐变或上传本地图片（支持拖放，持久保存在本机 dsh 目录）；下方滑块实时调节全部背景参数。'
                )
              ),
              h(
                'div',
                { className: 'wf-effect-actions' },
                backgroundEffect
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'wf-btn',
                        'data-woodfish-effect-reset': 'background',
                        onClick: () => runtime.resetEffect('background'),
                      },
                      '恢复背景默认'
                    )
                  : null,
                backgroundEffect
                  ? renderSwitch(
                      backgroundEffect.values.enabled,
                      '窗口背景',
                      () =>
                        runtime.setEffectParam(
                          'background',
                          { enabled: !backgroundEffect.values.enabled },
                          true
                        ),
                      { 'data-woodfish-effect-switch': 'background' }
                    )
                  : null
              )
            ),
            h(
              'div',
              { className: 'wf-bg-grid', role: 'radiogroup', 'aria-label': '背景图片' },
              // Preset 《彩云》
              h(
                'button',
                {
                  type: 'button',
                  role: 'radio',
                  className: 'wf-bg-tile',
                  'aria-checked': String(
                    snap.settings.backgroundImage === DSH_DEFAULT_BACKGROUND_ID
                  ),
                  'data-woodfish-background': DSH_DEFAULT_BACKGROUND_ID,
                  onClick: () => runtime.setBackgroundImage(DSH_DEFAULT_BACKGROUND_ID),
                },
                h('span', {
                  className: 'wf-bg-thumb',
                  style: thumbs[DSH_DEFAULT_BACKGROUND_ID]
                    ? { backgroundImage: `url("${thumbs[DSH_DEFAULT_BACKGROUND_ID]}")` }
                    : undefined,
                }),
                h('span', { className: 'wf-bg-label' }, '彩云（预设）')
              ),
              // Gradient fill
              h(
                'button',
                {
                  type: 'button',
                  role: 'radio',
                  className: 'wf-bg-tile',
                  'aria-checked': String(
                    snap.settings.backgroundImage === DSH_GRADIENT_BACKGROUND_ID
                  ),
                  'data-woodfish-background': DSH_GRADIENT_BACKGROUND_ID,
                  onClick: () => runtime.setBackgroundImage(DSH_GRADIENT_BACKGROUND_ID),
                },
                h('span', {
                  className: 'wf-bg-thumb',
                  style: { backgroundImage: buildBackgroundFillImage(DEFAULT_BACKGROUND.fill) },
                }),
                h('span', { className: 'wf-bg-label' }, '彩云渐变')
              ),
              // Uploaded pictures
              ...entries.map((entry) =>
                h(
                  'div',
                  { key: entry.id, className: 'wf-bg-tile-wrap' },
                  h(
                    'button',
                    {
                      type: 'button',
                      role: 'radio',
                      className: 'wf-bg-tile',
                      'aria-checked': String(snap.settings.backgroundImage === entry.id),
                      'data-woodfish-background': entry.id,
                      onClick: () => runtime.setBackgroundImage(entry.id),
                    },
                    h('span', {
                      className: 'wf-bg-thumb',
                      style: thumbs[entry.id]
                        ? { backgroundImage: `url("${thumbs[entry.id]}")` }
                        : undefined,
                    }),
                    h('span', { className: 'wf-bg-label', title: entry.name }, entry.name)
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'wf-bg-remove',
                      'aria-label': `删除 ${entry.name}`,
                      'data-woodfish-background-remove': entry.id,
                      disabled: uploading,
                      onClick: () => {
                        void handleRemoveBackground(entry.id);
                      },
                    },
                    '×'
                  )
                )
              ),
              // Upload tile
              h(
                'button',
                {
                  type: 'button',
                  className: 'wf-bg-tile',
                  disabled: uploading,
                  'data-woodfish-background-upload': 'true',
                  onClick: () => fileInputRef.current?.click(),
                },
                h('span', { className: 'wf-bg-thumb' }, '+'),
                h('span', { className: 'wf-bg-label' }, uploading ? '上传中…' : '上传图片…')
              )
            ),
            h('input', {
              ref: fileInputRef,
              type: 'file',
              accept: 'image/jpeg,image/png,image/webp',
              hidden: true,
              'data-woodfish-background-file': 'true',
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) {
                  void handleUpload(file);
                }
              },
            }),
            bgStatus
              ? h(
                  'div',
                  { className: 'wf-hint', role: 'status', 'data-woodfish-bg-status': 'true' },
                  bgStatus
                )
              : null,
            backgroundEffect
              ? h(
                  'div',
                  { className: 'wf-effect-body' },
                  ...renderParamRows(backgroundEffect, runtime)
                )
              : null
          )
        : null,

      // Section 3: All effects dynamically rendered from effect.json manifests
      show('effects')
        ? h(
            'section',
            { className: 'wf-section', 'data-woodfish-section': 'effects' },
            h(
              'div',
              { className: 'wf-section-head' },
              h(
                'div',
                null,
                h(
                  'h3',
                  { className: 'wf-section-title' },
                  `视觉与动效参数（${otherEffects.length} 项）`
                ),
                h(
                  'p',
                  { className: 'wf-section-desc' },
                  '每项效果均按其 effect.json 参数定义完整生成独立开关与全部可调控件，拖动即实时生效。'
                )
              ),
              h(
                'div',
                { className: 'wf-effect-actions' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'wf-btn',
                    'data-woodfish-expand-all': 'true',
                    onClick: () => {
                      if (allExpanded) {
                        setExpanded(new Set());
                      } else {
                        setExpanded(new Set(otherEffects.map((effect) => effect.id)));
                      }
                    },
                  },
                  allExpanded ? '全部收起' : '展开全部参数'
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'wf-btn',
                    'data-woodfish-effects-reset-all': 'true',
                    onClick: () => runtime.resetAllEffects(),
                  },
                  '重置全部效果'
                )
              )
            ),
            h(
              'div',
              { className: 'wf-effect-list' },
              ...otherEffects.map((effect) => {
                const paramCount = Object.keys(effect.manifest.params).length;
                const isOpen = expanded.has(effect.id);
                return h(
                  'div',
                  {
                    key: effect.id,
                    className: 'wf-effect-card',
                    'data-woodfish-effect': effect.id,
                    'data-state': effect.state,
                  },
                  h(
                    'div',
                    { className: 'wf-effect-head' },
                    h(
                      'div',
                      { className: 'wf-effect-info' },
                      h(
                        'div',
                        { className: 'wf-effect-title-row' },
                        h('span', { className: 'wf-effect-name' }, effect.manifest.name),
                        h('span', { className: 'wf-effect-id' }, effect.id)
                      ),
                      effect.manifest.description
                        ? h('div', { className: 'wf-effect-desc' }, effect.manifest.description)
                        : null,
                      effect.error
                        ? h('div', { className: 'wf-effect-error' }, `加载失败：${effect.error}`)
                        : null
                    ),
                    h(
                      'div',
                      { className: 'wf-effect-actions' },
                      paramCount > 0
                        ? h(
                            'button',
                            {
                              type: 'button',
                              className: 'wf-btn',
                              'aria-expanded': String(isOpen),
                              'data-woodfish-effect-toggle': effect.id,
                              onClick: () => toggleExpanded(effect.id),
                            },
                            isOpen ? `收起参数（${paramCount}）` : `参数（${paramCount}）`
                          )
                        : null,
                      renderSwitch(
                        effect.values.enabled,
                        effect.manifest.name,
                        () =>
                          runtime.setEffectParam(
                            effect.id,
                            { enabled: !effect.values.enabled },
                            true
                          ),
                        { 'data-woodfish-effect-switch': effect.id }
                      )
                    )
                  ),
                  isOpen && paramCount > 0
                    ? h(
                        'div',
                        {
                          className: 'wf-effect-body',
                          'data-woodfish-effect-body': effect.id,
                        },
                        ...renderParamRows(effect, runtime),
                        h(
                          'div',
                          { className: 'wf-effect-footer' },
                          h(
                            'span',
                            { className: 'wf-param-desc' },
                            `CSS 变量前缀：--woodfish-${effect.id}-*`
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'wf-btn',
                              'data-woodfish-effect-reset': effect.id,
                              onClick: () => runtime.resetEffect(effect.id),
                            },
                            '恢复此效果默认'
                          )
                        )
                      )
                    : null
                );
              })
            )
          )
        : null,

      // Section 4: Custom CSS (user.css)
      show('css')
        ? h(
            'section',
            { className: 'wf-section', 'data-woodfish-section': 'css' },
            h(
              'div',
              { className: 'wf-section-head' },
              h(
                'div',
                null,
                h('h3', { className: 'wf-section-title' }, '自定义 CSS（user.css）'),
                h(
                  'p',
                  { className: 'wf-section-desc' },
                  '挂载在页面最末、优先级最高，可直接覆盖任何 --woodfish-<效果>-<参数> 变量或 dsh 界面样式。'
                )
              )
            ),
            h('textarea', {
              className: 'wf-css-editor',
              value: cssDraft,
              spellCheck: false,
              placeholder:
                ':root {\n  --woodfish-caret-trail-color: #ff4d4f;\n  --woodfish-squircle-corners-scale: 1.9;\n}',
              'aria-label': '自定义 CSS',
              'data-woodfish-user-css-input': 'true',
              onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
                const next = event.target.value;
                setCssDraft(next);
                runtime.setUserCss(next, false);
              },
            }),
            h(
              'div',
              { className: 'wf-css-actions' },
              h('span', { className: 'wf-param-desc' }, '输入后自动实时生效并持久保存。'),
              h(
                'div',
                { className: 'wf-effect-actions' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'wf-btn',
                    'data-woodfish-user-css-clear': 'true',
                    onClick: () => {
                      setCssDraft('');
                      runtime.setUserCss('', true);
                    },
                  },
                  '清空 CSS'
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'wf-btn wf-btn-primary',
                    'data-woodfish-user-css-apply': 'true',
                    onClick: () => runtime.setUserCss(cssDraft, true),
                  },
                  '立即保存'
                )
              )
            )
          )
        : null
    );
  };
}
