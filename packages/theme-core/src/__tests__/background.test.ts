import {
  BACKGROUND_IMAGE_LIMITS,
  BACKGROUND_RANGES,
  DEFAULT_BACKGROUND,
  needsBackgroundCompression,
  normalizeBackground,
  readBackgroundImageInfo,
} from '../index';

function bytes(...parts: Array<number[] | string>): Uint8Array {
  return Uint8Array.from(
    parts.flatMap((part) =>
      typeof part === 'string' ? [...part].map((character) => character.charCodeAt(0)) : part
    )
  );
}

const be32 = (value: number): number[] => [
  (value >>> 24) & 255,
  (value >>> 16) & 255,
  (value >>> 8) & 255,
  value & 255,
];
const le24 = (value: number): number[] => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255];

function pngHeader(width: number, height: number): Uint8Array {
  return bytes(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    be32(13),
    'IHDR',
    be32(width),
    be32(height),
    [8, 6, 0, 0, 0]
  );
}

describe('background params', () => {
  it('defaults to the owner look and keeps defaults inside the ranges', () => {
    expect(normalizeBackground()).toEqual({
      ...DEFAULT_BACKGROUND,
      fill: [...DEFAULT_BACKGROUND.fill],
    });
    expect(DEFAULT_BACKGROUND).toMatchObject({
      opacity: 0.15,
      blur: 10,
      mask: 0.35,
      saturate: 150,
      luminosity: 0.1,
      secondaryBlur: 10,
      size: 'cover',
      position: 'center',
      transition: 30,
    });
    for (const [key, range] of Object.entries(BACKGROUND_RANGES)) {
      const value = DEFAULT_BACKGROUND[key as keyof typeof BACKGROUND_RANGES];
      expect(value).toBeGreaterThanOrEqual(range.minimum);
      expect(value).toBeLessThanOrEqual(range.maximum);
    }
  });

  it('clamps numbers, rejects unknown enums and unsafe fill colors', () => {
    const background = normalizeBackground({
      opacity: 7,
      blur: -3,
      mask: '0.5',
      size: 'tile',
      position: 'top',
      fill: ['url(x)', '#000'],
    });
    expect(background.opacity).toBe(1);
    expect(background.blur).toBe(0);
    expect(background.mask).toBe(DEFAULT_BACKGROUND.mask);
    expect(background.size).toBe('cover');
    expect(background.position).toBe('top');
    expect(background.fill).toEqual([...DEFAULT_BACKGROUND.fill]);
    expect(normalizeBackground({ fill: ['#111', '#222'] }).fill).toEqual(['#111', '#222']);
  });
});

describe('background picture validation', () => {
  it('reads PNG, JPEG and the three WebP chunk kinds by content', () => {
    expect(readBackgroundImageInfo(pngHeader(1920, 1080))).toEqual({
      type: 'image/png',
      width: 1920,
      height: 1080,
    });
    const jpeg = bytes(
      [0xff, 0xd8, 0xff, 0xe0],
      [0, 4, 0, 0],
      [0xff, 0xc0, 0, 17, 8],
      [0x05, 0xa0, 0x0a, 0x00],
      [3, 1, 0x22, 0]
    );
    expect(readBackgroundImageInfo(jpeg)).toEqual({
      type: 'image/jpeg',
      width: 2560,
      height: 1440,
    });
    const webpHeader = (chunk: string, body: number[]): Uint8Array =>
      bytes('RIFF', [0, 0, 0, 0], 'WEBP', chunk, [0, 0, 0, 0], body, new Array(16).fill(0));
    expect(
      readBackgroundImageInfo(webpHeader('VP8X', [0, 0, 0, 0, ...le24(2559), ...le24(1439)]))
    ).toEqual({
      type: 'image/webp',
      width: 2560,
      height: 1440,
    });
    const lossless = 2559 | (1439 << 14);
    expect(
      readBackgroundImageInfo(
        webpHeader('VP8L', [
          0x2f,
          lossless & 255,
          (lossless >>> 8) & 255,
          (lossless >>> 16) & 255,
          (lossless >>> 24) & 255,
        ])
      )
    ).toEqual({ type: 'image/webp', width: 2560, height: 1440 });
    expect(
      readBackgroundImageInfo(
        webpHeader('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, 0x00, 0x0a, 0xa0, 0x05])
      )
    ).toEqual({ type: 'image/webp', width: 2560, height: 1440 });
  });

  it('rejects other files, truncated headers and absurd sizes', () => {
    expect(readBackgroundImageInfo(bytes('GIF89a', new Array(30).fill(0)))).toBeNull();
    expect(readBackgroundImageInfo(bytes('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(readBackgroundImageInfo(pngHeader(1, 1).subarray(0, 20))).toBeNull();
    expect(readBackgroundImageInfo(pngHeader(0, 10))).toBeNull();
    expect(
      readBackgroundImageInfo(pngHeader(BACKGROUND_IMAGE_LIMITS.maxDecodeEdge + 1, 10))
    ).toBeNull();
  });

  it('asks for compression above the edge or byte limit', () => {
    const info = { type: 'image/png' as const, width: 2560, height: 1600 };
    expect(needsBackgroundCompression(info, 1024)).toBe(false);
    expect(needsBackgroundCompression({ ...info, width: 3000 }, 1024)).toBe(true);
    expect(needsBackgroundCompression(info, BACKGROUND_IMAGE_LIMITS.compressAbove + 1)).toBe(true);
  });
});
