import { GradientPreset, matchGradientPreset } from '../gradient/presets';

/*
 * Hand-tuned gradients of the built-in themes. Woodfish Dark is the original hand-written
 * Bearded tuning (syntax-highlighting.css up to 5.x); the other themes follow its rules:
 * start at the token color, turn along the hue circle toward a more vivid end, 45°, and a
 * soft rainbow at 135° for the editor foreground.
 */

const TOKEN_ANGLE = 45;
const FOREGROUND_ANGLE = 135;

function tuned(...stops: string[]): { angle: number; stops: readonly string[] } {
  return Object.freeze({ angle: TOKEN_ANGLE, stops: Object.freeze(stops) });
}

function rainbow(...stops: string[]): { angle: number; stops: readonly string[] } {
  return Object.freeze({ angle: FOREGROUND_ANGLE, stops: Object.freeze(stops) });
}

const DARK: GradientPreset = {
  slug: 'dark',
  background: '#1C2433',
  foreground: '#D0D7E4',
  tokens: {
    // HTML attributes, keywords
    '#EACD61': tuned('#eacd61', '#ea618e'),
    // HTML tags, functions
    '#69C3FF': tuned('#00d4ff', '#1a94ff'),
    // strings
    '#3CEC85': tuned('#00ff04', '#00ff99'),
    // declarations: int, double, let…
    '#B78AFF': tuned('#b78aff', '#f644ff'),
    // variables and functions
    '#FF955C': tuned('#ff9900', '#eaff00'),
    '#22ECDB': tuned('#22ecdb', '#00bbff'),
    // primitive and built-in types
    '#FF738A': tuned('#ff738a', '#ff7349'),
    '#D0D7E4': rainbow(
      '#ffc1e0',
      '#ffd5c6',
      '#fff6c5',
      '#e0ffc1',
      '#bdffff',
      '#c3e1ff',
      '#d7c4ff',
      '#ffc0ff',
      '#ffc8e5'
    ),
  },
};

/** The Woodfish Dark foreground rainbow, shared by the dark themes. */
const PASTEL_RAINBOW = DARK.tokens['#D0D7E4'];

const DRACULA: GradientPreset = {
  slug: 'dracula',
  background: '#282A36',
  foreground: '#F8F8F2',
  tokens: {
    // keywords, storage, tags, operators: the pink → purple accent pair
    '#FF79C6': tuned('#ff79c6', '#cc6dff'),
    // functions, decorators, attributes
    '#50FA7B': tuned('#50fa7b', '#00ffb3'),
    // types, namespaces
    '#8BE9FD': tuned('#8be9fd', '#3daeff'),
    // strings
    '#F1FA8C': tuned('#f1fa8c', '#b4ff5c'),
    // numbers, `this`
    '#BD93F9': tuned('#bd93f9', '#f650ff'),
    // parameters
    '#FFB86C': tuned('#ffb86c', '#ffe14d'),
    // variables, properties
    '#F8F8F2': PASTEL_RAINBOW,
  },
};

const BLACK: GradientPreset = {
  slug: 'black',
  background: '#000000',
  foreground: '#E6E6E6',
  tokens: {
    // keywords, tags
    '#EA618E': tuned('#ea618e', '#ff8a4c'),
    // parameters, attributes: the Woodfish yellow → pink pair
    '#EACD61': DARK.tokens['#EACD61'],
    '#B78AFF': DARK.tokens['#B78AFF'],
    '#22ECDB': DARK.tokens['#22ECDB'],
    '#3CEC85': DARK.tokens['#3CEC85'],
    // functions
    '#61AFEA': tuned('#00d4ff', '#1a94ff'),
    // numbers
    '#FF9E64': tuned('#ff9900', '#eaff00'),
    // properties
    '#D9C9A3': tuned('#d9c9a3', '#ffbf73'),
    // decorators, macros
    '#C79BFF': tuned('#c79bff', '#ff7ae0'),
    // operators
    '#F28AAA': tuned('#f28aaa', '#ff9f7a'),
    // namespaces
    '#7EE0D4': tuned('#7ee0d4', '#5cb8ff'),
    '#E6E6E6': PASTEL_RAINBOW,
  },
};

const NEON: GradientPreset = {
  slug: 'neon',
  background: '#0D0B1E',
  foreground: '#E8E3FF',
  tokens: {
    // keywords, tags: hot pink into a sunset orange
    '#FF2E97': tuned('#ff2e97', '#ff6a3d'),
    // storage, `this`
    '#B967FF': tuned('#b967ff', '#ff3df2'),
    // functions
    '#00E5FF': tuned('#00e5ff', '#7b70ff'),
    // types, regexps
    '#01FFC3': tuned('#01ffc3', '#00f0ff'),
    // strings
    '#B8FF5A': tuned('#b8ff5a', '#28ff9a'),
    // numbers, escapes
    '#FF9E3D': tuned('#ff9e3d', '#ffe63d'),
    // parameters, attributes: yellow into pink, like Woodfish Dark keywords
    '#FFE66D': tuned('#ffe66d', '#ff5ca8'),
    // properties
    '#8EC5FF': tuned('#8ec5ff', '#b07dff'),
    // decorators, operators, macros
    '#FF6AD5': tuned('#ff6ad5', '#ff5470'),
    // namespaces
    '#7DF9FF': tuned('#7df9ff', '#4dafff'),
    '#E8E3FF': PASTEL_RAINBOW,
  },
};

/*
 * On a light background the same rules run the other way: the end turns along the hue
 * circle and gets deeper and more saturated, never lighter, and the foreground rainbow
 * is a row of dark jewel tones.
 */
const LIGHT: GradientPreset = {
  slug: 'light',
  background: '#FBFAF7',
  foreground: '#24292F',
  tokens: {
    // keywords, tags
    '#B4235A': tuned('#b4235a', '#c43a12'),
    // storage, `this`
    '#7B3FC4': tuned('#7b3fc4', '#b0249e'),
    // functions
    '#1F5FBF': tuned('#1f5fbf', '#5b3fd6'),
    // types, regexps
    '#0B7568': tuned('#0b7568', '#0a6aa8'),
    // strings
    '#3B7A1C': tuned('#3b7a1c', '#0b7a4a'),
    // numbers, escapes
    '#A04F00': tuned('#a04f00', '#c0331a'),
    // parameters, attributes
    '#8A6200': tuned('#8a6200', '#6a7400'),
    // variables
    '#2B3A67': tuned('#2b3a67', '#3b2a8a'),
    // properties
    '#0A6A8A': tuned('#0a6a8a', '#1f4fc4'),
    // decorators, macros
    '#9B2F94': tuned('#9b2f94', '#c0265a'),
    // namespaces
    '#5F4BB6': tuned('#5f4bb6', '#8f2fb8'),
    '#24292F': rainbow(
      '#a3214f',
      '#a8430f',
      '#806400',
      '#3f7a12',
      '#0a7a66',
      '#16639f',
      '#5a3fb8',
      '#8f2c9a',
      '#a3214f'
    ),
  },
};

/** Hand-tuned gradients of every built-in theme. */
export const GRADIENT_PRESETS: readonly GradientPreset[] = /* @__PURE__ */ Object.freeze([
  DARK,
  DRACULA,
  BLACK,
  NEON,
  LIGHT,
]);

/** The preset of a palette slug, or `null` for themes without one. */
export function findGradientPreset(slug: string | null | undefined): GradientPreset | null {
  return GRADIENT_PRESETS.find((preset) => preset.slug === slug) ?? null;
}

/** The built-in theme with this editor background and foreground, if any. */
export function detectGradientPreset(
  background: string,
  foreground: string
): GradientPreset | null {
  return matchGradientPreset(GRADIENT_PRESETS, background, foreground);
}
