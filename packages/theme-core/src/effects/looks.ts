/** Setting values a preset may carry; `null` resets the key to its default. */
export type PresetValues = Record<string, unknown>;

export type BuiltInPreset = {
  id: string;
  label: string;
  description: string;
  values: PresetValues;
};

/**
 * Keys a preset controls. Custom CSS rules are deliberately excluded: they are
 * restricted in untrusted workspaces and are personal overrides, not a look.
 */
export const PRESET_KEYS: string[] = [
  'overlay.hueShift',
  'overlay.lightnessDelta',
  'overlay.neutralChroma',
  'overlay.angle',
  'overlay.style',
  'syntaxGradient.enabled',
  'glow.enabled',
  'glow.intensity',
  'cursor.enabled',
  'cursor.animationDuration',
  'cursor.gradientStops',
  'cursor.borderRadius',
  'cursor.glow',
  'cursor.glowBlur',
  'cursor.glowOpacity',
  'glass.enabled',
  'glass.mode',
  'glass.blur',
  'glass.saturate',
  'glass.opacity',
  'glass.noise',
  'glass.borderRadius',
  'glass.targets',
  'glass.animations',
  'glass.reveal',
];

function resetAll(): PresetValues {
  return Object.fromEntries(PRESET_KEYS.map((key) => [key, null]));
}

export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    id: 'default',
    label: 'Woodfish 默认',
    description: '渐变 + 发光 + 彩色光标，恢复所有效果参数的默认值',
    values: resetAll(),
  },
  {
    id: 'soft',
    label: '柔和护眼',
    description: '更小的色相偏移与更弱的发光，适合长时间写代码',
    values: {
      ...resetAll(),
      'overlay.hueShift': 12,
      'overlay.lightnessDelta': 0.04,
      'glow.intensity': 0.55,
      'cursor.animationDuration': 14,
      'cursor.glowOpacity': 0.4,
    },
  },
  {
    id: 'neon',
    label: '霓虹全开',
    description: '加粗 + 1.6 倍的大光晕、更快的光标，加上毛玻璃与 Reveal 光效',
    values: {
      ...resetAll(),
      // The wide 5.x halo: the soft glow stayed subtle even at 1.6x (#31).
      'overlay.style': 'classic',
      'overlay.hueShift': 36,
      'overlay.lightnessDelta': 0.09,
      'glow.intensity': 1.6,
      'cursor.animationDuration': 5,
      'glass.enabled': true,
      'glass.reveal': true,
    },
  },
  {
    id: 'classic',
    label: '怀旧（5.x）',
    description: '回到 5.x 的样子：代码加粗、和文字同色的大光晕，渐变和彩虹光标照旧',
    values: {
      ...resetAll(),
      'overlay.style': 'classic',
    },
  },
  {
    id: 'glass',
    label: '毛玻璃',
    description: '保留默认代码效果，并为菜单、悬浮提示、命令面板等开启亚克力毛玻璃',
    values: {
      ...resetAll(),
      'glass.enabled': true,
      'glass.mode': 'acrylic',
    },
  },
  {
    id: 'focus',
    label: '专注模式',
    description: '只保留彩色光标，代码颜色交给当前主题',
    values: {
      ...resetAll(),
      'syntaxGradient.enabled': false,
      'glow.enabled': false,
    },
  },
  {
    id: 'performance',
    label: '性能优先',
    description: '保留渐变，关闭发光、光标尾迹和毛玻璃，适合低配电脑或高刷屏',
    values: {
      ...resetAll(),
      'glow.enabled': false,
      'cursor.glow': false,
      'glass.enabled': false,
    },
  },
];
