import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { writeValidatedFileAtomic } from './atomicFile';

/**
 * VS Code compares `product.json#checksums` with the files it ships and shows
 * “Your Code installation appears to be corrupt” when they differ. Woodfish only
 * rewrites the single checksum entry of the workbench document it patched, and
 * always to the hash of the file that is actually on disk, so removing the
 * payload later restores a matching checksum automatically.
 */
export function computeVsCodeChecksum(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('base64').replace(/=+$/, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type ChecksumSyncResult = 'updated' | 'unchanged' | 'missing-entry' | 'missing-product';

export function replaceChecksumEntry(
  productJson: string,
  relativePath: string,
  checksum: string
): string | null {
  const pattern = new RegExp(`("${escapeRegExp(relativePath)}"\\s*:\\s*")([^"]*)(")`);
  if (!pattern.test(productJson)) {
    return null;
  }

  return productJson.replace(pattern, (_match, prefix: string, _old: string, suffix: string) => {
    return `${prefix}${checksum}${suffix}`;
  });
}

function isValidProductJson(content: string): boolean {
  try {
    const parsed = JSON.parse(content) as { checksums?: unknown };
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

export function syncWorkbenchChecksum(
  appRoot: string,
  relativePath: string,
  workbenchPath: string
): ChecksumSyncResult {
  const productPath = path.join(appRoot, 'product.json');
  if (!fs.existsSync(productPath) || !fs.existsSync(workbenchPath)) {
    return 'missing-product';
  }

  const productJson = fs.readFileSync(productPath, 'utf-8');
  const checksum = computeVsCodeChecksum(fs.readFileSync(workbenchPath));
  const next = replaceChecksumEntry(productJson, relativePath, checksum);
  if (next === null) {
    return 'missing-entry';
  }
  if (next === productJson) {
    return 'unchanged';
  }

  writeValidatedFileAtomic(productPath, next, isValidProductJson);
  return 'updated';
}
