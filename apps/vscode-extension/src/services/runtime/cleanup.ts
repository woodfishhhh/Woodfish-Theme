import * as fs from 'fs';
import * as path from 'path';
import { writeValidatedFileAtomic } from './atomicFile';
import { syncWorkbenchChecksum } from './checksums';
import { findWorkbenchInAppRoot } from './locator';
import { uninstallNativeWindow } from './nativeWindow';
import {
  hasWoodfishPayload,
  removeKnownLegacyWoodfishPayloads,
  removeWorkbenchPayload,
} from './workbenchPatcher';

/*
 * Pure Node helpers (no `vscode` import) so they can run inside the
 * `vscode:uninstall` hook, which executes outside the extension host.
 */
export const BOOTSTRAP_FILE_NAME = 'woodfish-overlay-bootstrap.js';
export const BOOTSTRAP_FILE_HEADER = '/* WOODFISH_THEME_BOOTSTRAP - managed file */';
export const BACKUP_SUFFIX = '.woodfish-backup';

export function getBootstrapFilePath(workbenchPath: string): string {
  return path.join(path.dirname(workbenchPath), BOOTSTRAP_FILE_NAME);
}

export function isValidWorkbenchDocument(content: string): boolean {
  const normalized = content.toLowerCase();
  return normalized.includes('<html') && normalized.includes('</html>');
}

export function stripWoodfishPayloads(html: string): string {
  return removeKnownLegacyWoodfishPayloads(removeWorkbenchPayload(html)).html;
}

export function hasManagedBootstrapFile(workbenchPath: string): boolean {
  const bootstrapPath = getBootstrapFilePath(workbenchPath);
  try {
    return fs.readFileSync(bootstrapPath, 'utf-8').startsWith(BOOTSTRAP_FILE_HEADER);
  } catch {
    return false;
  }
}

export function removeManagedBootstrapFile(workbenchPath: string): boolean {
  if (!hasManagedBootstrapFile(workbenchPath)) {
    return false;
  }
  fs.unlinkSync(getBootstrapFilePath(workbenchPath));
  return true;
}

export type CleanupReport = {
  appRoot: string;
  workbenchPath?: string;
  workbenchCleaned: boolean;
  bootstrapRemoved: boolean;
  nativeWindowRemoved: boolean;
  backupRemoved: boolean;
  checksum: string;
  errors: string[];
};

function attempt(errors: string[], label: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Removes every Woodfish modification from one VS Code installation:
 * workbench payload (current and legacy), bootstrap file, native window hook,
 * backups, and re-syncs the product.json checksum to the restored file.
 */
export function cleanInstallation(appRoot: string): CleanupReport {
  const report: CleanupReport = {
    appRoot,
    workbenchCleaned: false,
    bootstrapRemoved: false,
    nativeWindowRemoved: false,
    backupRemoved: false,
    checksum: 'skipped',
    errors: [],
  };

  attempt(report.errors, 'native-window', () => {
    report.nativeWindowRemoved = uninstallNativeWindow(appRoot).changed;
  });

  const location = findWorkbenchInAppRoot(appRoot);
  if (!location) {
    return report;
  }
  report.workbenchPath = location.workbenchPath;

  attempt(report.errors, 'workbench', () => {
    const current = fs.readFileSync(location.workbenchPath, 'utf-8');
    const cleaned = stripWoodfishPayloads(current);
    if (cleaned !== current) {
      writeValidatedFileAtomic(
        location.workbenchPath,
        cleaned,
        (content) => isValidWorkbenchDocument(content) && !hasWoodfishPayload(content)
      );
      report.workbenchCleaned = true;
    }
  });

  attempt(report.errors, 'bootstrap', () => {
    report.bootstrapRemoved = removeManagedBootstrapFile(location.workbenchPath);
  });

  attempt(report.errors, 'backup', () => {
    const backupPath = `${location.workbenchPath}${BACKUP_SUFFIX}`;
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      report.backupRemoved = true;
    }
  });

  attempt(report.errors, 'checksum', () => {
    report.checksum = syncWorkbenchChecksum(appRoot, location.relativePath, location.workbenchPath);
  });

  return report;
}
