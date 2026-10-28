const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const CSS_NAMED_COLORS: ReadonlySet<string> = new Set([
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'transparent',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
]);

function validateAlpha(component: string | undefined, numeric: number | undefined): boolean {
  if (component === undefined) {
    return true;
  }
  const maximum = component.endsWith('%') ? 100 : 1;
  return numeric !== undefined && numeric >= 0 && numeric <= maximum;
}

function isValidFunctionalColor(value: string): boolean {
  const match = /^(rgba?|hsla?)\((.*)\)$/i.exec(value);
  if (!match || !/^[\d+\-.,%/.\s]+$/.test(match[2])) {
    return false;
  }

  const normalized = match[2].replace(/\s*\/\s*/, ',').replace(/\s+/g, ',');
  const components = normalized.split(',').filter(Boolean);
  const isRgb = match[1].toLowerCase().startsWith('rgb');
  const expected = match[1].toLowerCase().endsWith('a') ? 4 : components.length;
  if (components.length < 3 || components.length > 4 || expected !== components.length) {
    return false;
  }

  const numeric = components.map((component) => Number.parseFloat(component));
  if (numeric.some((component) => !Number.isFinite(component))) {
    return false;
  }
  if (isRgb) {
    return (
      components.slice(0, 3).every((component, index) => {
        const maximum = component.endsWith('%') ? 100 : 255;
        return numeric[index] >= 0 && numeric[index] <= maximum;
      }) && validateAlpha(components[3], numeric[3])
    );
  }
  return (
    numeric[1] >= 0 &&
    numeric[1] <= 100 &&
    components[1].endsWith('%') &&
    numeric[2] >= 0 &&
    numeric[2] <= 100 &&
    components[2].endsWith('%') &&
    validateAlpha(components[3], numeric[3])
  );
}

/**
 * Accepts the color syntaxes Woodfish allows in user settings: hex, CSS named colors and
 * plain numeric `rgb[a]()` / `hsl[a]()`. Anything else (variables, `color-mix`, URLs) is rejected.
 */
export function isValidCssColor(value: string): boolean {
  return (
    HEX_COLOR_PATTERN.test(value) ||
    CSS_NAMED_COLORS.has(value.toLowerCase()) ||
    isValidFunctionalColor(value)
  );
}
