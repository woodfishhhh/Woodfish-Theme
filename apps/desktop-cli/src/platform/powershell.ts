import { spawnSync } from 'child_process';
import { PlatformError } from './types';

/** Wraps a script so its output is UTF-8 and errors stop it. */
export function prepareScript(script: string): string {
  return [
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference = 'SilentlyContinue'",
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '$OutputEncoding = [System.Text.Encoding]::UTF8',
    script,
  ].join('\n');
}

/** PowerShell's -EncodedCommand takes Base64 of UTF-16LE. */
export function encodeCommand(script: string): string {
  return Buffer.from(prepareScript(script), 'utf16le').toString('base64');
}

/** Quotes a value as a PowerShell single-quoted literal. */
export function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export type PowerShellRunner = (script: string, timeoutMs?: number) => string;

/** Runs a script with Windows PowerShell and returns trimmed stdout. */
export const runPowerShell: PowerShellRunner = (script, timeoutMs = 30000) => {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-EncodedCommand',
      encodeCommand(script),
    ],
    { encoding: 'utf8', timeout: timeoutMs, windowsHide: true }
  );
  if (result.error) {
    throw new PlatformError(`无法运行 PowerShell：${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '')
      .trim()
      .split(/\r?\n/)
      .slice(0, 4)
      .join(' ');
    throw new PlatformError(`PowerShell 执行失败（退出码 ${result.status}）：${detail}`);
  }
  return result.stdout.trim();
};

/** Runs a script that prints JSON (`ConvertTo-Json`) and parses it; empty output is null. */
export function runPowerShellJson<T>(runner: PowerShellRunner, script: string): T | null {
  const output = runner(script);
  if (output === '') {
    return null;
  }
  try {
    return JSON.parse(output) as T;
  } catch {
    throw new PlatformError(`PowerShell 输出不是 JSON：${output.slice(0, 200)}`);
  }
}
