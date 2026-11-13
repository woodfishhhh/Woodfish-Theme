/**
 * Validation of user-supplied background pictures, by content rather than file name.
 * Pure byte parsing, so every host (Node, extension host, page) can run it.
 */

export const BACKGROUND_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type BackgroundImageType = (typeof BACKGROUND_IMAGE_TYPES)[number];

export const BACKGROUND_IMAGE_LIMITS = Object.freeze({
  /** Longest edge pictures are scaled down to before they are stored. */
  maxEdge: 2560,
  /** Stored pictures larger than this are compressed (webp) before they are kept. */
  compressAbove: 3 * 1024 * 1024,
  /** Largest file accepted at all (before compression), bytes. */
  maxInputBytes: 40 * 1024 * 1024,
  /** Largest compressed picture a page may hand over, bytes. */
  maxStoredBytes: 6 * 1024 * 1024,
  /** Largest edge a decoder is asked to handle. */
  maxDecodeEdge: 16384,
});

export interface BackgroundImageInfo {
  type: BackgroundImageType;
  width: number;
  height: number;
}

const EXTENSIONS: Readonly<Record<BackgroundImageType, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function backgroundImageExtension(type: BackgroundImageType): string {
  return EXTENSIONS[type];
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function uint16be(bytes: Uint8Array, at: number): number {
  return (bytes[at] << 8) | bytes[at + 1];
}

function uint32be(bytes: Uint8Array, at: number): number {
  return ((bytes[at] << 24) >>> 0) + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3];
}

function uint24le(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
}

function png(bytes: Uint8Array): BackgroundImageInfo | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((value, index) => bytes[index] !== value)) {
    return null;
  }
  if (ascii(bytes, 12, 4) !== 'IHDR') {
    return null;
  }
  return { type: 'image/png', width: uint32be(bytes, 16), height: uint32be(bytes, 20) };
}

function webp(bytes: Uint8Array): BackgroundImageInfo | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    return null;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === 'VP8X') {
    return { type: 'image/webp', width: uint24le(bytes, 24) + 1, height: uint24le(bytes, 27) + 1 };
  }
  if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { type: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      type: 'image/webp',
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }
  return null;
}

/** Start-of-frame markers carry the size; DHT (C4), JPG (C8) and DAC (CC) do not. */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function jpeg(bytes: Uint8Array): BackgroundImageInfo | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return null;
  }
  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) {
      return null;
    }
    const marker = bytes[at + 1];
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    if (isStartOfFrame(marker)) {
      return {
        type: 'image/jpeg',
        width: uint16be(bytes, at + 7),
        height: uint16be(bytes, at + 5),
      };
    }
    at += 2 + uint16be(bytes, at + 2);
  }
  return null;
}

/**
 * The picture's type and size from its header, or `null` when it is not a JPEG, PNG or
 * WebP with a sane size. Never trusts a file extension or a declared MIME type.
 */
export function readBackgroundImageInfo(bytes: Uint8Array): BackgroundImageInfo | null {
  const info = png(bytes) ?? webp(bytes) ?? jpeg(bytes);
  if (
    !info ||
    info.width < 1 ||
    info.height < 1 ||
    info.width > BACKGROUND_IMAGE_LIMITS.maxDecodeEdge ||
    info.height > BACKGROUND_IMAGE_LIMITS.maxDecodeEdge
  ) {
    return null;
  }
  return info;
}

/** True when a picture must be scaled or compressed before it is kept. */
export function needsBackgroundCompression(info: BackgroundImageInfo, byteLength: number): boolean {
  return (
    Math.max(info.width, info.height) > BACKGROUND_IMAGE_LIMITS.maxEdge ||
    byteLength > BACKGROUND_IMAGE_LIMITS.compressAbove
  );
}
