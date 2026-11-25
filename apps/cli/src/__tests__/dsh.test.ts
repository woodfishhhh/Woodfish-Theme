import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DSH_PLUGIN_NAME } from '@woodfish/dsh-web';
import { Io } from '../cli/io';
import { run } from '../cli';
import { CommandContext } from '../commands/context';
import { dshInstallCommand, dshStatusCommand, dshUninstallCommand } from '../commands/dsh';
import {
  DshCommandRunner,
  defaultDshRunner,
  readDshCmdShim,
  readDshProfileStatus,
  resolveDshProfileDir,
  stagedDshPluginDir,
} from '../dsh/plugin';
import { resolvePaths } from '../paths';

function memoryIo(): Io & { output: string[] } {
  const output: string[] = [];
  return {
    output,
    interactive: false,
    out: (message) => output.push(message),
    err: (message) => output.push(`ERR ${message}`),
    ask: async () => '',
  };
}

let sandbox: string;
let paths: ReturnType<typeof resolvePaths>;
let fakeDshBin: string;
let dshHome: string;
let env: NodeJS.ProcessEnv;

function makeContext(io: Io): CommandContext {
  return {
    paths,
    io,
    platform: () => {
      throw new Error('not used');
    },
    cliPath: '',
    nodePath: process.execPath,
    electronRunAsNode: false,
  };
}

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-dsh-cli-'));
  paths = resolvePaths({
    WOODFISH_DATA_DIR: path.join(sandbox, 'data'),
    WOODFISH_RUNTIME_DIR: path.join(sandbox, 'run'),
  });
  dshHome = path.join(sandbox, 'dsh-home');
  fakeDshBin = path.join(sandbox, 'dsh');
  fs.writeFileSync(fakeDshBin, 'fake');
  env = { ...process.env, DSH_HOME: dshHome, DSH_BIN: fakeDshBin };
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('woodfish dsh native plugin commands', () => {
  it('installs the staged native plugin into a profile, checks status, and uninstalls cleanly', () => {
    const io = memoryIo();
    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const runDsh: DshCommandRunner = (command, args) => {
      calls.push({ command, args });
      const profile = args[2];
      const action = args[3];
      const profileDir = resolveDshProfileDir(profile, env);
      fs.mkdirSync(path.join(profileDir, 'node_modules', DSH_PLUGIN_NAME), { recursive: true });
      if (action === 'add') {
        fs.writeFileSync(
          path.join(profileDir, 'package.json'),
          JSON.stringify({
            dependencies: { [DSH_PLUGIN_NAME]: `file:${args[4]}` },
            dsh: { profile: { bundles: [DSH_PLUGIN_NAME] } },
          })
        );
        fs.cpSync(args[4], path.join(profileDir, 'node_modules', DSH_PLUGIN_NAME), {
          recursive: true,
        });
      } else if (action === 'remove') {
        fs.writeFileSync(
          path.join(profileDir, 'package.json'),
          JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: [] } } })
        );
      }
      return { status: 0, stdout: 'ok', stderr: '' };
    };

    // Plant legacy user script files to confirm cleanup.
    fs.mkdirSync(paths.dataDir, { recursive: true });
    fs.writeFileSync(path.join(paths.dataDir, 'woodfish-dsh.user.js'), 'old');
    fs.writeFileSync(path.join(paths.dataDir, 'dsh.json'), '{}');

    expect(dshInstallCommand(makeContext(io), { profile: 'web' }, { env, runDsh })).toBe(0);
    expect(calls[0]).toEqual({
      command: fakeDshBin,
      args: ['plugin', '--profile', 'web', 'add', stagedDshPluginDir(paths)],
    });
    expect(fs.existsSync(path.join(stagedDshPluginDir(paths), 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(stagedDshPluginDir(paths), 'lib', 'client.js'))).toBe(true);
    expect(fs.existsSync(path.join(paths.dataDir, 'woodfish-dsh.user.js'))).toBe(false);
    expect(fs.existsSync(path.join(paths.dataDir, 'dsh.json'))).toBe(false);

    const statusIo = memoryIo();
    expect(dshStatusCommand(makeContext(statusIo), { profile: 'web', json: true }, { env })).toBe(
      0
    );
    const parsed = JSON.parse(statusIo.output.join('\n')) as ReturnType<
      typeof readDshProfileStatus
    >;
    expect(parsed.installed).toBe(true);
    expect(parsed.enabled).toBe(true);
    expect(parsed.version).toBe('8.2.3');

    const uninstallIo = memoryIo();
    expect(dshUninstallCommand(makeContext(uninstallIo), { profile: 'web' }, { env, runDsh })).toBe(
      0
    );
    expect(calls[1]).toEqual({
      command: fakeDshBin,
      args: ['plugin', '--profile', 'web', 'remove', DSH_PLUGIN_NAME],
    });
    expect(readDshProfileStatus('web', env).installed).toBe(false);
  });

  it('supports desktop profile and custom --package specs', () => {
    const io = memoryIo();
    const calls: Array<readonly string[]> = [];
    const runDsh: DshCommandRunner = (_command, args) => {
      calls.push(args);
      return { status: 0, stdout: '', stderr: '' };
    };
    expect(
      dshInstallCommand(
        makeContext(io),
        { profile: 'desktop', packageSpec: 'woodfish-dsh-plugin@latest' },
        { env, runDsh }
      )
    ).toBe(0);
    expect(calls[0]).toEqual([
      'plugin',
      '--profile',
      'desktop',
      'add',
      'woodfish-dsh-plugin@latest',
    ]);
  });

  it('distinguishes a declared but missing or broken plugin package', () => {
    const profileDir = resolveDshProfileDir('web', env);
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, 'package.json'),
      JSON.stringify({ dependencies: { [DSH_PLUGIN_NAME]: 'file:plugin' } })
    );
    const missing = readDshProfileStatus('web', env);
    expect(missing.installed).toBe(false);
    expect(missing.dependencyDeclared).toBe(true);
    expect(missing.packagePresent).toBe(false);
    expect(missing.broken).toBe(true);

    const brokenDir = path.join(profileDir, 'node_modules', DSH_PLUGIN_NAME);
    fs.mkdirSync(brokenDir, { recursive: true });
    fs.writeFileSync(path.join(brokenDir, 'package.json'), '{broken');
    const broken = readDshProfileStatus('web', env);
    expect(broken.installed).toBe(false);
    expect(broken.packagePresent).toBe(false);
    expect(broken.broken).toBe(true);

    const io = memoryIo();
    expect(dshStatusCommand(makeContext(io), { profile: 'web', json: false }, { env })).toBe(0);
    expect(io.output.join('\n')).toContain('已声明依赖，但实际包缺失或损坏');
  });

  it.each(['npm', 'pnpm/corepack'])('resolves a standard %s Node shim', (kind) => {
    const shim = path.join(sandbox, 'dsh.cmd');
    const entry = path.join(sandbox, 'bin.cjs');
    fs.writeFileSync(entry, '');
    fs.writeFileSync(
      shim,
      kind === 'npm'
        ? 'endLocal & "%_prog%" "%dp0%\\bin.cjs" %*'
        : '"%~dp0\\node.exe" "%~dp0\\bin.cjs" %*'
    );
    expect(readDshCmdShim(shim)).toEqual([entry]);
  });

  const windows = process.platform === 'win32' ? it : it.skip;
  windows.each([false, true])('preserves literal Windows argv through npm shim (SEA=%s)', (sea) => {
    const script = path.join(sandbox, 'dsh.cmd');
    const entry = path.join(sandbox, 'record.cjs');
    fs.writeFileSync(
      script,
      [
        '@ECHO OFF',
        'GOTO start',
        ':find_dp0',
        'SET dp0=%~dp0',
        'EXIT /b',
        ':start',
        'SETLOCAL',
        'CALL :find_dp0',
        'IF EXIST "%dp0%\\node.exe" (',
        'SET "_prog=%dp0%\\node.exe"',
        ') ELSE (',
        'SET "_prog=node"',
        ')',
        'endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & set PATHEXT=%PATHEXT:;.JS;=;% & "%_prog%" "%dp0%\\record.cjs" %*',
      ].join('\r\n')
    );
    fs.writeFileSync(
      entry,
      'console.log(JSON.stringify([process.execPath, ...process.argv.slice(2)]))'
    );
    const execPath = sea ? path.join(sandbox, 'woodfish.exe') : process.execPath;
    if (sea) fs.writeFileSync(execPath, 'not a Node runtime');
    const args = ['space path', 'R&D', 'Study^Set', '%TEMP%', 'a"b'].map((name) =>
      path.join(sandbox, name)
    );
    const result = defaultDshRunner(
      script,
      args,
      {
        ...env,
        PATH: path.dirname(process.execPath),
        WOODFISH_NODE_BIN: sea ? execPath : undefined,
      },
      { execPath, sea }
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([process.execPath, ...args]);
  });

  windows('refuses an unknown batch script without invoking a shell', () => {
    const script = path.join(sandbox, 'custom.bat');
    fs.writeFileSync(script, '@echo off\r\necho %*');
    expect(() => defaultDshRunner(script, ['test'], env)).toThrow(/DSH_BIN/);
  });

  it('reports a manifest-only installation and missing bundle resources as broken', () => {
    const profile = resolveDshProfileDir('web', env);
    const dir = path.join(profile, 'node_modules', DSH_PLUGIN_NAME);
    const bundled = path.resolve(__dirname, '../../../dsh-web/plugin');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(profile, 'package.json'),
      JSON.stringify({
        dependencies: { [DSH_PLUGIN_NAME]: '*' },
        dsh: { profile: { bundles: [DSH_PLUGIN_NAME] } },
      })
    );
    fs.copyFileSync(path.join(bundled, 'package.json'), path.join(dir, 'package.json'));
    const status = () => readDshProfileStatus('web', env);
    expect(status()).toMatchObject({ installed: false, broken: true, enabled: true });
    for (const file of ['lib/index.js', 'lib/client.js', 'cordis.patch.yml', 'lib/assets']) {
      fs.cpSync(bundled, dir, { recursive: true });
      expect(status().installed).toBe(true);
      fs.rmSync(path.join(dir, file), { recursive: true });
      expect(status()).toMatchObject({ installed: false, broken: true });
    }
  });

  it('rejects the removed dsh userscript subcommand and invalid profile names', async () => {
    const io = memoryIo();
    expect(await run(['dsh', 'userscript'], { io, context: { paths } })).toBe(2);
    expect(await run(['dsh', 'status', '--profile', '../evil'], { io, context: { paths } })).toBe(
      2
    );
  });
});
