import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  EFFECTS_LEDGER_FILE,
  EFFECTS_RELOAD_FILE,
  LoadedEffect,
  buildEffectsModule,
  readUserEffects,
  sha256,
  syncUserEffects,
  woodfishEffectsDir,
} from '@woodfish/effects';
import { EffectManifest, EffectValues } from '@woodfish/theme-core';
import { CONFIG_SECTION } from '../constants/config';
import { getOutputChannel } from '../ui/output';

/*
 * Effect plugins in VS Code. The effects live in the user's effects folder (shared with
 * the Codex CLI); this service keeps a copy of Woodfish's own effects there, turns the
 * folder into an ES module in the extension's global storage, and rewrites it whenever an
 * effect file or a setting changes. The workbench bootstrap polls a tiny version file and
 * imports the new module, so effects reload without reloading the window.
 */

/** Woodfish's own effects keep their values in VS Code settings: `woodfishTheme.<section>.*`. */
export const VSCODE_EFFECT_SECTIONS: Readonly<Record<string, string>> = Object.freeze({
  'mouse-trail': 'mouseTrail',
  'caret-trail': 'caretTrail',
  'typing-particles': 'typingParticles',
});

const MODULE_FILE = 'effects.mjs';
const VERSION_FILE = 'effects.json';

/** Where the extension writes the module the workbench loads (inside global storage). */
export function effectsPayloadDir(globalStoragePath: string): string {
  return path.join(globalStoragePath, 'effects');
}

/**
 * The values VS Code uses for an effect: Woodfish's own effects read VS Code settings
 * (same parameter names as effect.json), any other effect keeps its params.json.
 */
export function vscodeEffectValues(
  effect: { id: string; manifest: EffectManifest; values: EffectValues | null },
  get: (key: string) => unknown
): unknown {
  const section = VSCODE_EFFECT_SECTIONS[effect.id];
  if (!section) {
    return effect.values ?? {};
  }
  const values: Record<string, unknown> = { enabled: get(`${section}.enabled`) };
  for (const key of Object.keys(effect.manifest.params)) {
    values[key] = get(`${section}.${key}`);
  }
  return values;
}

/**
 * Writes the module and its version file; the page imports `effects.mjs?v=<hash>` when the
 * version changes (a new hash, or a reload that restarts every effect). Returns whether
 * anything changed.
 */
export function writeEffectsPayload(dir: string, module: string, reloads: number): boolean {
  const hash = sha256(module).slice(0, 16);
  const version = `${JSON.stringify({ hash, reload: reloads })}\n`;
  const versionFile = path.join(dir, VERSION_FILE);
  try {
    if (fs.readFileSync(versionFile, 'utf8') === version) {
      return false;
    }
  } catch {
    // First write.
  }
  fs.mkdirSync(dir, { recursive: true });
  const write = (file: string, content: string): void => {
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, content);
    fs.renameSync(temp, file);
  };
  write(path.join(dir, MODULE_FILE), module);
  write(versionFile, version);
  return true;
}

export interface EffectsReport {
  dir: string;
  loaded: number;
  failed: Array<{ id: string; error: string }>;
}

export class EffectsService implements vscode.Disposable {
  public readonly effectsDir = woodfishEffectsDir();
  private readonly payloadDir: string;
  private reloads = 0;
  private watcher: fs.FSWatcher | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingReload = false;

  public constructor(context: vscode.ExtensionContext) {
    this.payloadDir = effectsPayloadDir(context.globalStorageUri.fsPath);
  }

  /** Seeds the effects folder, writes the module and starts watching. */
  public start(context: vscode.ExtensionContext): void {
    this.sync();
    this.write();
    this.watch();
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(CONFIG_SECTION)) {
          this.schedule(false);
        }
      }),
      this
    );
  }

  /** Re-reads every effect from disk and restarts all of them in the workbench. */
  public reload(): EffectsReport {
    this.sync();
    this.reloads += 1;
    return this.write();
  }

  private sync(): void {
    try {
      const result = syncUserEffects(this.effectsDir);
      if (result.created.length + result.updated.length > 0) {
        getOutputChannel().appendLine(
          `Effects folder ${this.effectsDir}: ${result.created.length} created, ${result.updated.length} updated`
        );
      }
      if (result.kept.length > 0) {
        getOutputChannel().appendLine(
          `Effects kept (edited by the user): ${result.kept.join(', ')}`
        );
      }
    } catch (error) {
      getOutputChannel().appendLine(`Effects sync failed: ${(error as Error).message}`);
    }
  }

  private write(): EffectsReport {
    let effects: LoadedEffect[] = [];
    try {
      effects = readUserEffects(this.effectsDir).filter(
        (effect) => !effect.manifest || effect.manifest.hosts.includes('vscode')
      );
      const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
      const module = buildEffectsModule(effects, 'vscode', (effect) =>
        vscodeEffectValues(effect, (key) => config.get(key))
      );
      writeEffectsPayload(this.payloadDir, module, this.reloads);
    } catch (error) {
      getOutputChannel().appendLine(`Effects payload failed: ${(error as Error).message}`);
    }
    const failed = effects
      .filter((effect) => effect.error)
      .map((effect) => ({ id: effect.id, error: effect.error ?? '' }));
    for (const { id, error } of failed) {
      getOutputChannel().appendLine(`Effect ${id} cannot load: ${error}`);
    }
    return { dir: this.effectsDir, loaded: effects.length - failed.length, failed };
  }

  private watch(): void {
    try {
      fs.mkdirSync(this.effectsDir, { recursive: true });
      this.watcher = fs.watch(this.effectsDir, { recursive: true }, (_event, file) => {
        const name = file ? path.basename(String(file)) : '';
        if (name === EFFECTS_LEDGER_FILE || name.endsWith('.tmp')) {
          return;
        }
        this.schedule(name === EFFECTS_RELOAD_FILE);
      });
      this.watcher.on('error', () => undefined);
    } catch (error) {
      getOutputChannel().appendLine(`Effects folder watch failed: ${(error as Error).message}`);
    }
  }

  private schedule(reload: boolean): void {
    this.pendingReload ||= reload;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.pendingReload) {
        this.reloads += 1;
        this.pendingReload = false;
      }
      this.write();
    }, 250);
  }

  public dispose(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}
