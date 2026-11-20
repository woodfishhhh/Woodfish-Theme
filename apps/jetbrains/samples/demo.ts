// Woodfish 效果预览：TypeScript
import { readFile } from 'node:fs/promises';

type Palette = 'dark' | 'dracula' | 'black' | 'neon' | 'light';

interface ThemeInfo {
  readonly label: string;
  slug: Palette;
  accent?: `#${string}`;
}

const THEMES: ThemeInfo[] = [
  { label: 'Woodfish Dark', slug: 'dark', accent: '#eacd61' },
  { label: 'Woodfish Dracula', slug: 'dracula', accent: '#ff79c6' },
  { label: 'Woodfish Neon', slug: 'neon' },
];

enum Layer {
  Gradient = 'A',
  Glow = 'G',
}

export class ThemeRegistry<K extends string = Palette> {
  #cache = new Map<K, ThemeInfo>();

  constructor(private readonly fallback: ThemeInfo) {}

  find(slug: K): ThemeInfo {
    return this.#cache.get(slug) ?? this.fallback;
  }

  async load(path: string): Promise<number> {
    const text = await readFile(path, 'utf8');
    const parsed = JSON.parse(text) as ThemeInfo[];
    parsed.filter((theme) => theme.label !== '').forEach((theme) => this.#cache.set(theme.slug as K, theme));
    return parsed.length >= 0 ? parsed.length : -1;
  }
}

const registry = new ThemeRegistry(THEMES[0]);
console.log(`${Layer.Gradient}${Layer.Glow}`, registry.find('dark').label, 42, 3.14e-2, /wood(fish)?/gi.test('Woodfish'));
