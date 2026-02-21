import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CssConfigKey } from './types';

export async function ensureCssImport(
  configKey: CssConfigKey,
  fileUri: string,
  signatureParts: string[] = []
): Promise<boolean> {
  const config = vscode.workspace.getConfiguration();
  const current = config.get<string[]>(configKey, []);

  const normalizedSignature = signatureParts.map((part) => part.toLowerCase()).filter(Boolean);
  const alreadyExists = current.some((existing) => {
    if (existing === fileUri) {
      return true;
    }
    if (normalizedSignature.length === 0) {
      return false;
    }
    const lower = existing.toLowerCase();
    return normalizedSignature.every((part) => lower.includes(part));
  });

  if (alreadyExists) {
    return false;
  }

  await config.update(configKey, [...current, fileUri], vscode.ConfigurationTarget.Global);
  return true;
}

export async function removeCssImports(
  configKey: CssConfigKey,
  predicate: (importPath: string) => boolean
): Promise<number> {
  const config = vscode.workspace.getConfiguration();
  const current = config.get<string[]>(configKey, []);
  const filtered = current.filter((entry) => !predicate(entry));
  const removed = current.length - filtered.length;

  if (removed > 0) {
    await config.update(configKey, filtered, vscode.ConfigurationTarget.Global);
  }

  return removed;
}

export async function cleanupCssImports(configKeys: CssConfigKey[]): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  for (const configKey of configKeys) {
    const imports = config.get<unknown>(configKey, []);
    if (!Array.isArray(imports) || imports.length === 0) {
      continue;
    }

    const valid: string[] = [];
    const seen = new Set<string>();

    for (const entry of imports) {
      if (typeof entry !== 'string' || entry.trim().length === 0) {
        continue;
      }
      if (seen.has(entry)) {
        continue;
      }

      if (entry.startsWith('file:///')) {
        try {
          const fsPath = vscode.Uri.parse(entry).fsPath;
          if (fsPath && path.isAbsolute(fsPath) && !fs.existsSync(fsPath)) {
            continue;
          }
        } catch {
          // Keep entry on parse failure to avoid accidental deletions.
        }
      }

      valid.push(entry);
      seen.add(entry);
    }

    if (valid.length !== imports.length) {
      await config.update(configKey, valid, vscode.ConfigurationTarget.Global);
    }
  }
}

