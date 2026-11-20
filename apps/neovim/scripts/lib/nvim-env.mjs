// Dev-only helpers: find Neovim, build the pinned Treesitter parsers and queries, run Neovim headless.
// Nothing here runs in CI; `nvim:generate` / `nvim:check` only read the committed captures.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './shared.mjs';

const SOURCES = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'treesitter-sources.json'), 'utf8'));
const PARSER_EXT = process.platform === 'win32' ? 'dll' : 'so';

export const WORK_DIR = process.env.WOODFISH_NVIM_WORK || path.join(os.tmpdir(), 'wf-neovim', 'ts');

export function nvimBinary() {
  const candidate = process.env.WOODFISH_NVIM || 'nvim';
  try {
    execFileSync(candidate, ['--version'], { stdio: 'ignore' });
  } catch {
    throw new Error('Neovim 0.11+ not found: put nvim on PATH or set WOODFISH_NVIM');
  }
  return candidate;
}

export function nvimVersion(nvim) {
  return execFileSync(nvim, ['--version'], { encoding: 'utf8' }).split('\n')[0].trim();
}

function git(cwd, ...args) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function fetchRevision(dir, url, revision) {
  if (fs.existsSync(path.join(dir, '.git'))) return;
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q');
  git(dir, 'remote', 'add', 'origin', url);
  git(dir, 'fetch', '-q', '--depth', '1', 'origin', revision);
  git(dir, 'checkout', '-q', 'FETCH_HEAD');
}

/**
 * Build `<work>/rt` (parser/ + queries/) from the pinned sources and return it.
 * Lua, Markdown and Markdown-inline use the parsers and queries that ship with Neovim.
 */
export function ensureTreesitterRuntime() {
  const runtime = path.join(WORK_DIR, 'rt');
  const parserDir = path.join(runtime, 'parser');
  fs.mkdirSync(parserDir, { recursive: true });

  const queries = SOURCES.queries;
  const queriesRepo = path.join(WORK_DIR, 'src', 'nvim-treesitter');
  for (const folder of queries.folders) {
    const target = path.join(runtime, 'queries', folder);
    if (fs.existsSync(target)) continue;
    fetchRevision(queriesRepo, queries.url, queries.revision);
    fs.cpSync(path.join(queriesRepo, 'runtime', 'queries', folder), target, { recursive: true });
  }

  for (const [name, grammar] of Object.entries(SOURCES.grammars)) {
    const output = path.join(parserDir, `${name}.${PARSER_EXT}`);
    if (fs.existsSync(output)) continue;
    const repo = path.join(WORK_DIR, 'src', name);
    fetchRevision(repo, grammar.url, grammar.revision);
    const source = path.join(repo, grammar.location || '', 'src');
    const files = ['parser.c', 'scanner.c'].map((file) => path.join(source, file)).filter((file) => fs.existsSync(file));
    execFileSync(process.env.CC || 'gcc', ['-shared', '-fPIC', '-O2', '-I', source, ...files, '-o', output], { stdio: 'inherit' });
  }
  return runtime;
}

/** Run `nvim --headless -l script args…` with the pinned Treesitter runtime (and the plugin) on the runtimepath. */
export function runNvim(nvim, runtime, script, args, env = {}) {
  const result = spawnSync(
    nvim,
    [
      '--clean',
      '--headless',
      '--cmd',
      'lua vim.opt.rtp:prepend(vim.env.WOODFISH_RT); vim.opt.rtp:prepend(vim.env.WOODFISH_PLUGIN)',
      '-l',
      script,
      ...args,
    ],
    { encoding: 'utf8', env: { ...process.env, WOODFISH_RT: runtime, WOODFISH_PLUGIN: ROOT, ...env }, maxBuffer: 1 << 28 }
  );
  // TOhtml warns about the missing terminal on stderr; only a failing exit status or a Lua error matters.
  if (result.status !== 0 || /\bE\d{3,4}:/.test(result.stderr)) {
    throw new Error(`nvim ${path.basename(script)} failed:\n${result.stderr}`);
  }
  return result.stdout;
}
