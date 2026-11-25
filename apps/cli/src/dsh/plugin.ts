import { isSea } from 'node:sea';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DSH_PLUGIN_NAME } from '@woodfish/dsh-web';
import { WoodfishPaths } from '../paths';

/** Staged plugin files embedded into the bundled CLI (`lib/assets/caiyun-*.webp` uses `__WOODFISH_DEFAULT_BACKGROUND__`). */
declare const __WOODFISH_DSH_PLUGIN_FILES__: Record<string, string> | undefined;
declare const __WOODFISH_DSH_PLUGIN_CAIYUN_PATH__: string | undefined;
declare const __WOODFISH_DEFAULT_BACKGROUND__: string | undefined;

export const DSH_PROFILES = ['web', 'desktop'] as const;
export type DshProfileName = string;

const VALID_PROFILE = /^[a-zA-Z0-9._-]+$/;
const REPO_PLUGIN_DIR = path.resolve(__dirname, '../../../dsh-web/plugin');
const REPO_CAIYUN = path.resolve(
  __dirname,
  '../../../../packages/renderer-runtime/assets/caiyun.webp'
);

export interface DshCommandRunnerResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export type DshCommandRunner = (
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv
) => DshCommandRunnerResult;

export interface DshPluginProfileStatus {
  profile: string;
  profileDir: string;
  dshHome: string;
  dshBinary: string | null;
  installed: boolean;
  enabled: boolean;
  version: string | null;
  dependencySpec: string | null;
  dependencyDeclared: boolean;
  packagePresent: boolean;
  broken: boolean;
}

export function validateDshProfile(profile: string): string {
  const trimmed = profile.trim();
  if (
    !trimmed ||
    !VALID_PROFILE.test(trimmed) ||
    trimmed === '.' ||
    trimmed === '..' ||
    trimmed === 'node_modules'
  ) {
    throw new Error(`无效的 dsh profile 名称：${profile}`);
  }
  return trimmed;
}

export function resolveDshHome(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.DSH_HOME?.trim();
  if (override) {
    return path.resolve(override);
  }
  return path.join(os.homedir(), '.dsh');
}

export function resolveDshProfileDir(
  profile: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  return path.join(resolveDshHome(env), 'profiles', validateDshProfile(profile));
}

export function readDshCmdShim(command: string): string[] | null {
  const source = fs.readFileSync(command, 'utf8');
  const launch =
    /(?:^\s*@?|&\s*)(?:"%_prog%"|"(?:%dp0%|%~dp0)[\\/]*node\.exe"|"[a-z]:\\[^"%\r\n]*\\node\.exe"|"?node(?:\.exe)?"?)\s+((?:--[\w-]+(?:=[\w.-]+)?\s+)*)"((?:(?:%dp0%|%~dp0)[\\/]*|[a-z]:[\\/])[^"%\r\n]+\.[mc]?js)"\s+%\*\s*$/i;
  let result: string[] | null = null;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^::|^@?rem\b/i.test(line) || /^:[a-z0-9_.-]+$/i.test(line)) continue;
    if (/^@?echo\s+off$/i.test(line) || /^@?exit\s*\/b\s*$/i.test(line)) continue;
    if (/^@?exit\b/i.test(line)) return null;
    const match = line.match(launch);
    if (match) {
      const [, flags, raw] = match;
      const entry = raw.replace(/^(?:%dp0%|%~dp0)[\\/]*/i, '').replace(/[\\/]/g, path.sep);
      const argv = [
        ...flags.trim().split(/\s+/).filter(Boolean),
        path.resolve(path.dirname(command), entry),
      ];
      if (
        !fs.statSync(argv[argv.length - 1], { throwIfNoEntry: false })?.isFile() ||
        (result && (result.length !== argv.length || result.some((arg, i) => arg !== argv[i])))
      ) {
        return null;
      }
      result = argv;
      continue;
    }
    if (
      /^@?setlocal\b/i.test(line) ||
      /^@?endlocal\b/i.test(line) ||
      /^@?set\s+/i.test(line) ||
      /^@?goto\s+(?:start|#_undefined_#)/i.test(line) ||
      /^@?call\s+:find_dp0$/i.test(line) ||
      /^@?if\s+exist\s+["']?(?:%dp0%|%~dp0)[\\/]+node\.exe["']?\s*\(?$/i.test(line) ||
      /^\)?\s*else\s*\($/i.test(line) ||
      /^\)$/i.test(line)
    ) {
      continue;
    }
    return null;
  }
  return result;
}

function dshNodeBinary(
  command: string,
  env: NodeJS.ProcessEnv,
  runtime: { execPath: string; sea: boolean }
): string {
  const executable = process.platform === 'win32' ? 'node.exe' : 'node';
  const dirs = (env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean);
  const candidates = [
    path.join(path.dirname(command), executable),
    env.WOODFISH_NODE_BIN,
    ...dirs.map((dir) => path.join(dir.replace(/^"|"$/g, ''), executable)),
    !runtime.sea && path.basename(runtime.execPath).toLowerCase() === executable
      ? runtime.execPath
      : undefined,
  ];
  const binary = candidates.find(
    (file) =>
      file &&
      fs.statSync(file, { throwIfNoEntry: false })?.isFile() &&
      !(
        runtime.sea &&
        fs.realpathSync(file).toLowerCase() === fs.realpathSync(runtime.execPath).toLowerCase()
      )
  );
  if (!binary)
    throw new Error('找不到运行 dsh 的 Node，请配置 WOODFISH_NODE_BIN 指向 Node 可执行文件');
  return binary;
}

export function defaultDshRunner(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  runtime = { execPath: process.execPath, sea: isSea() }
): DshCommandRunnerResult {
  let shimArgs: string[] | null = null;
  if (process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(command)) {
    shimArgs = readDshCmdShim(command);
    if (!shimArgs)
      throw new Error(
        '无法安全识别 dsh 的 Node 启动脚本，请配置 DSH_BIN 指向 dsh 可执行文件或 Node 入口'
      );
  } else if (/\.[mc]?js$/i.test(command)) {
    shimArgs = [command];
  }
  const result = spawnSync(
    shimArgs ? dshNodeBinary(command, env, runtime) : command,
    shimArgs ? [...shimArgs, ...args] : [...args],
    {
      env,
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
    }
  );
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ...(result.error ? { error: result.error } : {}),
  };
}

/** Finds the installed `dsh` CLI executable (`DSH_BIN` override, `~/.local/bin`, or `PATH`). */
export function resolveDshBinary(
  env: NodeJS.ProcessEnv = process.env,
  exists: (candidate: string) => boolean = fs.existsSync
): string | null {
  const override = env.DSH_BIN?.trim();
  if (override && exists(override)) {
    return override;
  }
  const home = os.homedir();
  const localCandidates =
    process.platform === 'win32'
      ? [
          path.join(home, '.local', 'bin', 'dsh.cmd'),
          path.join(home, '.local', 'bin', 'dsh.exe'),
          path.join(home, 'AppData', 'Local', 'Programs', 'dsh', 'dsh.cmd'),
        ]
      : [path.join(home, '.local', 'bin', 'dsh'), '/usr/local/bin/dsh'];
  for (const candidate of localCandidates) {
    if (exists(candidate)) {
      return candidate;
    }
  }
  const pathEntries = (env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean);
  const names = process.platform === 'win32' ? ['dsh.cmd', 'dsh.exe', 'dsh'] : ['dsh'];
  for (const dir of pathEntries) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (exists(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

/** Stable directory under Woodfish's data dir where the bundled native plugin is staged. */
export function stagedDshPluginDir(paths: WoodfishPaths): string {
  return path.join(paths.dataDir, 'dsh-plugin');
}

function listFilesRecursive(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFilesRecursive(full, base);
    }
    return [path.relative(base, full).split(path.sep).join('/')];
  });
}

function readBundledPluginFiles(): { files: Record<string, string | Buffer> } {
  if (typeof __WOODFISH_DSH_PLUGIN_FILES__ === 'object' && __WOODFISH_DSH_PLUGIN_FILES__ !== null) {
    const files: Record<string, string | Buffer> = { ...__WOODFISH_DSH_PLUGIN_FILES__ };
    if (
      typeof __WOODFISH_DSH_PLUGIN_CAIYUN_PATH__ === 'string' &&
      typeof __WOODFISH_DEFAULT_BACKGROUND__ === 'string'
    ) {
      files[__WOODFISH_DSH_PLUGIN_CAIYUN_PATH__] = Buffer.from(
        __WOODFISH_DEFAULT_BACKGROUND__,
        'base64'
      );
    }
    return { files };
  }
  // Unbundled source runs (tests / dev): read the committed plugin directory directly.
  if (!fs.existsSync(path.join(REPO_PLUGIN_DIR, 'package.json'))) {
    throw new Error(
      `未找到构建好的 dsh 原生插件目录：${REPO_PLUGIN_DIR}（请先运行 pnpm dsh:build）`
    );
  }
  const files: Record<string, string | Buffer> = {};
  for (const rel of listFilesRecursive(REPO_PLUGIN_DIR)) {
    const full = path.join(REPO_PLUGIN_DIR, ...rel.split('/'));
    files[rel] = rel.endsWith('.webp') ? fs.readFileSync(full) : fs.readFileSync(full, 'utf8');
  }
  if (
    !Object.keys(files).some((key) => key.startsWith('lib/assets/caiyun-')) &&
    fs.existsSync(REPO_CAIYUN)
  ) {
    files['lib/assets/caiyun.webp'] = fs.readFileSync(REPO_CAIYUN);
  }
  return { files };
}

/** Writes the self-contained native `woodfish-dsh-plugin` package into a stable directory. */
export function stageBundledDshPlugin(paths: WoodfishPaths): string {
  const dir = stagedDshPluginDir(paths);
  const { files } = readBundledPluginFiles();
  const expected = new Set(Object.keys(files));
  for (const existing of listFilesRecursive(dir)) {
    if (!expected.has(existing)) {
      fs.unlinkSync(path.join(dir, ...existing.split('/')));
    }
  }
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(target, content);
    } else {
      fs.writeFileSync(target, content, 'utf8');
    }
  }
  return dir;
}

interface ProfilePackageJson {
  dependencies?: Record<string, string>;
  dsh?: {
    profile?: {
      bundles?: string[];
    };
  };
}

/** Reads whether `woodfish-dsh-plugin` is installed and active in one dsh profile. */
export function readDshProfileStatus(
  profile: string,
  env: NodeJS.ProcessEnv = process.env
): DshPluginProfileStatus {
  const valid = validateDshProfile(profile);
  const dshHome = resolveDshHome(env);
  const profileDir = resolveDshProfileDir(valid, env);
  const dshBinary = resolveDshBinary(env);
  const manifestPath = path.join(profileDir, 'package.json');
  let dependencySpec: string | null = null;
  let enabled = false;
  let version: string | null = null;
  let packagePresent = false;

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ProfilePackageJson;
      const spec = manifest.dependencies?.[DSH_PLUGIN_NAME];
      if (typeof spec === 'string') {
        dependencySpec = spec;
      }
      const bundles = manifest.dsh?.profile?.bundles;
      enabled = Array.isArray(bundles) && bundles.includes(DSH_PLUGIN_NAME);
    } catch {
      // Treat unreadable manifest as not installed.
    }
  }

  const installedManifest = path.join(profileDir, 'node_modules', DSH_PLUGIN_NAME, 'package.json');
  if (fs.existsSync(installedManifest)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(installedManifest, 'utf8')) as {
        name?: unknown;
        version?: unknown;
        main?: unknown;
        exports?: Record<string, unknown>;
        dsh?: { client?: { platform?: unknown }; bundle?: { patch?: unknown } };
      };
      if (
        pkg.name === DSH_PLUGIN_NAME &&
        typeof pkg.version === 'string' &&
        pkg.version.trim() &&
        pkg.dsh?.client?.platform === 'web'
      ) {
        const dir = path.dirname(installedManifest);
        const rootExport = pkg.exports?.['.'];
        const clientExport = pkg.exports?.['./client'];
        const entries = [
          pkg.main,
          ...(rootExport === undefined ? [] : [rootExport]),
          clientExport,
          pkg.dsh.bundle?.patch,
        ];
        const filesExist = entries.every(
          (file) =>
            typeof file === 'string' &&
            !path.isAbsolute(file) &&
            path.resolve(dir, file).startsWith(dir + path.sep) &&
            fs.statSync(path.join(dir, file), { throwIfNoEntry: false })?.isFile()
        );
        const clientCode =
          typeof clientExport === 'string' && filesExist
            ? fs.readFileSync(path.join(dir, clientExport), 'utf8')
            : '';
        const escapedPluginName = DSH_PLUGIN_NAME.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
        const assetMatch = clientCode.match(
          new RegExp('plugins/' + escapedPluginName + '/assets/([^"\\/]+)')
        );
        const assetPath = assetMatch?.[1] ? path.join(dir, 'lib', 'assets', assetMatch[1]) : '';
        packagePresent = Boolean(
          filesExist &&
          Boolean(assetPath) &&
          fs.statSync(assetPath, { throwIfNoEntry: false })?.isFile()
        );
        if (packagePresent) version = pkg.version;
      }
    } catch {
      // Ignore unreadable package metadata.
    }
  }

  return {
    profile: valid,
    profileDir,
    dshHome,
    dshBinary,
    installed: dependencySpec !== null && packagePresent,
    enabled,
    version,
    dependencySpec,
    dependencyDeclared: dependencySpec !== null,
    packagePresent,
    broken: dependencySpec !== null && !packagePresent,
  };
}

/** Removes any leftover legacy user-script files (`dsh.json`, `woodfish-dsh.user.js`). */
export function cleanupLegacyDshUserScriptFiles(paths: WoodfishPaths): string[] {
  const candidates = [
    path.join(paths.dataDir, 'dsh.json'),
    path.join(paths.dataDir, 'woodfish-dsh.user.js'),
  ];
  const removed: string[] = [];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
      removed.push(file);
    }
  }
  return removed;
}
