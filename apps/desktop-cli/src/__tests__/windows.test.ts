import { decodeCommand } from './helpers/powershell';
import {
  encodeCommand,
  prepareScript,
  psQuote,
  runPowerShell,
  runPowerShellJson,
} from '../platform/powershell';
import {
  buildLaunchScript,
  buildLaunchWrapper,
  createWindowsPlatform,
  pickInstallation,
  summarizeProcesses,
} from '../platform/windows';

const INSTALL = 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.1013.3656.0_x64__2p2nqsd0c76g0';
const installation = {
  name: 'OpenAI.Codex',
  familyName: 'OpenAI.Codex_2p2nqsd0c76g0',
  version: '26.1013.3656.0',
  installLocation: INSTALL,
  executable: `${INSTALL}\\app\\ChatGPT.exe`,
  appId: 'App',
};

describe('PowerShell helpers', () => {
  it('encodes scripts as UTF-16LE Base64 with UTF-8 output and silent progress', () => {
    const decoded = decodeCommand(encodeCommand("Write-Output '中文'"));
    expect(decoded).toBe(prepareScript("Write-Output '中文'"));
    expect(decoded).toContain("$ProgressPreference = 'SilentlyContinue'");
    expect(decoded).toContain('[Console]::OutputEncoding = [System.Text.Encoding]::UTF8');
  });

  it('quotes single-quoted literals', () => {
    expect(psQuote("it's")).toBe("'it''s'");
  });

  it('parses JSON output and treats empty output as null', () => {
    expect(runPowerShellJson(() => '{"a":1}', 'x')).toEqual({ a: 1 });
    expect(runPowerShellJson(() => '', 'x')).toBeNull();
    expect(() => runPowerShellJson(() => 'oops', 'x')).toThrow('不是 JSON');
  });
});

describe('package discovery', () => {
  it('prefers OpenAI.Codex, then the newest version', () => {
    const picked = pickInstallation([
      {
        Name: 'OpenAI.ChatGPT-Desktop',
        PackageFamilyName: 'c',
        Version: '9.0.0.0',
        InstallLocation: 'C:\\c',
      },
      {
        Name: 'OpenAI.Codex',
        PackageFamilyName: 'a',
        Version: '26.1013.3656.0',
        InstallLocation: 'C:\\a',
      },
      {
        Name: 'OpenAI.Codex',
        PackageFamilyName: 'a2',
        Version: '26.1100.1.0',
        InstallLocation: 'C:\\a2',
      },
    ]);
    expect(picked?.familyName).toBe('a2');
    expect(picked?.executable).toBe('C:\\a2\\app\\ChatGPT.exe');
    expect(pickInstallation([])).toBeNull();
  });

  it('runs Get-AppxPackage once per package name', () => {
    const scripts: string[] = [];
    const platform = createWindowsPlatform({
      runtimeDir: 'C:\\tmp',
      runner: (script) => {
        scripts.push(script);
        return JSON.stringify({
          Name: 'OpenAI.Codex',
          PackageFamilyName: installation.familyName,
          Version: installation.version,
          InstallLocation: INSTALL,
        });
      },
    });
    expect(platform.discover()?.familyName).toBe(installation.familyName);
    expect(scripts[0]).toContain('ForEach-Object { Get-AppxPackage -Name $_ }');
  });
});

describe('process inspection', () => {
  it('finds the main process and its debugging port, ignoring other apps', () => {
    const state = summarizeProcesses(installation, [
      {
        ProcessId: 10,
        ExecutablePath: installation.executable,
        CommandLine: `"${installation.executable}" --remote-debugging-port=24680 --remote-allow-origins=http://127.0.0.1:24680`,
      },
      {
        ProcessId: 11,
        ExecutablePath: installation.executable,
        CommandLine: `"${installation.executable}" --type=renderer`,
      },
      { ProcessId: 12, ExecutablePath: 'C:\\Other\\ChatGPT.exe', CommandLine: 'ChatGPT.exe' },
    ]);
    expect(state.main?.pid).toBe(10);
    expect(state.processCount).toBe(2);
    expect(state.debugPort).toBe(24680);
  });

  it('reports no port for a normal launch', () => {
    const state = summarizeProcesses(installation, [
      {
        ProcessId: 10,
        ExecutablePath: installation.executable,
        CommandLine: `"${installation.executable}"`,
      },
    ]);
    expect(state.debugPort).toBeNull();
  });
});

describe('stopping', () => {
  it('ignores taskkill errors for children that already exited', () => {
    const scripts: string[] = [];
    const platform = createWindowsPlatform({
      runtimeDir: String.raw`C:\tmp`,
      runner: (script) => {
        scripts.push(script);
        return '';
      },
    });
    platform.stop(installation, {
      main: { pid: 42, commandLine: '' },
      processCount: 3,
      debugPort: null,
    });
    expect(scripts[0]).toContain('taskkill.exe /PID 42 /T /F');
    expect(scripts[0]).toContain('exit 0');
  });
});

describe('launching', () => {
  it('writes a wrapper that binds the port to loopback origins only', () => {
    expect(buildLaunchWrapper(installation.executable, 24680)).toBe(
      `@echo off\r\nstart "" /b "${installation.executable}" --remote-debugging-port=24680 --remote-allow-origins=http://127.0.0.1:24680\r\n`
    );
  });

  it('rejects unsafe paths and ports', () => {
    expect(() => buildLaunchWrapper('C:\\a&calc\\ChatGPT.exe', 24680)).toThrow('不安全');
    expect(() => buildLaunchWrapper('\\\\server\\share\\ChatGPT.exe', 24680)).toThrow('不安全');
    expect(() => buildLaunchWrapper(installation.executable, 80)).toThrow('端口无效');
    expect(() => buildLaunchWrapper(installation.executable, 1.5)).toThrow('端口无效');
  });

  it('runs the wrapper inside the package with breakaway prevented', () => {
    const script = buildLaunchScript(
      installation,
      'C:\\Users\\me\\AppData\\Local\\Woodfish\\run\\launch-ab.cmd'
    );
    expect(script).toContain("-PackageFamilyName 'OpenAI.Codex_2p2nqsd0c76g0'");
    expect(script).toContain("-AppId 'App'");
    expect(script).toContain(
      '-Args \'/d /c "C:\\Users\\me\\AppData\\Local\\Woodfish\\run\\launch-ab.cmd"\''
    );
    expect(script).toContain('-PreventBreakaway');
  });
});

const onWindows = process.platform === 'win32' ? describe : describe.skip;

onWindows('generated PowerShell is syntactically valid', () => {
  function parseErrors(script: string): string[] {
    const check = [
      '$errors = $null',
      '$tokens = $null',
      `$null = [System.Management.Automation.Language.Parser]::ParseInput([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${psQuote(
        Buffer.from(script, 'utf8').toString('base64')
      )})), [ref]$tokens, [ref]$errors)`,
      '$errors | ForEach-Object { $_.Message } | ConvertTo-Json -Compress',
    ].join('\n');
    const output = runPowerShell(check);
    if (output === '') {
      return [];
    }
    const parsed = JSON.parse(output) as string | string[];
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  it('parses every script the Windows platform runs', () => {
    const scripts: string[] = [];
    const platform = createWindowsPlatform({
      runtimeDir: String.raw`C:\tmp`,
      runner: (script) => {
        scripts.push(script);
        if (script.includes('Get-AppxPackage')) {
          return JSON.stringify({
            Name: 'OpenAI.Codex',
            PackageFamilyName: installation.familyName,
            Version: installation.version,
            InstallLocation: INSTALL,
          });
        }
        if (script.includes('IsInRole')) {
          return 'False';
        }
        return '';
      },
    });
    platform.discover();
    platform.inspect(installation);
    platform.isElevated();
    platform.launchNormal(installation);
    platform.stop(installation, {
      main: { pid: 42, commandLine: '' },
      processCount: 1,
      debugPort: null,
    });
    platform.createShortcut('Woodfish Codex', String.raw`C:\node.exe`, [
      String.raw`C:\w f\woodfish.js`,
      'codex',
      'launch',
    ]);
    scripts.push(
      buildLaunchScript(
        installation,
        String.raw`C:\Users\me\AppData\Local\Woodfish\run\launch-ab.cmd`
      )
    );
    expect(scripts.length).toBe(7);
    for (const script of scripts) {
      expect({ script, errors: parseErrors(prepareScript(script)) }).toEqual({
        script,
        errors: [],
      });
    }
  });
});
