import { findDshPalette, normalizeDshSettings } from '@woodfish/adapter-dsh';
import { mergeSettings, parseSetting } from '../cli/args';
import {
  defaultUserScriptFile,
  loadDshState,
  loadDshUserScriptBundle,
  removeDshFiles,
  saveDshState,
  writeDshUserScript,
} from '../dsh/userScript';
import { CommandContext, EXIT } from './context';

function paletteName(slug: string | null): string {
  return (slug && findDshPalette(slug)?.label) || 'dsh 自带配色';
}

/**
 * `woodfish dsh userscript`: applies `--set`/`--reset` to the saved settings and writes the
 * user script with them baked in.
 */
export function dshUserScriptCommand(
  context: CommandContext,
  sets: readonly string[],
  options: { reset: boolean; out?: string }
): number {
  let input: unknown = options.reset ? {} : loadDshState(context.paths).dsh;
  for (const assignment of sets) {
    input = mergeSettings(input, parseSetting(assignment));
  }
  const saved = normalizeDshSettings(input);
  const file = writeDshUserScript(
    options.out ?? defaultUserScriptFile(context.paths),
    saved,
    loadDshUserScriptBundle()
  );
  saveDshState(context.paths, { version: 1, dsh: saved, userScriptFile: file });

  context.io.out(`已生成 dsh 用户脚本：${file}`);
  context.io.out(
    `深色主题：${paletteName(saved.palette.dark)}；浅色主题：${paletteName(saved.palette.light)}`
  );
  context.io.out(
    [
      '',
      '安装：',
      '  1. 在浏览器中安装 Tampermonkey 或 Violentmonkey。',
      '  2. 在它的管理面板中导入上面这个文件（Tampermonkey：实用工具 → 导入；',
      '     Violentmonkey：把文件拖进管理面板），确认安装。',
      '  3. 运行 dsh web，刷新 dsh 页面即可生效。',
      '',
      '主题和效果开关也可以在油猴的菜单里切换；改了模糊半径等参数后，重新运行本命令并再次导入。',
    ].join('\n')
  );
  return EXIT.ok;
}

/** `woodfish dsh uninstall`: removes everything `woodfish dsh` wrote. */
export function dshUninstallCommand(context: CommandContext): number {
  const removed = removeDshFiles(context.paths);
  context.io.out(
    removed.length > 0
      ? `已删除：\n${removed.map((file) => `  ${file}`).join('\n')}`
      : '没有找到 woodfish dsh 生成的文件。'
  );
  context.io.out(
    '浏览器里的脚本由油猴管理：在管理面板中删除“Woodfish for DeepSeek Harness”，刷新 dsh 页面后效果即全部撤下。'
  );
  return EXIT.ok;
}
