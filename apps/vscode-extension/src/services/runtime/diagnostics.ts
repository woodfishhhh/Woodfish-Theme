import * as fs from 'fs';
import * as path from 'path';
import { ThemeRuntimeSettings } from '../../types/features';
import { computeVsCodeChecksum } from './checksums';
import { getBootstrapFilePath, hasManagedBootstrapFile } from './cleanup';
import { WorkbenchLocation } from './locator';
import { isNativeWindowComplete, isNativeWindowInstalled } from './nativeWindow';
import { hasWoodfishPayload } from './workbenchPatcher';

export type DiagnosticsInput = {
  extensionVersion: string;
  vscodeVersion: string;
  appName: string;
  appRoot: string;
  remoteName: string | undefined;
  uiKind: string;
  platform: typeof process.platform;
  arch: string;
  activeTheme: string;
  location: WorkbenchLocation | null;
  settings: ThemeRuntimeSettings;
  recentLog: string[];
};

function describeNativeHook(appRoot: string): string {
  if (isNativeWindowComplete(appRoot)) {
    return '已安装';
  }
  return isNativeWindowInstalled(appRoot)
    ? '不完整（钩子文件缺失，运行“修复 Woodfish 注入”）'
    : '未安装';
}

function isWritable(target: string): boolean {
  try {
    fs.accessSync(target, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function checksumState(location: WorkbenchLocation): string {
  try {
    const product = JSON.parse(
      fs.readFileSync(path.join(location.appRoot, 'product.json'), 'utf-8')
    ) as { checksums?: Record<string, string> };
    const expected = product.checksums?.[location.relativePath];
    if (!expected) {
      return '无记录';
    }
    const actual = computeVsCodeChecksum(fs.readFileSync(location.workbenchPath));
    return expected === actual ? '一致' : '不一致（会出现“安装似乎损坏”提示）';
  } catch (error) {
    return `读取失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

export function buildDiagnosticsReport(input: DiagnosticsInput): string {
  const { location, settings } = input;
  const lines = [
    '## Woodfish Theme 诊断信息',
    '',
    '| 项目 | 值 |',
    '| --- | --- |',
    `| Woodfish 版本 | ${input.extensionVersion} |`,
    `| 编辑器 | ${input.appName} |`,
    `| VS Code 内核版本 | ${input.vscodeVersion} |`,
    `| 系统 | ${input.platform} ${input.arch} |`,
    `| 界面类型 | ${input.uiKind}${input.remoteName ? `（远程：${input.remoteName}）` : ''} |`,
    `| 当前颜色主题 | ${input.activeTheme || '未检测到'} |`,
    `| appRoot | \`${input.appRoot}\` |`,
  ];

  if (location) {
    const html = fs.existsSync(location.workbenchPath)
      ? fs.readFileSync(location.workbenchPath, 'utf-8')
      : '';
    lines.push(
      `| workbench.html | \`${location.relativePath}\` |`,
      `| 安装目录可写 | ${isWritable(path.dirname(location.workbenchPath)) ? '是' : '否'} |`,
      `| 已注入 payload | ${hasWoodfishPayload(html) ? '是' : '否'} |`,
      `| bootstrap 文件 | ${hasManagedBootstrapFile(location.workbenchPath) ? '存在' : fs.existsSync(getBootstrapFilePath(location.workbenchPath)) ? '存在（非 Woodfish 管理）' : '不存在'} |`,
      `| product.json 校验和 | ${checksumState(location)} |`,
      `| 系统级窗口钩子 | ${describeNativeHook(location.appRoot)} |`
    );
  } else {
    lines.push('| workbench.html | 未找到 |');
  }

  lines.push(
    '',
    '### 生效的设置',
    '',
    '```json',
    JSON.stringify(
      {
        overlay: settings.overlay,
        syntaxGradient: {
          enabled: settings.syntaxGradient.enabled,
          customRules: settings.syntaxGradient.customRules.length,
        },
        glow: {
          enabled: settings.glow.enabled,
          intensity: settings.glow.intensity,
          customRules: settings.glow.customRules.length,
        },
        cursor: { ...settings.cursor, customRules: settings.cursor.customRules.length },
        glass: settings.glass,
        runtime: settings.runtime,
      },
      null,
      2
    ),
    '```'
  );

  if (input.recentLog.length > 0) {
    lines.push('', '### 最近日志', '', '```text', ...input.recentLog, '```');
  }

  return `${lines.join('\n')}\n`;
}
