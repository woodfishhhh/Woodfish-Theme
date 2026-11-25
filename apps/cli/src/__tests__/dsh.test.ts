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
        fs.writeFileSync(
          path.join(profileDir, 'node_modules', DSH_PLUGIN_NAME, 'package.json'),
          JSON.stringify({ name: DSH_PLUGIN_NAME, version: '8.2.3' })
        );
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

  it('rejects the removed dsh userscript subcommand and invalid profile names', async () => {
    const io = memoryIo();
    expect(await run(['dsh', 'userscript'], { io, context: { paths } })).toBe(2);
    expect(await run(['dsh', 'status', '--profile', '../evil'], { io, context: { paths } })).toBe(
      2
    );
  });
});
