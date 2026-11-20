import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { prepareScript, psQuote, runPowerShell, runPowerShellJson } from '../platform/powershell';
import {
  buildAutostartArguments,
  buildAutostartScript,
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

const store = {
  Name: installation.name,
  PackageFamilyName: installation.familyName,
  Version: installation.version,
  InstallLocation: INSTALL,
  Executable: 'app/ChatGPT.exe',
  AppId: 'App',
};
const offline = {
  ...store,
  Version: '26.1111.2228.0',
  InstallLocation: String.raw`D:\WindowsApps\OpenAI.Codex_26.1111.2228.0_arm64__2p2nqsd0c76g0`,
};
const classic = {
  ...store,
  Name: 'OpenAI.ChatGPT-Desktop',
  PackageFamilyName: 'OpenAI.ChatGPT-Desktop_2p2nqsd0c76g0',
  Executable: null,
  AppId: null,
};

describe('PowerShell helpers', () => {
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
  it('prefers stable Codex, then the newest version, regardless of the install drive', () => {
    const beta = {
      ...offline,
      Name: 'OpenAI.CodexBeta',
      PackageFamilyName: 'OpenAI.CodexBeta_2p2nqsd0c76g0',
      Version: '27.0.0.0',
    };
    const picked = pickInstallation([classic, beta, store, offline]).installation;
    expect(picked?.name).toBe('OpenAI.Codex');
    expect(picked?.version).toBe(offline.Version);
    expect(picked?.executable).toBe(`${offline.InstallLocation}\\app\\ChatGPT.exe`);
    expect(pickInstallation([{ ...offline, AppId: null }, store]).installation).toEqual(
      installation
    );
  });

  it('distinguishes Classic, unregistered apps, and packages with no supported entry or publisher', () => {
    expect(pickInstallation([classic]).problem).toContain('ChatGPT Classic');
    expect(pickInstallation([]).problem).toContain('未注册');
    expect(pickInstallation([{ ...store, Executable: null }]).problem).toContain('缺少可启动');
    expect(
      pickInstallation([{ ...store, PackageFamilyName: 'OpenAI.Codex_other' }]).problem
    ).toContain('不是受支持');
  });

  it('queries current-user Appx registration and uses the manifest entry', () => {
    const scripts: string[] = [];
    const platform = createWindowsPlatform({
      runtimeDir: 'C:\\tmp',
      runner: (script) => {
        scripts.push(script);
        return JSON.stringify({
          ...offline,
          AppId: 'ActualEntry',
          Executable: 'desktop/ChatGPT.exe',
        });
      },
    });
    expect(platform.discover().installation).toMatchObject({
      appId: 'ActualEntry',
      executable: `${offline.InstallLocation}\\desktop\\ChatGPT.exe`,
    });
    expect(scripts[0]).toContain('ForEach-Object { Get-AppxPackage -Name $_ }');
    expect(scripts[0]).toContain('Get-AppxPackageManifest');
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
      {
        ProcessId: 13,
        ExecutablePath: `${INSTALL}-other\\app\\ChatGPT.exe`,
        CommandLine: 'ChatGPT.exe',
      },
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

describe('launching from an elevated shell', () => {
  const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-relay-'));
  afterAll(() => fs.rmSync(runtimeDir, { recursive: true, force: true }));

  it('hands the package launch to the desktop shell through a relay', () => {
    const scripts: string[] = [];
    const platform = createWindowsPlatform({
      runtimeDir,
      runner: (script) => {
        scripts.push(script);
        return script.includes('IsInRole') ? 'True' : '';
      },
    });
    platform.launchWithPort(installation, 24680);
    expect(scripts.some((script) => script.includes('Invoke-CommandInDesktopPackage'))).toBe(false);
    const relayCall = scripts.find((script) => script.includes("-FilePath 'explorer.exe'"));
    expect(relayCall).toMatch(/relay-[0-9a-f]{16}\.cmd/);
    const run = path.join(runtimeDir, 'run');
    const batch =
      fs.readdirSync(run).find((file) => file.startsWith('relay-') && file.endsWith('.cmd')) ?? '';
    const relay = fs.readFileSync(path.join(run, batch), 'ascii');
    expect(relay).toContain('-WindowStyle Hidden -File "%~dpn0.ps1"');
    expect(relay).not.toContain('-EncodedCommand');
    const script = fs.readFileSync(path.join(run, batch.replace(/\.cmd$/, '.ps1')), 'utf8');
    expect(script.startsWith('\uFEFF')).toBe(true);
    expect(script).toContain('Invoke-CommandInDesktopPackage');
  });
});

describe('autostart task', () => {
  it('quotes paths with spaces and refuses quotes or line breaks', () => {
    expect(
      buildAutostartArguments(['--headless', String.raw`C:\Program Files\n.exe`, 'codex'])
    ).toBe(String.raw`--headless "C:\Program Files\n.exe" codex`);
    expect(() => buildAutostartArguments(['a"b'])).toThrow('不安全');
    expect(() => buildAutostartArguments(['a\nb'])).toThrow('不安全');
  });

  it('runs at logon for the current user with normal rights and no time limit', () => {
    const script = buildAutostartScript({ execute: 'conhost.exe', args: ['--headless', 'node'] });
    expect(script).toContain('-AtLogOn -User $user');
    expect(script).toContain('-LogonType Interactive -RunLevel Limited');
    expect(script).toContain('-ExecutionTimeLimit ([TimeSpan]::Zero)');
    expect(script).toContain("-TaskPath '\\Woodfish\\' -TaskName 'Woodfish Codex'");
    expect(script).toContain('Start-ScheduledTask');
  });

  it('reads the age of the Codex main process', () => {
    const state = summarizeProcesses(installation, [
      {
        ProcessId: 10,
        ExecutablePath: `${INSTALL}\\app\\ChatGPT.exe`,
        CommandLine: '"ChatGPT.exe"',
        AgeSeconds: 12,
      },
    ]);
    expect(state.main?.ageSeconds).toBe(12);
  });
});

describe('stopping', () => {
  it('ends Codex without a PowerShell round trip and asks about elevation once', () => {
    const scripts: string[] = [];
    const platform = createWindowsPlatform({
      runtimeDir: String.raw`C:\tmp`,
      runner: (script) => {
        scripts.push(script);
        return '';
      },
    });
    platform.stop(installation, {
      main: { pid: 42, commandLine: '', ageSeconds: null },
      processCount: 3,
      debugPort: null,
    });
    expect(scripts).toEqual([]);
    platform.isElevated();
    platform.isElevated();
    expect(scripts).toHaveLength(1);
  });
});

describe('launching', () => {
  it.each([
    ['Store', store],
    ['offline MSIX', offline],
  ])('%s uses the registered entry and the same profile', (_channel, record) => {
    const installed = pickInstallation([record]).installation;
    if (!installed) throw new Error('expected an installation');
    const script = buildLaunchScript(installed, String.raw`C:\run\launch-ab.cmd`);
    expect(script).toContain(`-PackageFamilyName '${record.PackageFamilyName}'`);
    expect(script).toContain("-AppId 'App'");
    expect(buildLaunchWrapper(installed.executable, 24680)).toContain(
      `"${installed.executable}" --remote-debugging-port=24680 --remote-allow-origins=http://127.0.0.1:24680`
    );
    const runner = jest.fn(() => '');
    const platform = createWindowsPlatform({
      runtimeDir: String.raw`C:\run`,
      localAppData: String.raw`C:\Users\me\AppData\Local`,
      runner,
    });
    platform.launchNormal(installed);
    expect(runner).toHaveBeenCalledWith(
      `Start-Process -FilePath 'explorer.exe' -ArgumentList 'shell:AppsFolder\\${record.PackageFamilyName}!App'`
    );
    expect(platform.userDataDir(installed)).toBe(
      String.raw`C:\Users\me\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Codex`
    );
  });

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
          return JSON.stringify(store);
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
      main: { pid: 42, commandLine: '', ageSeconds: null },
      processCount: 1,
      debugPort: null,
    });
    platform.createShortcut('Woodfish Codex', String.raw`C:\node.exe`, [
      String.raw`C:\w f\woodfish.js`,
      'codex',
      'launch',
    ]);
    platform.installAutostart({
      execute: 'conhost.exe',
      args: ['--headless', String.raw`C:\Program Files\nodejs\node.exe`, 'codex', 'daemon'],
    });
    platform.removeShortcut('Woodfish Codex');
    platform.removeAutostart();
    platform.readAutostart();
    scripts.push(
      buildLaunchScript(
        installation,
        String.raw`C:\Users\me\AppData\Local\Woodfish\run\launch-ab.cmd`
      )
    );
    expect(scripts.length).toBe(10);
    for (const script of scripts) {
      expect({ script, errors: parseErrors(prepareScript(script)) }).toEqual({
        script,
        errors: [],
      });
    }
  });
});

onWindows('stopping a real process tree', () => {
  it('ends the tree without a terminating error, even when run twice', async () => {
    const child = spawn('cmd.exe', ['/d', '/c', 'ping -n 30 127.0.0.1 >nul'], {
      windowsHide: true,
      stdio: 'ignore',
    });
    const pid = child.pid ?? 0;
    const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    const platform = createWindowsPlatform({ runtimeDir: String.raw`C:\tmp` });
    const state = {
      main: { pid, commandLine: '', ageSeconds: null },
      processCount: 2,
      debugPort: null,
    };
    expect(() => platform.stop(installation, state)).not.toThrow();
    await exited;
    expect(() => platform.stop(installation, state)).not.toThrow();
  });
});
