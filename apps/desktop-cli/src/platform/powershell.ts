import { spawnSync } from 'child_process';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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

/**
 * Runs a script with Windows PowerShell and returns trimmed stdout. The script goes through
 * a temporary file, not -EncodedCommand: Windows Defender holds encoded PowerShell that an
 * unsigned program starts (the single-file woodfish.exe) for 30 s and longer, measured
 * 2026-11-14. The file is UTF-8 with a BOM, which Windows PowerShell 5.1 needs for Chinese.
 */
export const runPowerShell: PowerShellRunner = (script, timeoutMs = 30000) => {
  const file = path.join(
    os.tmpdir(),
    `woodfish-${process.pid}-${randomBytes(6).toString('hex')}.ps1`
  );
  fs.writeFileSync(file, `\uFEFF${prepareScript(script)}`, { encoding: 'utf8', flag: 'wx' });
  let result;
  try {
    result = spawnSync(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file],
      { encoding: 'utf8', timeout: timeoutMs, windowsHide: true }
    );
  } finally {
    fs.rmSync(file, { force: true });
  }
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
