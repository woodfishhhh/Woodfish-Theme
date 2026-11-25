import * as vscode from 'vscode';
import { PRESET_KEYS, type PresetValues } from '@woodfish/theme-core';
import { CONFIG_SECTION, PRESET_SETTING_KEYS } from '../constants/config';

export { BUILT_IN_PRESETS, PRESET_KEYS } from '@woodfish/theme-core';
export type { BuiltInPreset, PresetValues } from '@woodfish/theme-core';

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

export async function applyPresetValues(values: PresetValues): Promise<void> {
  const config = getConfig();
  for (const key of PRESET_KEYS) {
    if (!(key in values)) {
      continue;
    }
    const value = values[key];
    await config.update(key, value === null ? undefined : value, vscode.ConfigurationTarget.Global);
  }
}

export function captureCurrentPreset(): PresetValues {
  const config = getConfig();
  const values: PresetValues = {};
  for (const key of PRESET_KEYS) {
    const inspected = config.inspect(key);
    values[key] = inspected?.globalValue === undefined ? null : inspected.globalValue;
  }
  return values;
}

export function readCustomPresets(): Record<string, PresetValues> {
  const raw = getConfig().get<unknown>(PRESET_SETTING_KEYS.custom, {});
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {};
  }

  const presets: Record<string, PresetValues> = {};
  for (const [name, values] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof values === 'object' && values !== null && !Array.isArray(values)) {
      presets[name] = values as PresetValues;
    }
  }
  return presets;
}

export async function writeCustomPresets(presets: Record<string, PresetValues>): Promise<void> {
  await getConfig().update(
    PRESET_SETTING_KEYS.custom,
    Object.keys(presets).length > 0 ? presets : undefined,
    vscode.ConfigurationTarget.Global
  );
}

export type CursorPalette = {
  label: string;
  description: string;
  stops: string[] | null;
};

export const CURSOR_PALETTES: CursorPalette[] = [
  {
    label: '跟随主题',
    description: '使用当前 Woodfish 主题自带的光标配色（内置主题外为彩虹）',
    stops: null,
  },
  {
    label: '彩虹',
    description: 'Woodfish 经典九色',
    stops: [
      '#ff2d95',
      '#ff4500',
      '#ffd700',
      '#7cfc00',
      '#00ffff',
      '#1e90ff',
      '#9370db',
      '#ff00ff',
      '#ff1493',
    ],
  },
  {
    label: 'Dracula',
    description: '粉、紫、青、绿',
    stops: ['#ff79c6', '#bd93f9', '#8be9fd', '#50fa7b', '#8be9fd', '#bd93f9', '#ff79c6'],
  },
  {
    label: '赛博朋克',
    description: '霓虹粉、电光青、酸性黄',
    stops: ['#ff2a6d', '#d300c5', '#05d9e8', '#01ffc3', '#f9f871', '#ff2a6d'],
  },
  {
    label: '极光',
    description: '青绿到紫的冷色流动',
    stops: ['#00f5d4', '#00bbf9', '#4361ee', '#9b5de5', '#00f5d4'],
  },
  {
    label: '日落',
    description: '橙、珊瑚、玫红的暖色',
    stops: ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#ffbe0b'],
  },
  {
    label: '樱花',
    description: '低饱和的粉白',
    stops: ['#ffc8dd', '#ffafcc', '#f72585', '#ffafcc', '#ffc8dd'],
  },
  {
    label: '单色白',
    description: '不分散注意力的白色光标',
    stops: ['#ffffff', '#d0d0d0', '#ffffff'],
  },
];

const COLOR_INPUT_PATTERN =
  /^(?:#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|(?:rgb|rgba|hsl|hsla)\([^()]{1,50}\)|[a-z]+)$/i;

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of input) {
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth = Math.max(0, depth - 1);
    }
    if (depth === 0 && /[,，;；\s]/.test(character)) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts;
}

export function parseColorList(input: string): string[] | null {
  const stops = splitTopLevel(input)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (stops.length < 2 || stops.length > 16) {
    return null;
  }
  return stops.every((stop) => COLOR_INPUT_PATTERN.test(stop)) ? stops : null;
}
