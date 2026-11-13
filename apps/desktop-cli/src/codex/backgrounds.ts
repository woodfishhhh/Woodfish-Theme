import * as fs from 'fs';
import * as path from 'path';
import {
  CODEX_DEFAULT_BACKGROUND_ID,
  CodexBackgroundEntry,
  isSavedBackgroundId,
} from '@woodfish/adapter-codex';
import {
  BACKGROUND_IMAGE_LIMITS,
  BackgroundImageType,
  backgroundImageExtension,
  needsBackgroundCompression,
  readBackgroundImageInfo,
} from '@woodfish/theme-core';
import { WoodfishPaths } from '../paths';
import { readJson, sha256, writeFileAtomic, writeJson } from '../store';

/** The bundled 《彩云》 as base64 WebP, inlined by the release build. */
declare const __WOODFISH_DEFAULT_BACKGROUND__: string | undefined;

const INDEX_FILE = 'index.json';
const NAME_LIMIT = 60;
const MAX_SAVED = 30;

/** A picture the user saved, as recorded in `backgrounds/index.json`. */
export interface StoredBackground extends CodexBackgroundEntry {
  type: BackgroundImageType;
  file: string;
  bytes: number;
  width: number;
  height: number;
  addedAt: string;
}

interface BackgroundIndex {
  version: 1;
  entries: StoredBackground[];
}

export class BackgroundError extends Error {}

function backgroundsDir(paths: WoodfishPaths): string {
  return path.join(paths.dataDir, 'backgrounds');
}

/** The bundled default picture (inlined in `woodfish.js`, read from the repo in development). */
export function loadDefaultBackground(): Buffer {
  if (typeof __WOODFISH_DEFAULT_BACKGROUND__ === 'string') {
    return Buffer.from(__WOODFISH_DEFAULT_BACKGROUND__, 'base64');
  }
  const relative = path.join('packages', 'renderer-runtime', 'assets', 'caiyun.webp');
  for (const up of ['../../../..', '../../..', '../..']) {
    const candidate = path.resolve(__dirname, up, relative);
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  throw new BackgroundError('找不到默认背景《彩云》，请重新构建 woodfish');
}

function readIndex(paths: WoodfishPaths): StoredBackground[] {
  const index = readJson<Partial<BackgroundIndex>>(path.join(backgroundsDir(paths), INDEX_FILE));
  const entries = Array.isArray(index?.entries) ? index.entries : [];
  return entries.filter(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      isSavedBackgroundId(entry.id) &&
      typeof entry.file === 'string' &&
      entry.file === path.basename(entry.file)
  );
}

function writeIndex(paths: WoodfishPaths, entries: StoredBackground[]): void {
  writeJson(path.join(backgroundsDir(paths), INDEX_FILE), { version: 1, entries });
}

/** Saved pictures whose file is still there, oldest first. */
export function listBackgrounds(paths: WoodfishPaths): StoredBackground[] {
  return readIndex(paths).filter((entry) =>
    fs.existsSync(path.join(backgroundsDir(paths), entry.file))
  );
}

function cleanName(name: string): string {
  const cleaned = Array.from(name)
    .filter((character) => character >= ' ' && character !== '\u007f')
    .join('')
    .trim()
    .slice(0, NAME_LIMIT);
  return cleaned || '背景图片';
}

/**
 * Validates a picture by its content (JPEG, PNG or WebP, sane size, already scaled down)
 * and keeps a copy in Woodfish's data folder, named by its hash. The original file is not
 * needed afterwards. Saving the same picture twice keeps one copy.
 */
export function saveBackground(paths: WoodfishPaths, data: Buffer, name: string): StoredBackground {
  if (data.length === 0 || data.length > BACKGROUND_IMAGE_LIMITS.maxStoredBytes) {
    throw new BackgroundError('图片大小不对（应在 6 MB 以内）');
  }
  const info = readBackgroundImageInfo(data);
  if (!info) {
    throw new BackgroundError('只支持 JPG、PNG 和 WebP 图片');
  }
  if (needsBackgroundCompression(info, data.length)) {
    throw new BackgroundError(
      `图片需要先缩小（${info.width}×${info.height}，${(data.length / 1048576).toFixed(1)} MB）`
    );
  }
  const id = sha256(data).slice(0, 12);
  const others = readIndex(paths).filter((candidate) => candidate.id !== id);
  // Anything running in the page can call the binding; bound what it can write to disk.
  if (others.length >= MAX_SAVED) {
    throw new BackgroundError(`最多保存 ${MAX_SAVED} 张背景图片，请先删除不用的`);
  }
  const entry: StoredBackground = {
    id,
    name: cleanName(name),
    type: info.type,
    file: `${id}.${backgroundImageExtension(info.type)}`,
    bytes: data.length,
    width: info.width,
    height: info.height,
    addedAt: new Date().toISOString(),
  };
  writeFileAtomic(path.join(backgroundsDir(paths), entry.file), data);
  writeIndex(paths, [...others, entry]);
  return entry;
}

/** Deletes a saved picture. Returns false when there was none with that id. */
export function removeBackground(paths: WoodfishPaths, id: string): boolean {
  const entries = readIndex(paths);
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) {
    return false;
  }
  fs.rmSync(path.join(backgroundsDir(paths), entry.file), { force: true });
  writeIndex(
    paths,
    entries.filter((candidate) => candidate.id !== id)
  );
  return true;
}

/** The picture for `id` (the bundled default or a saved one), re-validated on every read. */
export function readBackground(
  paths: WoodfishPaths,
  id: string
): { type: BackgroundImageType; data: Buffer } | null {
  const entry = readIndex(paths).find((candidate) => candidate.id === id);
  const file = entry ? path.join(backgroundsDir(paths), entry.file) : null;
  const data =
    id === CODEX_DEFAULT_BACKGROUND_ID
      ? loadDefaultBackground()
      : file && fs.existsSync(file)
        ? fs.readFileSync(file)
        : null;
  const info = data ? readBackgroundImageInfo(data) : null;
  return data && info && data.length <= BACKGROUND_IMAGE_LIMITS.maxStoredBytes
    ? { type: info.type, data }
    : null;
}
