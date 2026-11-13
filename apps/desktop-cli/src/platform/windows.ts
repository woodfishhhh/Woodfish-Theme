import { spawnSync } from 'child_process';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  PowerShellRunner,
  encodeCommand,
  psQuote,
  runPowerShell,
  runPowerShellJson,
} from './powershell';
import {
  AutostartCommand,
  CodexInstallation,
  CodexPlatform,
  CodexProcess,
  CodexRuntimeState,
  PlatformError,
} from './types';

/** Store package names, most preferred first. */
export const CODEX_PACKAGE_NAMES = ['OpenAI.Codex', 'OpenAI.CodexBeta', 'OpenAI.ChatGPT-Desktop'];

interface AppxRecord {
  Name: string;
  PackageFamilyName: string;
  Version: string;
  InstallLocation: string;
}

interface ProcessRecord {
  ProcessId: number;
  ExecutablePath: string | null;
  CommandLine: string | null;
  AgeSeconds?: number | null;
}

/** Task Scheduler location of the logon task `woodfish codex autostart` registers. */
export const AUTOSTART_TASK_PATH = '\\Woodfish\\';
export const AUTOSTART_TASK_NAME = 'Woodfish Codex';

function asArray<T>(value: T | T[] | null): T[] {
  if (value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function compareVersions(left: string, right: string): number {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

/** Picks the preferred package: by name preference, then the newest version. */
export function pickInstallation(records: readonly AppxRecord[]): CodexInstallation | null {
  const sorted = [...records]
    .filter((record) => CODEX_PACKAGE_NAMES.includes(record.Name) && record.InstallLocation)
    .sort(
      (left, right) =>
        CODEX_PACKAGE_NAMES.indexOf(left.Name) - CODEX_PACKAGE_NAMES.indexOf(right.Name) ||
        compareVersions(right.Version, left.Version)
    );
  const record = sorted[0];
  if (!record) {
    return null;
  }
  return {
    name: record.Name,
    familyName: record.PackageFamilyName,
    version: record.Version,
    installLocation: record.InstallLocation,
    executable: path.win32.join(record.InstallLocation, 'app', 'ChatGPT.exe'),
    appId: 'App',
  };
}

const DEBUG_PORT_ARGUMENT = /--remote-debugging-port=(\d{2,5})(?:\s|"|$)/;

/** Splits Codex processes into the main process and helpers; reads its debugging port. */
export function summarizeProcesses(
  installation: CodexInstallation,
  records: readonly ProcessRecord[]
): CodexRuntimeState {
  const prefix = installation.installLocation.toLowerCase();
  const own = records.filter(
    (record) => record.ExecutablePath && record.ExecutablePath.toLowerCase().startsWith(prefix)
  );
  const mainRecord = own.find((record) => !(record.CommandLine ?? '').includes('--type='));
  const main: CodexProcess | null = mainRecord
    ? {
        pid: mainRecord.ProcessId,
        commandLine: mainRecord.CommandLine ?? '',
        ageSeconds: typeof mainRecord.AgeSeconds === 'number' ? mainRecord.AgeSeconds : null,
      }
    : null;
  const match = main ? DEBUG_PORT_ARGUMENT.exec(main.commandLine) : null;
  const port = match ? Number(match[1]) : null;
  return {
    main,
    processCount: own.length,
    debugPort: port !== null && port > 0 && port < 65536 ? port : null,
  };
}

/** Characters cmd.exe would interpret; a Store install path never contains them. */
const UNSAFE_CMD_CHARACTERS = /["%^&|<>!\r\n]/;

/** The wrapper Invoke-CommandInDesktopPackage runs inside the package context. */
export function buildLaunchWrapper(executable: string, port: number): string {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new PlatformError(`端口无效：${port}`);
  }
  if (UNSAFE_CMD_CHARACTERS.test(executable) || !/^[A-Za-z]:\\/.test(executable)) {
    throw new PlatformError(`Codex 路径包含不安全的字符，已拒绝启动：${executable}`);
  }
  return [
    '@echo off',
    `start "" /b "${executable}" --remote-debugging-port=${port} --remote-allow-origins=http://127.0.0.1:${port}`,
    '',
  ].join('\r\n');
}

/** PowerShell that runs the wrapper inside the package so Codex keeps its identity. */
export function buildLaunchScript(installation: CodexInstallation, wrapperPath: string): string {
  if (UNSAFE_CMD_CHARACTERS.test(wrapperPath)) {
    throw new PlatformError(`临时脚本路径包含不安全的字符：${wrapperPath}`);
  }
  return [
    'Invoke-CommandInDesktopPackage',
    `  -PackageFamilyName ${psQuote(installation.familyName)}`,
    `  -AppId ${psQuote(installation.appId)}`,
    "  -Command 'cmd.exe'",
    `  -Args ${psQuote(`/d /c "${wrapperPath}"`)}`,
    '  -PreventBreakaway',
  ].join(' `\n');
}

/**
 * A batch file that runs `script` with PowerShell. Opened through `explorer.exe`, it runs in
 * the desktop shell's (non-elevated) context: started from an elevated shell, Store Codex
 * does not reliably come up with the extra arguments.
 */
export function buildDeelevatedRelay(script: string): string {
  return [
    '@echo off',
    `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand ${encodeCommand(script)}`,
    '',
  ].join('\r\n');
}

/** The logon task's argument string; every part is quoted for the task's command line. */
export function buildAutostartArguments(args: readonly string[]): string {
  for (const arg of args) {
    if (arg.includes('"') || /[\r\n]/.test(arg)) {
      throw new PlatformError(`自启命令包含不安全的字符：${arg}`);
    }
  }
  return args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(' ');
}

/** PowerShell that registers and starts the logon task (normal rights, interactive session). */
export function buildAutostartScript(command: AutostartCommand): string {
  return [
    `$action = New-ScheduledTaskAction -Execute ${psQuote(command.execute)} -Argument ${psQuote(buildAutostartArguments(command.args))}`,
    '$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name',
    '$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user',
    '$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited',
    '$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)',
    `Register-ScheduledTask -TaskPath ${psQuote(AUTOSTART_TASK_PATH)} -TaskName ${psQuote(AUTOSTART_TASK_NAME)} -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description ${psQuote('Woodfish：让 Codex 桌面端的配色与效果在重启、更新后自动恢复')} -Force | Out-Null`,
    `Start-ScheduledTask -TaskPath ${psQuote(AUTOSTART_TASK_PATH)} -TaskName ${psQuote(AUTOSTART_TASK_NAME)}`,
  ].join('\n');
}

export interface WindowsPlatformOptions {
  runner?: PowerShellRunner;
  runtimeDir: string;
}

export function createWindowsPlatform(options: WindowsPlatformOptions): CodexPlatform {
  const runner = options.runner ?? runPowerShell;

  return {
    name: 'windows',

    discover(): CodexInstallation | null {
      const names = CODEX_PACKAGE_NAMES.map(psQuote).join(',');
      const records = runPowerShellJson<AppxRecord | AppxRecord[]>(
        runner,
        [
          `$packages = @(${names} | ForEach-Object { Get-AppxPackage -Name $_ })`,
          "$packages | Select-Object Name, PackageFamilyName, @{n='Version';e={$_.Version.ToString()}}, InstallLocation | ConvertTo-Json -Compress",
        ].join('\n')
      );
      return pickInstallation(asArray(records));
    },

    inspect(installation: CodexInstallation): CodexRuntimeState {
      const records = runPowerShellJson<ProcessRecord | ProcessRecord[]>(
        runner,
        "Get-CimInstance Win32_Process -Filter \"Name='ChatGPT.exe'\" | Select-Object ProcessId, ExecutablePath, CommandLine, @{n='AgeSeconds';e={[int]((Get-Date) - $_.CreationDate).TotalSeconds}} | ConvertTo-Json -Compress"
      );
      return summarizeProcesses(installation, asArray(records));
    },

    isRunning(): boolean {
      const result = spawnSync(
        'tasklist.exe',
        ['/FI', 'IMAGENAME eq ChatGPT.exe', '/NH', '/FO', 'CSV'],
        { encoding: 'utf8', windowsHide: true, timeout: 10000 }
      );
      return /"ChatGPT\.exe"/i.test(result.stdout ?? '');
    },

    launchWithPort(installation: CodexInstallation, port: number): void {
      const runDir = path.join(options.runtimeDir, 'run');
      fs.mkdirSync(runDir, { recursive: true });
      const id = randomBytes(8).toString('hex');
      const wrapperPath = path.join(runDir, `launch-${id}.cmd`);
      const relayPath = path.join(runDir, `relay-${id}.cmd`);
      fs.writeFileSync(wrapperPath, buildLaunchWrapper(installation.executable, port), 'ascii');
      const script = buildLaunchScript(installation, wrapperPath);
      try {
        if (this.isElevated()) {
          fs.writeFileSync(relayPath, buildDeelevatedRelay(script), 'ascii');
          runner(
            `Start-Process -FilePath 'explorer.exe' -ArgumentList ${psQuote(`"${relayPath}"`)}`
          );
        } else {
          runner(script);
        }
      } finally {
        // The relay and cmd.exe read their scripts within seconds; the caller waits longer.
        setTimeout(() => {
          fs.rmSync(wrapperPath, { force: true });
          fs.rmSync(relayPath, { force: true });
        }, 20000).unref();
      }
    },

    launchNormal(installation: CodexInstallation): void {
      runner(
        `Start-Process -FilePath 'explorer.exe' -ArgumentList ${psQuote(
          `shell:AppsFolder\\${installation.familyName}!${installation.appId}`
        )}`
      );
    },

    stop(_installation: CodexInstallation, state: CodexRuntimeState): void {
      if (!state.main) {
        return;
      }
      // taskkill reports failure when some child already exited. Run it through cmd.exe so
      // Windows PowerShell 5.1 (ErrorActionPreference Stop) never sees its stderr; whether
      // Codex is really gone is checked by the caller, which waits for the main process.
      runner(`& cmd.exe /d /c "taskkill /PID ${state.main.pid} /T /F >nul 2>nul"; exit 0`);
    },

    isElevated(): boolean {
      const output = runner(
        '([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'
      );
      return output.toLowerCase() === 'true';
    },

    createShortcut(name: string, target: string, args: readonly string[]): string {
      const quotedArgs = args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(' ');
      const output = runner(
        [
          "$programs = [Environment]::GetFolderPath('Programs')",
          `$link = Join-Path $programs ${psQuote(`${name}.lnk`)}`,
          '$shell = New-Object -ComObject WScript.Shell',
          '$shortcut = $shell.CreateShortcut($link)',
          `$shortcut.TargetPath = ${psQuote(target)}`,
          `$shortcut.Arguments = ${psQuote(quotedArgs)}`,
          '$shortcut.WindowStyle = 7',
          `$shortcut.Description = ${psQuote('用 Woodfish 效果启动 Codex')}`,
          '$shortcut.Save()',
          'Write-Output $link',
        ].join('\n')
      );
      return output;
    },

    installAutostart(command: AutostartCommand): void {
      runner(buildAutostartScript(command));
    },

    removeAutostart(): boolean {
      const output = runner(
        [
          `$task = Get-ScheduledTask -TaskPath ${psQuote(AUTOSTART_TASK_PATH)} -TaskName ${psQuote(AUTOSTART_TASK_NAME)} -ErrorAction SilentlyContinue`,
          'if ($task) {',
          '  $task | Stop-ScheduledTask -ErrorAction SilentlyContinue',
          '  $task | Unregister-ScheduledTask -Confirm:$false',
          "  'removed'",
          '}',
          // Leave nothing behind: drop the Woodfish folder once it is empty.
          '$service = New-Object -ComObject Schedule.Service',
          '$service.Connect()',
          "try { $service.GetFolder('\\').DeleteFolder('Woodfish', 0) } catch { }",
          // A missing task leaves $? false, which would turn into exit code 1.
          'exit 0',
        ].join('\n')
      );
      return output.includes('removed');
    },

    readAutostart(): string | null {
      const output = runner(
        [
          `$task = Get-ScheduledTask -TaskPath ${psQuote(AUTOSTART_TASK_PATH)} -TaskName ${psQuote(AUTOSTART_TASK_NAME)} -ErrorAction SilentlyContinue`,
          'if ($task) { $task.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" } }',
          'exit 0',
        ].join('\n')
      );
      return output === '' ? null : output;
    },
  };
}
