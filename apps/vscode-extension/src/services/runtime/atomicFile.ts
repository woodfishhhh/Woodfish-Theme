import * as fs from 'fs';

export type FileContentValidator = (content: string) => boolean;

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : 'unknown file-system error';
}

function removeIfPresent(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Cleanup must not interrupt rollback of the target file.
  }
}

export function writeValidatedFileAtomic(
  targetPath: string,
  content: string,
  validate: FileContentValidator
): void {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const temporaryPath = `${targetPath}.woodfish-tmp-${suffix}`;
  const rollbackPath = `${targetPath}.woodfish-rollback-${suffix}`;
  let preservedOriginal = false;
  let installedReplacement = false;

  try {
    fs.writeFileSync(temporaryPath, content, 'utf-8');
    const temporaryContent = fs.readFileSync(temporaryPath, 'utf-8');
    if (temporaryContent !== content || !validate(temporaryContent)) {
      throw new Error(`Woodfish refused to replace an invalid file: ${targetPath}`);
    }

    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, rollbackPath);
      preservedOriginal = true;
    }

    fs.renameSync(temporaryPath, targetPath);
    installedReplacement = true;
    const installedContent = fs.readFileSync(targetPath, 'utf-8');
    if (installedContent !== content || !validate(installedContent)) {
      throw new Error(`Woodfish could not validate the replaced file: ${targetPath}`);
    }

    if (preservedOriginal) {
      removeIfPresent(rollbackPath);
    }
  } catch (error) {
    removeIfPresent(temporaryPath);

    let rollbackError: unknown;
    if (installedReplacement && preservedOriginal && fs.existsSync(rollbackPath)) {
      try {
        fs.renameSync(rollbackPath, targetPath);
      } catch (recoveryFailure) {
        rollbackError = recoveryFailure;
      }
    } else if (installedReplacement) {
      removeIfPresent(targetPath);
    }

    if (!installedReplacement) {
      removeIfPresent(rollbackPath);
    }

    if (rollbackError) {
      throw new Error(`${errorMessage(error)}; rollback failed: ${errorMessage(rollbackError)}`);
    }

    throw error;
  }
}
