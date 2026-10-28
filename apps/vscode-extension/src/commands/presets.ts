import * as vscode from 'vscode';
import {
  BUILT_IN_PRESETS,
  CURSOR_PALETTES,
  PresetValues,
  applyPresetValues,
  captureCurrentPreset,
  parseColorList,
  readCustomPresets,
  writeCustomPresets,
} from '../config/presets';
import { CONFIG_SECTION, CURSOR_SETTING_KEYS, FEATURE_SETTING_KEYS } from '../constants/config';
import { COMMANDS } from '../constants/commands';
import { showInfoMessage } from '../ui/notifications';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

type PresetItem = vscode.QuickPickItem & {
  values?: PresetValues;
  customName?: string;
  action?: 'save';
};

const DELETE_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('trash'),
  tooltip: '删除这个自定义预设',
};

async function applyAndSync(deps: CommandDeps, values: PresetValues): Promise<void> {
  await applyPresetValues(values);
  await deps.runtimeService.syncWithCurrentSettings({ showPrompt: true });
  deps.featureState.refreshFromConfig();
}

async function savePreset(): Promise<void> {
  const name = await vscode.window.showInputBox({
    title: '保存 Woodfish 预设',
    prompt: '为当前的效果参数起个名字，之后可以在“选择效果预设”里一键切换',
    validateInput: (value) => (value.trim().length === 0 ? '名称不能为空' : undefined),
  });
  if (!name) {
    return;
  }

  const presets = readCustomPresets();
  presets[name.trim()] = captureCurrentPreset();
  await writeCustomPresets(presets);
  showInfoMessage(`已保存预设“${name.trim()}”。`);
}

function buildPresetItems(): PresetItem[] {
  const custom = readCustomPresets();
  const items: PresetItem[] = [
    { label: '内置预设', kind: vscode.QuickPickItemKind.Separator },
    ...BUILT_IN_PRESETS.map((preset) => ({
      label: preset.label,
      description: preset.description,
      values: preset.values,
    })),
  ];
  const customNames = Object.keys(custom);
  if (customNames.length > 0) {
    items.push({ label: '我的预设', kind: vscode.QuickPickItemKind.Separator });
    for (const name of customNames) {
      items.push({
        label: `$(account) ${name}`,
        values: custom[name],
        customName: name,
        buttons: [DELETE_BUTTON],
      });
    }
  }
  items.push(
    { label: '', kind: vscode.QuickPickItemKind.Separator },
    { label: '$(save) 将当前效果保存为预设…', action: 'save' }
  );
  return items;
}

export function registerPresetCommands(deps: CommandDeps): vscode.Disposable[] {
  const apply = vscode.commands.registerCommand(COMMANDS.applyPreset, async () => {
    await runSafely('应用预设', async () => {
      const picker = vscode.window.createQuickPick<PresetItem>();
      picker.title = 'Woodfish 效果预设';
      picker.placeholder = '选择一套效果参数（只修改用户设置里的 Woodfish 选项）';
      picker.items = buildPresetItems();

      const selected = await new Promise<PresetItem | undefined>((resolve) => {
        picker.onDidTriggerItemButton(async (event) => {
          const name = event.item.customName;
          if (!name) {
            return;
          }
          const presets = readCustomPresets();
          delete presets[name];
          await writeCustomPresets(presets);
          picker.items = buildPresetItems();
        });
        picker.onDidAccept(() => {
          resolve(picker.selectedItems[0]);
          picker.hide();
        });
        picker.onDidHide(() => resolve(undefined));
        picker.show();
      });
      picker.dispose();

      if (!selected) {
        return;
      }
      if (selected.action === 'save') {
        await savePreset();
        return;
      }
      if (selected.values) {
        await applyAndSync(deps, selected.values);
      }
    });
  });

  const save = vscode.commands.registerCommand(COMMANDS.savePreset, async () => {
    await runSafely('保存预设', savePreset);
  });

  const palette = vscode.commands.registerCommand(COMMANDS.pickCursorPalette, async () => {
    await runSafely('选择光标配色', async () => {
      type PaletteItem = vscode.QuickPickItem & { stops?: string[] | null; custom?: boolean };
      const items: PaletteItem[] = [
        ...CURSOR_PALETTES.map((palette) => ({
          label: palette.label,
          description: palette.description,
          detail: palette.stops ? palette.stops.join('  ') : undefined,
          stops: palette.stops,
        })),
        { label: '$(edit) 自定义颜色…', description: '输入 2–16 个 CSS 颜色', custom: true },
      ];
      const selection = await vscode.window.showQuickPick(items, {
        title: 'Woodfish 彩色光标配色',
        placeHolder: '选择一组渐变色',
      });
      if (!selection) {
        return;
      }

      const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
      let stops: string[] | null | undefined = selection.stops;
      if (selection.custom) {
        const current = config.get<string[]>(CURSOR_SETTING_KEYS.gradientStops, []);
        const input = await vscode.window.showInputBox({
          title: '自定义光标渐变色',
          prompt: '用逗号分隔，例如：#ff79c6, #bd93f9, rgb(139 233 253), gold',
          value: current.join(', '),
          validateInput: (value) =>
            parseColorList(value)
              ? undefined
              : '请输入 2–16 个合法颜色（#hex、rgb()、hsl() 或颜色名）',
        });
        if (input === undefined) {
          return;
        }
        stops = parseColorList(input);
      }

      await config.update(
        CURSOR_SETTING_KEYS.gradientStops,
        stops ?? undefined,
        vscode.ConfigurationTarget.Global
      );
      if (!config.get<boolean>(FEATURE_SETTING_KEYS.cursor, true)) {
        await config.update(FEATURE_SETTING_KEYS.cursor, true, vscode.ConfigurationTarget.Global);
      }
      await deps.runtimeService.syncWithCurrentSettings({ showPrompt: true });
      deps.featureState.refreshFromConfig();
    });
  });

  return [apply, save, palette];
}
