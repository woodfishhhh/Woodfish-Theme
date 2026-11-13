/* Generated from browser/overlay-bootstrap.ts by scripts/build-browser-runtime.js. Do not edit. */
"use strict";
(() => {
  // ../../packages/theme-core/src/color/parse.ts
  function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
  }
  var HEX_COLOR = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
  function parseCssColor(value) {
    const hexadecimal = HEX_COLOR.exec(value.trim());
    if (hexadecimal) {
      const compact = hexadecimal[1];
      const expanded = compact.length <= 4 ? [...compact].map((channel) => `${channel}${channel}`).join("") : compact;
      return {
        r: Number.parseInt(expanded.slice(0, 2), 16),
        g: Number.parseInt(expanded.slice(2, 4), 16),
        b: Number.parseInt(expanded.slice(4, 6), 16),
        alpha: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1
      };
    }
    const channels = value.match(/[+-]?(?:\d*\.)?\d+/g);
    if (!channels || channels.length < 3) {
      return null;
    }
    return {
      r: clamp(Number(channels[0]), 0, 255),
      g: clamp(Number(channels[1]), 0, 255),
      b: clamp(Number(channels[2]), 0, 255),
      alpha: clamp(channels[3] === void 0 ? 1 : Number(channels[3]))
    };
  }

  // ../../packages/theme-core/src/color/oklch.ts
  function srgbToLinear(value) {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }
  function linearToSrgb(value) {
    const channel = value <= 31308e-7 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
    return channel * 255;
  }
  function rgbToOklch(color) {
    const red = srgbToLinear(color.r);
    const green = srgbToLinear(color.g);
    const blue = srgbToLinear(color.b);
    const lightRoot = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
    const mediumRoot = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
    const shortRoot = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
    const lightness = 0.2104542553 * lightRoot + 0.793617785 * mediumRoot - 0.0040720468 * shortRoot;
    const a = 1.9779984951 * lightRoot - 2.428592205 * mediumRoot + 0.4505937099 * shortRoot;
    const b = 0.0259040371 * lightRoot + 0.7827717662 * mediumRoot - 0.808675766 * shortRoot;
    return {
      l: lightness,
      c: Math.hypot(a, b),
      h: Math.atan2(b, a) * 180 / Math.PI
    };
  }
  function oklchToRgb(color) {
    const hue = color.h * Math.PI / 180;
    const a = color.c * Math.cos(hue);
    const b = color.c * Math.sin(hue);
    const lightRoot = color.l + 0.3963377774 * a + 0.2158037573 * b;
    const mediumRoot = color.l - 0.1055613458 * a - 0.0638541728 * b;
    const shortRoot = color.l - 0.0894841775 * a - 1.291485548 * b;
    const light = lightRoot ** 3;
    const medium = mediumRoot ** 3;
    const short = shortRoot ** 3;
    return {
      r: linearToSrgb(4.0767416621 * light - 3.3077115913 * medium + 0.2309699292 * short),
      g: linearToSrgb(-1.2684380046 * light + 2.6097574011 * medium - 0.3413193965 * short),
      b: linearToSrgb(-0.0041960863 * light - 0.7034186147 * medium + 1.707614701 * short)
    };
  }
  function isInSrgbGamut(color) {
    return [color.r, color.g, color.b].every(
      (channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255
    );
  }
  function gamutMapOklch(color) {
    const direct = oklchToRgb(color);
    if (isInSrgbGamut(direct)) {
      return direct;
    }
    let minimumChroma = 0;
    let maximumChroma = color.c;
    for (let iteration = 0; iteration < 20; iteration += 1) {
      const candidateChroma = (minimumChroma + maximumChroma) / 2;
      const candidate = oklchToRgb({ ...color, c: candidateChroma });
      if (isInSrgbGamut(candidate)) {
        minimumChroma = candidateChroma;
      } else {
        maximumChroma = candidateChroma;
      }
    }
    return oklchToRgb({ ...color, c: minimumChroma });
  }
  function normalizeHue(hue) {
    return (hue % 360 + 360) % 360;
  }

  // ../../packages/theme-core/src/color/format.ts
  function formatRgba(color, alpha) {
    return `rgba(${Math.round(clamp(color.r, 0, 255))}, ${Math.round(
      clamp(color.g, 0, 255)
    )}, ${Math.round(clamp(color.b, 0, 255))}, ${Number(clamp(alpha).toFixed(4))})`;
  }

  // ../../packages/theme-core/src/color/contrast.ts
  function relativeLuminance(color) {
    return 0.2126 * srgbToLinear(color.r) + 0.7152 * srgbToLinear(color.g) + 0.0722 * srgbToLinear(color.b);
  }
  function contrastRatio(left, right) {
    const [high, low] = [relativeLuminance(left), relativeLuminance(right)].sort(
      (first, second) => second - first
    );
    return (high + 0.05) / (low + 0.05);
  }

  // ../../packages/theme-core/src/color/validate.ts
  var HEX_COLOR_PATTERN = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
  var CSS_NAMED_COLORS = /* @__PURE__ */ new Set([
    "aliceblue",
    "antiquewhite",
    "aqua",
    "aquamarine",
    "azure",
    "beige",
    "bisque",
    "black",
    "blanchedalmond",
    "blue",
    "blueviolet",
    "brown",
    "burlywood",
    "cadetblue",
    "chartreuse",
    "chocolate",
    "coral",
    "cornflowerblue",
    "cornsilk",
    "crimson",
    "cyan",
    "darkblue",
    "darkcyan",
    "darkgoldenrod",
    "darkgray",
    "darkgreen",
    "darkgrey",
    "darkkhaki",
    "darkmagenta",
    "darkolivegreen",
    "darkorange",
    "darkorchid",
    "darkred",
    "darksalmon",
    "darkseagreen",
    "darkslateblue",
    "darkslategray",
    "darkslategrey",
    "darkturquoise",
    "darkviolet",
    "deeppink",
    "deepskyblue",
    "dimgray",
    "dimgrey",
    "dodgerblue",
    "firebrick",
    "floralwhite",
    "forestgreen",
    "fuchsia",
    "gainsboro",
    "ghostwhite",
    "gold",
    "goldenrod",
    "gray",
    "green",
    "greenyellow",
    "grey",
    "honeydew",
    "hotpink",
    "indianred",
    "indigo",
    "ivory",
    "khaki",
    "lavender",
    "lavenderblush",
    "lawngreen",
    "lemonchiffon",
    "lightblue",
    "lightcoral",
    "lightcyan",
    "lightgoldenrodyellow",
    "lightgray",
    "lightgreen",
    "lightgrey",
    "lightpink",
    "lightsalmon",
    "lightseagreen",
    "lightskyblue",
    "lightslategray",
    "lightslategrey",
    "lightsteelblue",
    "lightyellow",
    "lime",
    "limegreen",
    "linen",
    "magenta",
    "maroon",
    "mediumaquamarine",
    "mediumblue",
    "mediumorchid",
    "mediumpurple",
    "mediumseagreen",
    "mediumslateblue",
    "mediumspringgreen",
    "mediumturquoise",
    "mediumvioletred",
    "midnightblue",
    "mintcream",
    "mistyrose",
    "moccasin",
    "navajowhite",
    "navy",
    "oldlace",
    "olive",
    "olivedrab",
    "orange",
    "orangered",
    "orchid",
    "palegoldenrod",
    "palegreen",
    "paleturquoise",
    "palevioletred",
    "papayawhip",
    "peachpuff",
    "peru",
    "pink",
    "plum",
    "powderblue",
    "purple",
    "rebeccapurple",
    "red",
    "rosybrown",
    "royalblue",
    "saddlebrown",
    "salmon",
    "sandybrown",
    "seagreen",
    "seashell",
    "sienna",
    "silver",
    "skyblue",
    "slateblue",
    "slategray",
    "slategrey",
    "snow",
    "springgreen",
    "steelblue",
    "tan",
    "teal",
    "thistle",
    "tomato",
    "transparent",
    "turquoise",
    "violet",
    "wheat",
    "white",
    "whitesmoke",
    "yellow",
    "yellowgreen"
  ]);
  function validateAlpha(component, numeric) {
    if (component === void 0) {
      return true;
    }
    const maximum = component.endsWith("%") ? 100 : 1;
    return numeric !== void 0 && numeric >= 0 && numeric <= maximum;
  }
  function isValidFunctionalColor(value) {
    const match = /^(rgba?|hsla?)\((.*)\)$/i.exec(value);
    if (!match || !/^[\d+\-.,%/.\s]+$/.test(match[2])) {
      return false;
    }
    const normalized = match[2].replace(/\s*\/\s*/, ",").replace(/\s+/g, ",");
    const components = normalized.split(",").filter(Boolean);
    const isRgb = match[1].toLowerCase().startsWith("rgb");
    const expected = match[1].toLowerCase().endsWith("a") ? 4 : components.length;
    if (components.length < 3 || components.length > 4 || expected !== components.length) {
      return false;
    }
    const numeric = components.map((component) => Number.parseFloat(component));
    if (numeric.some((component) => !Number.isFinite(component))) {
      return false;
    }
    if (isRgb) {
      return components.slice(0, 3).every((component, index) => {
        const maximum = component.endsWith("%") ? 100 : 255;
        return numeric[index] >= 0 && numeric[index] <= maximum;
      }) && validateAlpha(components[3], numeric[3]);
    }
    return numeric[1] >= 0 && numeric[1] <= 100 && components[1].endsWith("%") && numeric[2] >= 0 && numeric[2] <= 100 && components[2].endsWith("%") && validateAlpha(components[3], numeric[3]);
  }
  function isValidCssColor(value) {
    return HEX_COLOR_PATTERN.test(value) || CSS_NAMED_COLORS.has(value.toLowerCase()) || isValidFunctionalColor(value);
  }

  // ../../packages/theme-core/src/color/gamut.ts
  var CHROMA_CEILING = 0.4;
  var BISECTION_STEPS = 18;
  var CUSP_LIGHTNESS_SAMPLES = 48;
  function maxChromaInGamut(lightness, hue) {
    if (lightness <= 0 || lightness >= 1) {
      return 0;
    }
    let minimum = 0;
    let maximum = CHROMA_CEILING;
    for (let step = 0; step < BISECTION_STEPS; step += 1) {
      const candidate = (minimum + maximum) / 2;
      if (isInSrgbGamut(oklchToRgb({ l: lightness, c: candidate, h: hue }))) {
        minimum = candidate;
      } else {
        maximum = candidate;
      }
    }
    return minimum;
  }
  var cuspCache = /* @__PURE__ */ new Map();
  function gamutCusp(hue) {
    const key = Math.round(normalizeHue(hue) * 2) / 2;
    const cached = cuspCache.get(key);
    if (cached) {
      return cached;
    }
    let best = { l: 0.5, c: 0, h: key };
    for (let sample = 1; sample < CUSP_LIGHTNESS_SAMPLES; sample += 1) {
      const lightness = sample / CUSP_LIGHTNESS_SAMPLES;
      const chroma = maxChromaInGamut(lightness, key);
      if (chroma > best.c) {
        best = { l: lightness, c: chroma, h: key };
      }
    }
    cuspCache.set(key, best);
    return best;
  }

  // ../../packages/theme-core/src/gradient/presets.ts
  function toHexKey(color) {
    if (color.alpha < 1) {
      return null;
    }
    return `#${[color.r, color.g, color.b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  }
  function findPresetGradient(preset, color) {
    const key = toHexKey(color);
    return key ? preset.tokens[key] ?? null : null;
  }
  function sameColor(left, right) {
    const first = parseCssColor(left);
    const second = parseCssColor(right);
    return first !== null && second !== null && toHexKey(first) !== null && toHexKey(first) === toHexKey(second);
  }
  function matchGradientPreset(presets, background, foreground) {
    return presets.find(
      (preset) => sameColor(preset.background, background) && sameColor(preset.foreground, foreground)
    ) ?? null;
  }

  // ../../packages/theme-core/src/gradient/tokenGradient.ts
  var NEUTRAL_CHROMA_THRESHOLD = 0.045;
  var DEFAULT_ANCHOR_HUE = 300;
  var END_VIVIDNESS = 0.85;
  var DIM_VIVIDNESS = 0.3;
  var DIM_CONTRAST = 3;
  var END_LIGHTNESS_PULL = 0.5;
  var RAINBOW_LIGHTNESS_PULL = 0.7;
  var RAINBOW_STOP_COUNT = 9;
  var PASTEL_EDGE_STEP = 5e-3;
  var JEWEL_CHROMA_FACTOR = 2;
  var LIGHT_GLOW_LIGHTNESS = 0.8;
  var LIGHT_GLOW_MIN_CHROMA = 0.12;
  var LIGHT_GLOW_NEUTRAL_LIGHTNESS = 0.96;
  var LIGHT_GLOW_NEUTRAL_CHROMA = 0.02;
  var READABLE_CONTRAST = 4.5;
  var READABILITY_STEP = 0.01;
  var READABILITY_MAX_STEPS = 60;
  function limit(value, bound) {
    return clamp(value, -bound, bound);
  }
  function readabilityFor(source, background) {
    const parsed = background ? parseCssColor(background) : null;
    if (!parsed || parsed.alpha === 0) {
      return null;
    }
    return {
      background: parsed,
      minimum: Math.min(READABLE_CONTRAST, contrastRatio(source, parsed)),
      direction: rgbToOklch(parsed).l < 0.5 ? 1 : -1
    };
  }
  function toReadableRgb(color, readability) {
    let candidate = color;
    let rgb = gamutMapOklch(candidate);
    if (!readability) {
      return rgb;
    }
    for (let step = 0; step < READABILITY_MAX_STEPS && contrastRatio(rgb, readability.background) < readability.minimum; step += 1) {
      candidate = { ...candidate, l: clamp(candidate.l + readability.direction * READABILITY_STEP) };
      rgb = gamutMapOklch(candidate);
    }
    return rgb;
  }
  function deriveChromaticStops(base, options, dim) {
    const turn = dim || options.punctuation ? options.hueShift / 2 : options.hueShift;
    const hue = base.h + turn;
    const lightness = dim ? base.l : clamp(
      base.l + limit((gamutCusp(hue).l - base.l) * END_LIGHTNESS_PULL, options.lightnessDelta)
    );
    const headroom = maxChromaInGamut(lightness, hue);
    const vividness = dim ? DIM_VIVIDNESS : END_VIVIDNESS;
    const chroma = Math.max(base.c, base.c + (headroom - base.c) * vividness);
    return [base, { l: lightness, c: chroma, h: hue }];
  }
  function pastelEdge(hue, chroma, direction) {
    let lightness = direction > 0 ? 1 - PASTEL_EDGE_STEP : PASTEL_EDGE_STEP;
    while (lightness > 0 && lightness < 1 && maxChromaInGamut(lightness, hue) < chroma) {
      lightness -= direction * PASTEL_EDGE_STEP;
    }
    return clamp(lightness);
  }
  function deriveRainbowStops(base, options, direction) {
    const stops = [];
    for (let index = 0; index < RAINBOW_STOP_COUNT; index += 1) {
      const hue = options.anchorHue + 360 * index / (RAINBOW_STOP_COUNT - 1);
      if (direction < 0) {
        const lightness2 = clamp(base.l + options.lightnessDelta);
        stops.push({
          l: lightness2,
          c: Math.min(options.neutralChroma * JEWEL_CHROMA_FACTOR, maxChromaInGamut(lightness2, hue)),
          h: hue
        });
        continue;
      }
      const edge = pastelEdge(hue, options.neutralChroma, direction);
      const room = (edge - base.l) * direction;
      const offset = room > 0 ? room * RAINBOW_LIGHTNESS_PULL * direction : edge - base.l;
      const lightness = clamp(base.l + limit(offset, options.lightnessDelta));
      stops.push({
        l: lightness,
        c: Math.min(options.neutralChroma, maxChromaInGamut(lightness, hue)),
        h: hue
      });
    }
    return stops;
  }
  function deriveMutedStops(base, options) {
    return [
      base,
      {
        l: base.l,
        c: Math.max(base.c, options.neutralChroma / 2),
        h: options.anchorHue + (options.punctuation ? 0 : options.hueShift / 2)
      }
    ];
  }
  function sameOpaqueColor(left, right) {
    const other = parseCssColor(right);
    return other !== null && [left.r, left.g, left.b].every(
      (channel, index) => Math.round(channel) === Math.round([other.r, other.g, other.b][index])
    ) && left.alpha === other.alpha;
  }
  function isBodyText(source, base, options, readability) {
    if (options.foreground) {
      return sameOpaqueColor(source, options.foreground);
    }
    if (readability) {
      return contrastRatio(source, readability.background) >= READABLE_CONTRAST;
    }
    return base.l >= 0.7 || base.l <= 0.4;
  }
  function isDim(source, readability) {
    return readability !== null && contrastRatio(source, readability.background) < DIM_CONTRAST;
  }
  function deriveStops(parsed, base, neutral, options) {
    const readability = readabilityFor(parsed, options.background);
    let stops;
    if (!neutral) {
      stops = deriveChromaticStops(base, options, isDim(parsed, readability));
    } else if (!options.punctuation && isBodyText(parsed, base, options, readability)) {
      const direction = readability ? readability.direction : base.l >= 0.5 ? 1 : -1;
      stops = deriveRainbowStops(base, options, direction);
    } else {
      stops = deriveMutedStops(base, options);
    }
    return stops.map(
      (stop) => formatRgba(stop === base ? parsed : toReadableRgb(stop, readability), parsed.alpha)
    );
  }
  function isLightBackground(background) {
    const parsed = background ? parseCssColor(background) : null;
    return parsed !== null && parsed.alpha > 0 && rgbToOklch(parsed).l >= 0.5;
  }
  function glowSource(parsed, base, neutral, options) {
    if (!isLightBackground(options.background)) {
      return parsed;
    }
    const hue = neutral ? options.anchorHue : base.h;
    const lightness = neutral ? LIGHT_GLOW_NEUTRAL_LIGHTNESS : LIGHT_GLOW_LIGHTNESS;
    const chroma = neutral ? LIGHT_GLOW_NEUTRAL_CHROMA : Math.max(base.c, LIGHT_GLOW_MIN_CHROMA);
    return gamutMapOklch({
      l: lightness,
      c: Math.min(chroma, maxChromaInGamut(lightness, hue)),
      h: hue
    });
  }
  function deriveTokenGradient(cssColor, options) {
    const parsed = parseCssColor(cssColor);
    if (!parsed) {
      return null;
    }
    const base = rgbToOklch(parsed);
    const neutral = base.c < NEUTRAL_CHROMA_THRESHOLD;
    const tuned2 = options.preset ? findPresetGradient(options.preset, parsed) : null;
    const nearOpacity = options.punctuation ? 0.28 : neutral ? 0.58 : 0.72;
    const midOpacity = options.punctuation ? 0.12 : neutral ? 0.28 : 0.42;
    const farOpacity = neutral ? 0.12 : 0.2;
    const glow = glowSource(parsed, base, neutral, options);
    return {
      stops: tuned2 ? [...tuned2.stops] : deriveStops(parsed, base, neutral, options),
      angle: tuned2 ? tuned2.angle : null,
      base: formatRgba(parsed, parsed.alpha),
      glowNear: formatRgba(glow, parsed.alpha * nearOpacity),
      glowMid: formatRgba(glow, parsed.alpha * midOpacity),
      glowFar: formatRgba(glow, parsed.alpha * farOpacity),
      punctuationNear: formatRgba(glow, parsed.alpha * 0.28),
      punctuationFar: formatRgba(glow, parsed.alpha * 0.12),
      neutral,
      preset: tuned2 !== null
    };
  }

  // ../../packages/theme-core/src/gradient/anchorHue.ts
  var ANCHOR_MINIMUM_CHROMA = 0.075;
  var ANCHOR_MINIMUM_LIGHTNESS = 0.4;
  var PUNCTUATION_ONLY = /^[()[\]{}.,;:+\-*/%=<>!?&|~^@#`'"\\]+$/;
  function isPunctuationOnly(value) {
    const text = value.replace(/\u00a0/g, " ").trim();
    return text.length > 0 && PUNCTUATION_ONLY.test(text);
  }
  function rankPaletteAnchorHue(colors) {
    const palette = /* @__PURE__ */ new Map();
    for (const cssColor of colors) {
      const parsed = parseCssColor(cssColor);
      if (!parsed) {
        continue;
      }
      const color = rgbToOklch(parsed);
      if (color.c < ANCHOR_MINIMUM_CHROMA || color.l < ANCHOR_MINIMUM_LIGHTNESS) {
        continue;
      }
      const entry = palette.get(cssColor) ?? { ...color, count: 0 };
      entry.count += 1;
      palette.set(cssColor, entry);
    }
    const ranked = [...palette.values()].sort(
      (left, right) => right.count * right.c - left.count * left.c
    );
    return ranked[0] ? ranked[0].h : null;
  }
  function pickAccentHue(colors) {
    let best = null;
    for (const cssColor of colors) {
      const parsed = parseCssColor(cssColor);
      if (!parsed) {
        continue;
      }
      const color = rgbToOklch(parsed);
      if (color.c >= NEUTRAL_CHROMA_THRESHOLD && (!best || color.c > best.c)) {
        best = color;
      }
    }
    return best ? best.h : null;
  }

  // ../../packages/theme-core/src/effects/params.ts
  var DEFAULT_TEXT_GRADIENT = /* @__PURE__ */ Object.freeze({
    hueShift: 32,
    lightnessDelta: 0.12,
    neutralChroma: 0.075,
    angle: 45
  });
  var DEFAULT_CURSOR_GRADIENT_STOPS = /* @__PURE__ */ Object.freeze([
    "#ff2d95",
    "#ff4500",
    "#ffd700",
    "#7cfc00",
    "#00ffff",
    "#1e90ff",
    "#9370db",
    "#ff00ff",
    "#ff1493"
  ]);
  var DEFAULT_CURSOR = /* @__PURE__ */ Object.freeze({
    animationDuration: 8,
    gradientStops: DEFAULT_CURSOR_GRADIENT_STOPS,
    borderRadius: 2,
    glowBlur: 0,
    glowOpacity: 0.7
  });
  var DEFAULT_GLASS = /* @__PURE__ */ Object.freeze({
    mode: "blur",
    blur: 30,
    saturate: 125,
    opacity: 0.7,
    noise: 0.02,
    borderRadius: 0
  });

  // ../../packages/theme-core/src/effects/plugins.ts
  function finite(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : void 0;
  }
  function normalizeValue(spec, value) {
    switch (spec.type) {
      case "number": {
        const number = finite(value);
        return number === void 0 ? spec.default : Math.min(spec.max ?? number, Math.max(spec.min ?? number, number));
      }
      case "boolean":
        return typeof value === "boolean" ? value : spec.default;
      case "select":
        return typeof value === "string" && spec.options?.some((option) => option.value === value) ? value : spec.default;
      case "color":
        return typeof value === "string" && isValidCssColor(value) ? value : spec.default;
    }
  }
  function normalizeEffectValues(manifest, raw) {
    const input = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const values = {
      enabled: typeof input.enabled === "boolean" ? input.enabled : manifest.enabled
    };
    for (const [key, spec] of Object.entries(manifest.params)) {
      values[key] = normalizeValue(spec, input[key]);
    }
    return values;
  }
  function patchEffectValues(manifest, values, patch) {
    if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
      return normalizeEffectValues(manifest, values);
    }
    return normalizeEffectValues(manifest, { ...values, ...patch });
  }
  function effectCssVariables(id, manifest, values) {
    const kebab = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return Object.entries(manifest.params).flatMap(([key, spec]) => {
      const value = values[key];
      if (spec.type === "boolean") {
        return [`--woodfish-${id}-${kebab(key)}: ${value ? 1 : 0};`];
      }
      if (spec.type === "number") {
        return [`--woodfish-${id}-${kebab(key)}: ${String(value)}${spec.unit ?? ""};`];
      }
      return typeof value === "string" && (spec.type === "color" || /^[a-z0-9-]+$/i.test(value)) ? [`--woodfish-${id}-${kebab(key)}: ${value};`] : [];
    });
  }

  // ../../packages/theme-core/src/palettes/gradientPresets.ts
  var TOKEN_ANGLE = 45;
  var FOREGROUND_ANGLE = 135;
  function tuned(...stops) {
    return Object.freeze({ angle: TOKEN_ANGLE, stops: Object.freeze(stops) });
  }
  function rainbow(...stops) {
    return Object.freeze({ angle: FOREGROUND_ANGLE, stops: Object.freeze(stops) });
  }
  var DARK = {
    slug: "dark",
    background: "#1C2433",
    foreground: "#D0D7E4",
    tokens: {
      // HTML attributes, keywords
      "#EACD61": tuned("#eacd61", "#ea618e"),
      // HTML tags, functions
      "#69C3FF": tuned("#00d4ff", "#1a94ff"),
      // strings
      "#3CEC85": tuned("#00ff04", "#00ff99"),
      // declarations: int, double, let…
      "#B78AFF": tuned("#b78aff", "#f644ff"),
      // variables and functions
      "#FF955C": tuned("#ff9900", "#eaff00"),
      "#22ECDB": tuned("#22ecdb", "#00bbff"),
      // primitive and built-in types
      "#FF738A": tuned("#ff738a", "#ff7349"),
      "#D0D7E4": rainbow(
        "#ffc1e0",
        "#ffd5c6",
        "#fff6c5",
        "#e0ffc1",
        "#bdffff",
        "#c3e1ff",
        "#d7c4ff",
        "#ffc0ff",
        "#ffc8e5"
      )
    }
  };
  var PASTEL_RAINBOW = DARK.tokens["#D0D7E4"];
  var DRACULA = {
    slug: "dracula",
    background: "#282A36",
    foreground: "#F8F8F2",
    tokens: {
      // keywords, storage, tags, operators: the pink → purple accent pair
      "#FF79C6": tuned("#ff79c6", "#cc6dff"),
      // functions, decorators, attributes
      "#50FA7B": tuned("#50fa7b", "#00ffb3"),
      // types, namespaces
      "#8BE9FD": tuned("#8be9fd", "#3daeff"),
      // strings
      "#F1FA8C": tuned("#f1fa8c", "#b4ff5c"),
      // numbers, `this`
      "#BD93F9": tuned("#bd93f9", "#f650ff"),
      // parameters
      "#FFB86C": tuned("#ffb86c", "#ffe14d"),
      // variables, properties
      "#F8F8F2": PASTEL_RAINBOW
    }
  };
  var BLACK = {
    slug: "black",
    background: "#000000",
    foreground: "#E6E6E6",
    tokens: {
      // keywords, tags
      "#EA618E": tuned("#ea618e", "#ff8a4c"),
      // parameters, attributes: the Woodfish yellow → pink pair
      "#EACD61": DARK.tokens["#EACD61"],
      "#B78AFF": DARK.tokens["#B78AFF"],
      "#22ECDB": DARK.tokens["#22ECDB"],
      "#3CEC85": DARK.tokens["#3CEC85"],
      // functions
      "#61AFEA": tuned("#00d4ff", "#1a94ff"),
      // numbers
      "#FF9E64": tuned("#ff9900", "#eaff00"),
      // properties
      "#D9C9A3": tuned("#d9c9a3", "#ffbf73"),
      // decorators, macros
      "#C79BFF": tuned("#c79bff", "#ff7ae0"),
      // operators
      "#F28AAA": tuned("#f28aaa", "#ff9f7a"),
      // namespaces
      "#7EE0D4": tuned("#7ee0d4", "#5cb8ff"),
      "#E6E6E6": PASTEL_RAINBOW
    }
  };
  var NEON = {
    slug: "neon",
    background: "#0D0B1E",
    foreground: "#E8E3FF",
    tokens: {
      // keywords, tags: hot pink into a sunset orange
      "#FF2E97": tuned("#ff2e97", "#ff6a3d"),
      // storage, `this`
      "#B967FF": tuned("#b967ff", "#ff3df2"),
      // functions
      "#00E5FF": tuned("#00e5ff", "#7b70ff"),
      // types, regexps
      "#01FFC3": tuned("#01ffc3", "#00f0ff"),
      // strings
      "#B8FF5A": tuned("#b8ff5a", "#28ff9a"),
      // numbers, escapes
      "#FF9E3D": tuned("#ff9e3d", "#ffe63d"),
      // parameters, attributes: yellow into pink, like Woodfish Dark keywords
      "#FFE66D": tuned("#ffe66d", "#ff5ca8"),
      // properties
      "#8EC5FF": tuned("#8ec5ff", "#b07dff"),
      // decorators, operators, macros
      "#FF6AD5": tuned("#ff6ad5", "#ff5470"),
      // namespaces
      "#7DF9FF": tuned("#7df9ff", "#4dafff"),
      "#E8E3FF": PASTEL_RAINBOW
    }
  };
  var LIGHT = {
    slug: "light",
    background: "#FBFAF7",
    foreground: "#24292F",
    tokens: {
      // keywords, tags
      "#B4235A": tuned("#b4235a", "#c43a12"),
      // storage, `this`
      "#7B3FC4": tuned("#7b3fc4", "#b0249e"),
      // functions
      "#1F5FBF": tuned("#1f5fbf", "#5b3fd6"),
      // types, regexps
      "#0B7568": tuned("#0b7568", "#0a6aa8"),
      // strings
      "#3B7A1C": tuned("#3b7a1c", "#0b7a4a"),
      // numbers, escapes
      "#A04F00": tuned("#a04f00", "#c0331a"),
      // parameters, attributes
      "#8A6200": tuned("#8a6200", "#6a7400"),
      // variables
      "#2B3A67": tuned("#2b3a67", "#3b2a8a"),
      // properties
      "#0A6A8A": tuned("#0a6a8a", "#1f4fc4"),
      // decorators, macros
      "#9B2F94": tuned("#9b2f94", "#c0265a"),
      // namespaces
      "#5F4BB6": tuned("#5f4bb6", "#8f2fb8"),
      "#24292F": rainbow(
        "#a3214f",
        "#a8430f",
        "#806400",
        "#3f7a12",
        "#0a7a66",
        "#16639f",
        "#5a3fb8",
        "#8f2c9a",
        "#a3214f"
      )
    }
  };
  var GRADIENT_PRESETS = /* @__PURE__ */ Object.freeze([
    DARK,
    DRACULA,
    BLACK,
    NEON,
    LIGHT
  ]);
  function detectGradientPreset(background, foreground) {
    return matchGradientPreset(GRADIENT_PRESETS, background, foreground);
  }

  // ../../packages/renderer-runtime/src/gradientRuns.ts
  var RUN_VARIABLES = {
    size: "--woodfish-overlay-gradient-size",
    position: "--woodfish-overlay-gradient-position"
  };
  var SAME_ROW_TOLERANCE_PX = 1;
  function clearRunVariables(token) {
    if (token.style.getPropertyValue(RUN_VARIABLES.size) === "") {
      return;
    }
    token.style.removeProperty(RUN_VARIABLES.size);
    token.style.removeProperty(RUN_VARIABLES.position);
  }
  function formatPx(value) {
    return `${Number(value.toFixed(2))}px`;
  }
  function collectRuns(parent, keyOf) {
    const runs = [];
    const singles = [];
    let current = [];
    let currentKey = null;
    const close = () => {
      if (current.length >= 2) {
        runs.push(current);
      } else {
        singles.push(...current);
      }
      current = [];
      currentKey = null;
    };
    for (const child of parent.children) {
      const key = keyOf(child);
      const previous = current[current.length - 1];
      const adjacent = previous !== void 0 && child.previousSibling === previous;
      if (key !== null && key === currentKey && adjacent) {
        current.push(child);
        continue;
      }
      close();
      if (key !== null) {
        current = [child];
        currentKey = key;
      }
    }
    close();
    return { runs, singles };
  }
  function linkGradientRuns(parent, keyOf) {
    const { runs, singles } = collectRuns(parent, keyOf);
    for (const token of singles) {
      clearRunVariables(token);
    }
    if (runs.length === 0) {
      return;
    }
    const measured = runs.map((run) => run.map((token) => token.getBoundingClientRect()));
    runs.forEach((run, index) => {
      const rects = measured[index];
      const top = rects[0].top;
      if (rects.some((rect) => Math.abs(rect.top - top) > SAME_ROW_TOLERANCE_PX)) {
        run.forEach(clearRunVariables);
        return;
      }
      const left = Math.min(...rects.map((rect) => rect.left));
      const width = Math.max(...rects.map((rect) => rect.right)) - left;
      if (!(width > 0)) {
        run.forEach(clearRunVariables);
        return;
      }
      run.forEach((token, position) => {
        token.style.setProperty(RUN_VARIABLES.size, `${formatPx(width)} 100%`);
        token.style.setProperty(RUN_VARIABLES.position, `${formatPx(left - rects[position].left)} 0`);
      });
    });
  }

  // ../../packages/renderer-runtime/src/textGradientEngine.ts
  var NO_CONTEXT = { background: null, foreground: null, preset: null };
  var TOKEN_MARKER_ATTRIBUTE = "data-woodfish-overlay-token";
  var TOKEN_VARIABLES = {
    /** Comma-separated color stops with positions, for `linear-gradient(angle, …)`. */
    gradientStops: "--woodfish-overlay-gradient-stops",
    /** A hand-tuned angle such as `45deg`; `initial` makes host CSS use its own setting. */
    gradientAngle: "--woodfish-overlay-gradient-angle",
    /** The token's own color. */
    gradientBase: "--woodfish-overlay-gradient-base",
    glowNear: "--woodfish-overlay-glow-near",
    glowMid: "--woodfish-overlay-glow-mid",
    glowFar: "--woodfish-overlay-glow-far",
    punctuationGlowNear: "--woodfish-overlay-punctuation-glow-near",
    punctuationGlowFar: "--woodfish-overlay-punctuation-glow-far"
  };
  var DEFAULT_POLL_INTERVAL_MS = 1200;
  function formatGradientStops(stops) {
    const last = Math.max(1, stops.length - 1);
    return stops.map((stop, index) => `${stop} ${Number((100 * index / last).toFixed(2))}%`).join(", ");
  }
  var DEFAULT_MAX_TOKENS_PER_FRAME = 600;
  var PALETTE_SIGNATURE_LIMIT = 24;
  function startTextGradientEngine(options) {
    const tokenSelector = options.tokenSelector;
    const rootSelector = options.rootSelector;
    const acceptToken = options.acceptToken ?? (() => true);
    const MAX_TOKENS_PER_FRAME2 = options.maxTokensPerFrame ?? DEFAULT_MAX_TOKENS_PER_FRAME;
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const continuousRuns = options.continuousRuns ?? true;
    let settings = { ...options.params };
    const pendingTokens = /* @__PURE__ */ new Set();
    const tokenState = /* @__PURE__ */ new WeakMap();
    const colorCache = /* @__PURE__ */ new Map();
    const viewLineObservers = /* @__PURE__ */ new Map();
    let anchorHue = DEFAULT_ANCHOR_HUE;
    let context = NO_CONTEXT;
    let profileVersion = 0;
    let frameId = 0;
    let profileRefreshTimer = null;
    let hasTokenPalette = false;
    let disposed = false;
    function deriveTokenColors(cssColor, punctuation) {
      const cacheKey = [
        cssColor,
        settings.hueShift,
        settings.lightnessDelta,
        settings.neutralChroma,
        punctuation ? "punctuation" : "token"
      ].join("|");
      const cached = colorCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      const result = deriveTokenGradient(cssColor, {
        ...settings,
        anchorHue,
        punctuation,
        background: context.background,
        foreground: context.foreground,
        preset: context.preset
      });
      if (result) {
        colorCache.set(cacheKey, result);
      }
      return result;
    }
    function applyToken(token) {
      if (!token.isConnected) {
        return;
      }
      if (!acceptToken(token)) {
        token.removeAttribute(TOKEN_MARKER_ATTRIBUTE);
        clearRunVariables(token);
        tokenState.delete(token);
        return;
      }
      const computed = getComputedStyle(token).color;
      const cssColor = options.mapColor ? options.mapColor(computed, token) : computed;
      const punctuation = isPunctuationOnly(token.textContent || "");
      const previous = tokenState.get(token);
      if (previous && previous.profileVersion === profileVersion && previous.cssColor === cssColor && previous.punctuation === punctuation) {
        return;
      }
      const colors = deriveTokenColors(cssColor, punctuation);
      if (!colors) {
        token.removeAttribute(TOKEN_MARKER_ATTRIBUTE);
        clearRunVariables(token);
        return;
      }
      token.style.setProperty(TOKEN_VARIABLES.gradientStops, formatGradientStops(colors.stops));
      token.style.setProperty(
        TOKEN_VARIABLES.gradientAngle,
        colors.angle === null ? "initial" : `${colors.angle}deg`
      );
      token.style.setProperty(TOKEN_VARIABLES.gradientBase, colors.base);
      token.style.setProperty(TOKEN_VARIABLES.glowNear, colors.glowNear);
      token.style.setProperty(TOKEN_VARIABLES.glowMid, colors.glowMid);
      token.style.setProperty(TOKEN_VARIABLES.glowFar, colors.glowFar);
      token.style.setProperty(TOKEN_VARIABLES.punctuationGlowNear, colors.punctuationNear);
      token.style.setProperty(TOKEN_VARIABLES.punctuationGlowFar, colors.punctuationFar);
      token.dataset.woodfishOverlayToken = "true";
      token.dataset.woodfishNeutral = colors.neutral ? "true" : "false";
      token.dataset.woodfishPunctuation = punctuation ? "true" : "false";
      token.dataset.woodfishPreset = colors.preset ? "true" : "false";
      tokenState.set(token, {
        profileVersion,
        cssColor,
        punctuation
      });
    }
    function runKey(element) {
      const token = element;
      if (token.dataset?.woodfishOverlayToken !== "true") {
        return null;
      }
      const state = tokenState.get(token);
      return state && state.profileVersion === profileVersion ? state.cssColor : null;
    }
    function flushTokens() {
      frameId = 0;
      let processed = 0;
      const touchedParents = /* @__PURE__ */ new Set();
      for (const token of pendingTokens) {
        pendingTokens.delete(token);
        applyToken(token);
        if (continuousRuns && token.isConnected && token.parentElement) {
          touchedParents.add(token.parentElement);
        }
        processed += 1;
        if (processed >= MAX_TOKENS_PER_FRAME2) {
          break;
        }
      }
      for (const parent of touchedParents) {
        linkGradientRuns(parent, runKey);
      }
      if (pendingTokens.size > 0) {
        frameId = requestAnimationFrame(flushTokens);
      }
    }
    function queueToken(token) {
      pendingTokens.add(token);
      if (frameId === 0) {
        frameId = requestAnimationFrame(flushTokens);
      }
    }
    function queueTokensFromNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const token = node.parentElement && node.parentElement.closest(tokenSelector);
        if (token) {
          queueToken(token);
        }
        return;
      }
      if (typeof ShadowRoot !== "undefined" && node instanceof ShadowRoot) {
        for (const token of node.querySelectorAll(tokenSelector)) {
          queueToken(token);
        }
        return;
      }
      if (!(node instanceof Element)) {
        return;
      }
      if (node.matches(tokenSelector)) {
        queueToken(node);
      }
      for (const token of node.querySelectorAll(tokenSelector)) {
        queueToken(token);
      }
    }
    function attachViewLines(root) {
      if (viewLineObservers.has(root)) {
        return;
      }
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === "characterData") {
            queueTokensFromNode(record.target);
            continue;
          }
          if (record.type === "attributes") {
            queueTokensFromNode(record.target);
            continue;
          }
          for (const node of record.addedNodes) {
            queueTokensFromNode(node);
          }
        }
      });
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["class"]
      });
      viewLineObservers.set(root, observer);
      queueTokensFromNode(root);
      if (!hasTokenPalette) {
        scheduleProfileRefresh();
      }
    }
    function pruneViewLines() {
      for (const [root, observer] of viewLineObservers) {
        if (!root.isConnected) {
          observer.disconnect();
          viewLineObservers.delete(root);
        }
      }
    }
    function discoverViewLines(node) {
      if (!(node instanceof Element)) {
        return;
      }
      if (node.matches(rootSelector)) {
        attachViewLines(node);
      }
      for (const root of node.querySelectorAll(rootSelector)) {
        attachViewLines(root);
      }
    }
    function fallbackAccentHue() {
      const styles = [getComputedStyle(document.documentElement), getComputedStyle(document.body)];
      const accentColors = styles.flatMap(
        (style) => options.accentVariables.map((variableName) => style.getPropertyValue(variableName))
      );
      return pickAccentHue(accentColors) ?? DEFAULT_ANCHOR_HUE;
    }
    function resolveAnchorHue() {
      const tokenColors = [];
      for (const token of document.querySelectorAll(tokenSelector)) {
        const text = (token.textContent || "").replace(/\u00a0/g, " ").trim();
        if (!text || isPunctuationOnly(text)) {
          continue;
        }
        tokenColors.push(getComputedStyle(token).color);
      }
      const paletteHue = rankPaletteAnchorHue(tokenColors);
      hasTokenPalette = paletteHue !== null;
      return paletteHue ?? fallbackAccentHue();
    }
    function refreshProfile() {
      if (disposed) {
        return;
      }
      if (profileRefreshTimer !== null) {
        globalThis.clearTimeout(profileRefreshTimer);
        profileRefreshTimer = null;
      }
      anchorHue = resolveAnchorHue();
      context = options.gradientContext ? options.gradientContext() : NO_CONTEXT;
      profileVersion += 1;
      colorCache.clear();
      pruneViewLines();
      for (const root of viewLineObservers.keys()) {
        queueTokensFromNode(root);
      }
      document.documentElement.dataset.woodfishOverlayProfile = `h${anchorHue.toFixed(1)}`;
    }
    function scheduleProfileRefresh() {
      if (profileRefreshTimer !== null) {
        return;
      }
      profileRefreshTimer = globalThis.setTimeout(refreshProfile, 60);
    }
    function tokenPaletteSignature() {
      const palette = /* @__PURE__ */ new Map();
      for (const token of document.querySelectorAll(tokenSelector)) {
        const className = token.className;
        if (typeof className !== "string" || palette.has(className)) {
          continue;
        }
        palette.set(className, getComputedStyle(token).color);
        if (palette.size >= PALETTE_SIGNATURE_LIMIT) {
          break;
        }
      }
      return [...palette.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([className, color]) => `${className}:${color}`).join(",");
    }
    const signatureHelpers = { tokenPaletteSignature };
    const themeSignature = () => options.themeSignature(signatureHelpers);
    const discoveryObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          discoverViewLines(node);
        }
      }
    });
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
    for (const root of document.querySelectorAll(rootSelector)) {
      attachViewLines(root);
    }
    let lastThemeSignature = themeSignature();
    const themeObserver = new MutationObserver(() => {
      scheduleProfileRefresh();
    });
    const themeAttributeFilter = [...options.themeAttributes];
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: themeAttributeFilter
    });
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: themeAttributeFilter
    });
    const themeInterval = globalThis.setInterval(() => {
      pruneViewLines();
      const nextSignature = themeSignature();
      if (nextSignature !== lastThemeSignature) {
        lastThemeSignature = nextSignature;
        scheduleProfileRefresh();
      }
    }, pollIntervalMs);
    refreshProfile();
    return {
      refresh: refreshProfile,
      update: (params) => {
        settings = { ...params };
        refreshProfile();
      },
      observeRoot: (root) => {
        if (!disposed) {
          attachViewLines(root);
        }
      },
      dispose: () => {
        if (disposed) {
          return;
        }
        disposed = true;
        discoveryObserver.disconnect();
        themeObserver.disconnect();
        for (const observer of viewLineObservers.values()) {
          observer.disconnect();
        }
        viewLineObservers.clear();
        globalThis.clearInterval(themeInterval);
        if (profileRefreshTimer !== null) {
          globalThis.clearTimeout(profileRefreshTimer);
        }
        if (frameId !== 0) {
          cancelAnimationFrame(frameId);
        }
        delete document.documentElement.dataset.woodfishOverlayProfile;
      }
    };
  }

  // ../../packages/renderer-runtime/src/styleManager.ts
  function createStyleManager(options) {
    const mounted = /* @__PURE__ */ new Map();
    const container = options.container ?? (() => document.head);
    function create(name) {
      const element = document.createElement("style");
      element.id = `${options.idPrefix}${name}`;
      for (const [attribute, value] of Object.entries(options.nodeAttributes ?? {})) {
        element.setAttribute(attribute, value);
      }
      return element;
    }
    function remove(name) {
      mounted.get(name)?.remove();
      mounted.delete(name);
    }
    return {
      upsert(name, css) {
        if (css.trim().length === 0) {
          remove(name);
          return;
        }
        let element = mounted.get(name);
        if (!element || !element.isConnected) {
          element = create(name);
          mounted.set(name, element);
          container().append(element);
        }
        if (element.textContent !== css) {
          element.textContent = css;
        }
      },
      remove,
      removeAll() {
        for (const element of mounted.values()) {
          element.remove();
        }
        mounted.clear();
      },
      names() {
        return [...mounted.keys()];
      }
    };
  }

  // ../../packages/renderer-runtime/src/disposers.ts
  function createDisposerRegistry() {
    const disposers2 = [];
    return {
      add(disposer) {
        disposers2.push(disposer);
      },
      disposeAll() {
        for (const dispose of disposers2.splice(0)) {
          try {
            dispose();
          } catch {
          }
        }
      },
      get size() {
        return disposers2.length;
      }
    };
  }

  // ../../packages/renderer-runtime/src/controller.ts
  function host() {
    return globalThis;
  }
  function readController(key) {
    const value = host()[key];
    return value !== null && typeof value === "object" ? value : void 0;
  }
  function disposeController(key) {
    const previous = readController(key);
    if (previous && typeof previous.dispose === "function") {
      previous.dispose();
    }
  }
  function installController(key, controller) {
    host()[key] = controller;
    return controller;
  }

  // ../../packages/renderer-runtime/src/cssVariables.ts
  function readNumberVariable(name, fallback) {
    const value = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(name)
    );
    return Number.isFinite(value) ? value : fallback;
  }
  function readStringVariable(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // ../../packages/renderer-runtime/src/steps.ts
  function runSteps(steps, onError) {
    let refresh = () => void 0;
    const failures = [];
    steps.forEach((step, index) => {
      try {
        const result = step();
        if (typeof result === "function") {
          refresh = result;
        }
      } catch (error) {
        const failure = { index, error };
        failures.push(failure);
        onError(failure);
      }
    });
    return { refresh, failures };
  }

  // ../../packages/renderer-runtime/src/acrylic.ts
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  var ACRYLIC_FILTER_ID = "woodfish-acrylic";
  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NAMESPACE, name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  }
  function mountAcrylicFilter(options) {
    const blur = Math.max(0, options.blur);
    const host2 = svgElement("svg", {
      width: 0,
      height: 0,
      "aria-hidden": "true",
      "data-woodfish-theme": "acrylic",
      style: "position:absolute;width:0;height:0;pointer-events:none",
      ...options.nodeAttributes ?? {}
    });
    const filter = svgElement("filter", {
      id: ACRYLIC_FILTER_ID,
      x: 0,
      y: 0,
      width: "100%",
      height: "100%",
      "color-interpolation-filters": "sRGB"
    });
    filter.append(
      svgElement("feGaussianBlur", {
        in: "SourceGraphic",
        stdDeviation: blur,
        edgeMode: "duplicate",
        result: "blur"
      }),
      svgElement("feTurbulence", {
        type: "fractalNoise",
        baseFrequency: 0.8,
        numOctaves: 3,
        stitchTiles: "stitch",
        result: "noise"
      }),
      svgElement("feColorMatrix", {
        in: "noise",
        type: "matrix",
        values: "0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.03 0",
        result: "grain"
      }),
      svgElement("feBlend", { in: "grain", in2: "blur", mode: "overlay" })
    );
    const definitions = svgElement("defs", {});
    host2.append(definitions);
    definitions.append(filter);
    document.body.append(host2);
    return () => host2.remove();
  }

  // ../../packages/renderer-runtime/src/tokenCss.ts
  function formatCssNumber(value) {
    return Number(value.toFixed(4)).toString();
  }
  function buildNoiseDataUri(opacity) {
    const svg = [
      "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>",
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/>",
      "<feColorMatrix type='saturate' values='0'/></filter>",
      `<rect width='100%' height='100%' filter='url(#n)' opacity='${formatCssNumber(opacity)}'/>`,
      "</svg>"
    ].join("");
    return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}")`;
  }

  // ../../packages/renderer-runtime/src/reveal.ts
  function startReveal(options) {
    const targetSelector = options.targets.join(",");
    let current = null;
    let pending = null;
    let frame = 0;
    function clear() {
      if (current) {
        current.removeAttribute("data-woodfish-reveal");
        current.style.removeProperty("--woodfish-reveal-x");
        current.style.removeProperty("--woodfish-reveal-y");
        current = null;
      }
    }
    function paint() {
      frame = 0;
      if (!pending) {
        return;
      }
      const { target, x, y } = pending;
      pending = null;
      const element = target instanceof Element ? target.closest(targetSelector) : null;
      if (element !== current) {
        clear();
        current = element;
        if (current) {
          current.setAttribute("data-woodfish-reveal", "true");
        }
      }
      if (current) {
        const bounds = current.getBoundingClientRect();
        current.style.setProperty("--woodfish-reveal-x", `${Math.round(x - bounds.left)}px`);
        current.style.setProperty("--woodfish-reveal-y", `${Math.round(y - bounds.top)}px`);
      }
    }
    function onPointerMove(event) {
      pending = { target: event.target, x: event.clientX, y: event.clientY };
      if (frame === 0) {
        frame = requestAnimationFrame(paint);
      }
    }
    function onPointerLeave() {
      pending = null;
      clear();
    }
    document.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      clear();
    };
  }

  // ../../packages/renderer-runtime/src/effectHost.ts
  var RAINBOW = Object.freeze([
    "#ff2d95",
    "#ff4500",
    "#ffd700",
    "#7cfc00",
    "#00ffff",
    "#1e90ff",
    "#9370db",
    "#ff00ff",
    "#ff1493"
  ]);
  var MAX_ERRORS = 3;
  var LAYER_Z_INDEX = "2147483000";
  function message(error) {
    return error instanceof Error ? error.message : String(error);
  }
  function sameValues(left, right) {
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
  }
  function startEffectHost(options) {
    const styles = createStyleManager({
      idPrefix: options.idPrefix,
      nodeAttributes: options.nodeAttributes,
      container: () => document.head ?? document.documentElement
    });
    const sources = /* @__PURE__ */ new Map();
    const running = /* @__PURE__ */ new Map();
    const failures = /* @__PURE__ */ new Map();
    const painters = /* @__PURE__ */ new Set();
    const motionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    let layer = null;
    let canvas = null;
    let graphics = null;
    let frame = 0;
    let lastFrame = 0;
    let painted = false;
    let themeCache = null;
    let disposed = false;
    const reducedMotion = () => Boolean(motionQuery?.matches) || Boolean(options.reducedMotion?.());
    const active = () => document.visibilityState !== "hidden" && document.hasFocus();
    function theme() {
      themeCache ??= options.theme();
      return themeCache;
    }
    function ensureLayer() {
      if (layer?.isConnected) {
        return layer;
      }
      layer = document.createElement("div");
      layer.setAttribute("data-woodfish-effects-layer", "true");
      layer.setAttribute("aria-hidden", "true");
      for (const [name, value] of Object.entries(options.nodeAttributes ?? {})) {
        layer.setAttribute(name, value);
      }
      layer.style.cssText = `position:fixed;inset:0;z-index:${LAYER_Z_INDEX};pointer-events:none;overflow:hidden;contain:strict;`;
      (document.body ?? document.documentElement).append(layer);
      return layer;
    }
    function ensureCanvas() {
      if (graphics && canvas?.isConnected) {
        return graphics;
      }
      canvas = document.createElement("canvas");
      canvas.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;";
      ensureLayer().append(canvas);
      graphics = canvas.getContext("2d");
      resize();
      return graphics;
    }
    function resize() {
      if (!canvas) {
        return;
      }
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(innerWidth * ratio));
      canvas.height = Math.max(1, Math.round(innerHeight * ratio));
      painted = true;
      schedule();
    }
    function clear() {
      if (graphics && canvas && painted) {
        graphics.setTransform(1, 0, 0, 1, 0, 0);
        graphics.clearRect(0, 0, canvas.width, canvas.height);
        painted = false;
      }
    }
    function schedule() {
      if (frame === 0 && !disposed && active()) {
        frame = requestAnimationFrame(loop);
      }
    }
    function loop() {
      frame = 0;
      const g = ensureCanvas();
      if (!g || !active()) {
        clear();
        return;
      }
      const now = performance.now();
      const dt = Math.min(64, now - lastFrame || 16.7);
      lastFrame = now;
      clear();
      const ratio = window.devicePixelRatio || 1;
      let busy = false;
      for (const entry of painters) {
        if (!entry.awake || entry.owner.stopped) {
          continue;
        }
        g.setTransform(ratio, 0, 0, ratio, 0, 0);
        g.save();
        let keep = false;
        try {
          keep = entry.fn(g, now, dt) !== false;
        } catch (error) {
          report(entry.owner, error);
        }
        g.restore();
        painted = true;
        entry.awake = keep;
        busy ||= keep;
      }
      if (busy || painted) {
        schedule();
      }
    }
    const PAUSED_ATTRIBUTE = "data-woodfish-paused";
    function onFocusChange() {
      document.documentElement.toggleAttribute(PAUSED_ATTRIBUTE, !active());
      if (active()) {
        lastFrame = performance.now();
        schedule();
      } else {
        if (frame !== 0) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        clear();
      }
    }
    document.documentElement.toggleAttribute(PAUSED_ATTRIBUTE, !active());
    window.addEventListener("resize", resize);
    window.addEventListener("focus", onFocusChange);
    window.addEventListener("blur", onFocusChange);
    document.addEventListener("visibilitychange", onFocusChange);
    function report(owner, error) {
      owner.errors += 1;
      const text = message(error);
      options.log?.(owner.source.id, text);
      if (owner.errors >= MAX_ERRORS) {
        fail(owner.source.id, `运行出错：${text}`);
      }
    }
    function fail(id, text) {
      stop(id);
      failures.set(id, text);
      options.onError?.(id, text);
    }
    function guard(owner, fn) {
      return (...args) => {
        if (owner.stopped) {
          return;
        }
        try {
          fn(...args);
        } catch (error) {
          report(owner, error);
        }
      };
    }
    function mountCss(source) {
      const variables = effectCssVariables(source.id, source.manifest, source.values);
      styles.upsert(
        `${source.id}-vars`,
        variables.length > 0 ? `:root {
  ${variables.join("\n  ")}
}` : ""
      );
      styles.upsert(`${source.id}-css`, source.css ?? "");
    }
    function unmountCss(id) {
      styles.remove(`${id}-vars`);
      styles.remove(`${id}-css`);
      styles.remove(`${id}-js`);
    }
    function createContext(owner) {
      const { source } = owner;
      return {
        id: source.id,
        host: options.host,
        get params() {
          return owner.source.values;
        },
        theme,
        rainbow: RAINBOW,
        selectors: options.selectors ?? {},
        lib: options.lib ?? {},
        onInsert: (handler) => owner.handlers.insert.push(guard(owner, handler)),
        onCaret: (handler) => owner.handlers.caret.push(guard(owner, handler)),
        onStreamEnd: (handler) => owner.handlers.streamEnd.push(guard(owner, handler)),
        onTheme: (handler) => owner.handlers.theme.push(guard(owner, handler)),
        painter: (fn) => {
          const entry = { fn, awake: false, owner };
          painters.add(entry);
          owner.painters.add(entry);
          return {
            wake: () => {
              if (owner.stopped) {
                return;
              }
              entry.awake = true;
              ensureCanvas();
              schedule();
            }
          };
        },
        get layer() {
          return ensureLayer();
        },
        style: (css) => styles.upsert(`${source.id}-js`, css),
        on: (target, type, listener, listenerOptions) => {
          const wrapped = guard(owner, listener);
          target.addEventListener(type, wrapped, listenerOptions);
          owner.cleanups.push(() => target.removeEventListener(type, wrapped, listenerOptions));
        },
        later: (ms, fn) => {
          const timer = globalThis.setTimeout(guard(owner, fn), ms);
          const cancel = () => globalThis.clearTimeout(timer);
          owner.cleanups.push(cancel);
          return cancel;
        },
        simplified: () => reducedMotion() || !active(),
        reducedMotion,
        log: (text) => options.log?.(source.id, text)
      };
    }
    function start2(source) {
      failures.delete(source.id);
      const owner = {
        source,
        instance: {},
        handlers: { insert: [], caret: [], streamEnd: [], theme: [] },
        painters: /* @__PURE__ */ new Set(),
        cleanups: [],
        errors: 0,
        stopped: false
      };
      const context = createContext(owner);
      running.set(source.id, owner);
      mountCss(source);
      if (!source.factory) {
        return;
      }
      try {
        const module = { exports: {} };
        source.factory(module, module.exports);
        if (typeof module.exports !== "function") {
          throw new Error("effect.js 需要 module.exports = function (ctx) { … }");
        }
        const result = module.exports(context);
        owner.instance = result !== null && typeof result === "object" ? result : {};
      } catch (error) {
        fail(source.id, `启动失败：${message(error)}`);
      }
    }
    function stop(id) {
      const owner = running.get(id);
      running.delete(id);
      unmountCss(id);
      if (!owner) {
        return;
      }
      owner.stopped = true;
      for (const entry of owner.painters) {
        painters.delete(entry);
      }
      for (const cleanup of owner.cleanups.splice(0)) {
        try {
          cleanup();
        } catch {
        }
      }
      try {
        owner.instance.dispose?.();
      } catch (error) {
        options.log?.(id, `停止时出错：${message(error)}`);
      }
      painted = true;
      schedule();
    }
    function update(owner, source) {
      owner.source = source;
      mountCss(source);
      if (!owner.instance.update) {
        stop(source.id);
        start2(source);
        return;
      }
      try {
        owner.instance.update(source.values);
      } catch (error) {
        fail(source.id, `更新参数失败：${message(error)}`);
      }
    }
    function applyOne(source) {
      const owner = running.get(source.id);
      const runs = source.manifest.hosts.includes(options.host);
      if (source.error || !runs) {
        if (owner) {
          stop(source.id);
        }
        return;
      }
      if (source.manifest.core) {
        options.core?.(source.manifest.core, source.values.enabled ? source.values : null);
        if (source.values.enabled) {
          mountCss(source);
        } else {
          unmountCss(source.id);
        }
        return;
      }
      if (!source.values.enabled) {
        if (owner) {
          stop(source.id);
        }
        failures.delete(source.id);
        return;
      }
      if (owner && owner.source.hash === source.hash && !failures.has(source.id)) {
        if (!sameValues(owner.source.values, source.values)) {
          update(owner, source);
        }
        return;
      }
      if (owner) {
        stop(source.id);
      }
      if (failures.has(source.id) && owner === void 0 && sources.get(source.id)?.hash === source.hash) {
        return;
      }
      start2(source);
    }
    function owners() {
      return [...running.values()];
    }
    return {
      apply(next) {
        if (disposed) {
          return;
        }
        const seen = /* @__PURE__ */ new Set();
        for (const source of next) {
          if (seen.has(source.id)) {
            continue;
          }
          seen.add(source.id);
          const previous = sources.get(source.id);
          if (previous && previous.hash !== source.hash) {
            failures.delete(source.id);
          }
          applyOne(source);
          sources.set(source.id, source);
        }
        for (const [id, source] of [...sources]) {
          if (!seen.has(id)) {
            sources.delete(id);
            failures.delete(id);
            if (source.manifest.core) {
              options.core?.(source.manifest.core, null);
            }
            stop(id);
          }
        }
      },
      preview(id, patch) {
        const source = sources.get(id);
        if (!source || disposed) {
          return null;
        }
        const values = patchEffectValues(source.manifest, source.values, patch);
        const next = { ...source, values };
        if (failures.has(id) && values.enabled !== source.values.enabled) {
          failures.delete(id);
        }
        sources.set(id, next);
        applyOne(next);
        return values;
      },
      insert(event) {
        owners().forEach((owner) => owner.handlers.insert.forEach((handler) => handler(event)));
      },
      caret(event) {
        owners().forEach((owner) => owner.handlers.caret.forEach((handler) => handler(event)));
      },
      streamEnd(event) {
        owners().forEach((owner) => owner.handlers.streamEnd.forEach((handler) => handler(event)));
      },
      themeChanged() {
        themeCache = null;
        owners().forEach((owner) => owner.handlers.theme.forEach((handler) => handler()));
      },
      status() {
        return [...sources.values()].filter((source) => source.error || source.manifest.hosts.includes(options.host)).map((source) => {
          const error = source.error ?? failures.get(source.id);
          const state = error ? "failed" : source.manifest.core ? "core" : running.has(source.id) ? "running" : "off";
          return {
            id: source.id,
            manifest: source.manifest,
            values: normalizeEffectValues(source.manifest, source.values),
            state,
            ...error ? { error } : {}
          };
        }).sort(
          (left, right) => left.manifest.order - right.manifest.order || left.id.localeCompare(right.id)
        );
      },
      dispose() {
        if (disposed) {
          return;
        }
        for (const id of [...running.keys()]) {
          stop(id);
        }
        for (const source of sources.values()) {
          if (source.manifest.core) {
            options.core?.(source.manifest.core, null);
          }
        }
        disposed = true;
        if (frame !== 0) {
          cancelAnimationFrame(frame);
        }
        window.removeEventListener("resize", resize);
        window.removeEventListener("focus", onFocusChange);
        window.removeEventListener("blur", onFocusChange);
        document.removeEventListener("visibilitychange", onFocusChange);
        document.documentElement.removeAttribute(PAUSED_ATTRIBUTE);
        styles.removeAll();
        layer?.remove();
        layer = null;
        canvas = null;
        graphics = null;
        sources.clear();
        failures.clear();
      }
    };
  }

  // browser/effects.ts
  var POLL_MS = 1500;
  var TYPING_WINDOW_MS = 250;
  var HEX = /#[0-9a-f]{6}\b/gi;
  var RAINBOW2 = DEFAULT_CURSOR.gradientStops.map((color) => color.toLowerCase());
  function effectsUrl() {
    const raw = readStringVariable("--woodfish-effects-url").replace(/^["']|["']$/g, "");
    return raw.startsWith("vscode-file://") && raw.endsWith("/") ? raw : null;
  }
  function workbench() {
    return document.querySelector(".monaco-workbench") ?? document.body;
  }
  function vscodeTheme() {
    const host2 = workbench();
    const style = getComputedStyle(host2);
    const variable = (name) => style.getPropertyValue(name).trim();
    const light = host2.classList.contains("vs") || host2.classList.contains("hc-light");
    const root = getComputedStyle(document.documentElement);
    const cursorStops = root.getPropertyValue("--woodfish-cursor-gradient").match(HEX) ?? [];
    const tab = root.getPropertyValue("--woodfish-tab-border-gradient").match(HEX) ?? [];
    const own = cursorStops.length > 1 && cursorStops.join().toLowerCase() !== RAINBOW2.join() ? cursorStops : null;
    const accent = variable("--vscode-editorCursor-foreground") || variable("--vscode-focusBorder") || "#61afea";
    const accent2 = variable("--vscode-textLink-foreground") || accent;
    return {
      mode: light ? "light" : "dark",
      stops: own ?? (tab.length > 1 ? tab : cursorStops.length > 1 ? cursorStops : [accent, accent2]),
      accent,
      accent2,
      background: variable("--vscode-editor-background") || (light ? "#ffffff" : "#1e1e1e"),
      foreground: variable("--vscode-editor-foreground") || (light ? "#000000" : "#d4d4d4"),
      cursor: own
    };
  }
  function typedText(event) {
    if (event.ctrlKey && !event.altKey) {
      return null;
    }
    if (event.metaKey) {
      return null;
    }
    if (event.key === "Enter") {
      return "\n";
    }
    if (event.key === "Tab") {
      return "	";
    }
    if (event.key === "Process" || event.isComposing) {
      return "　";
    }
    return event.key.length === 1 ? event.key : null;
  }
  function watchMonaco(host2) {
    let editor = null;
    let observer = null;
    let frame = 0;
    let typed = null;
    let lastKey = "";
    let rate = 0;
    let rateAt = 0;
    function primaryCursor() {
      const layer = editor?.querySelector(".cursors-layer");
      if (!layer) {
        return null;
      }
      return [...layer.querySelectorAll(".cursor")].find(
        (cursor) => cursor.style.display !== "none" && cursor.style.visibility !== "hidden"
      ) ?? null;
    }
    function hide() {
      if (lastKey) {
        lastKey = "";
        host2.caret({ x: 0, y: 0, width: 0, height: 0, source: "user", visible: false });
      }
    }
    function flush() {
      frame = 0;
      const cursor = editor?.classList.contains("focused") ? primaryCursor() : null;
      const layer = cursor?.parentElement;
      if (!cursor || !layer) {
        hide();
        return;
      }
      const box = layer.getBoundingClientRect();
      const x = box.left + (Number.parseFloat(cursor.style.left) || 0);
      const y = box.top + (Number.parseFloat(cursor.style.top) || 0);
      const width = cursor.offsetWidth || Number.parseFloat(cursor.style.width) || 2;
      const height = cursor.offsetHeight || Number.parseFloat(cursor.style.height) || 18;
      const key = `${Math.round(x)},${Math.round(y)}`;
      if (key === lastKey) {
        return;
      }
      lastKey = key;
      const now = performance.now();
      if (typed && now - typed.at < TYPING_WINDOW_MS) {
        const seconds = Math.max(0.016, (now - rateAt) / 1e3);
        rate = rateAt === 0 ? typed.text.length / seconds : rate * 0.7 + typed.text.length / seconds * 0.3;
        rateAt = now;
        host2.insert({
          x,
          y,
          height,
          text: typed.text,
          source: "user",
          rate,
          rects: [],
          block: editor,
          node: null,
          start: 0
        });
        typed = null;
      }
      host2.caret({ x, y, width, height, source: "user", visible: true });
    }
    function schedule() {
      if (frame === 0) {
        frame = requestAnimationFrame(flush);
      }
    }
    function follow() {
      const next = document.activeElement?.closest(".monaco-editor") ?? null;
      if (next !== editor) {
        observer?.disconnect();
        editor = next;
        const layer = editor?.querySelector(".cursors-layer");
        if (layer) {
          observer = new MutationObserver(schedule);
          observer.observe(layer, { attributes: true, childList: true, subtree: true });
        }
      }
      schedule();
    }
    function onKeyDown(event) {
      const keyboard = event;
      if (!(keyboard.target instanceof Element) || !keyboard.target.closest(".monaco-editor")) {
        return;
      }
      const text = typedText(keyboard);
      if (text !== null) {
        typed = { text, at: performance.now() };
      }
    }
    function onPaste(event) {
      if (event.target instanceof Element && event.target.closest(".monaco-editor")) {
        typed = {
          text: event.clipboardData?.getData("text") || " ",
          at: performance.now()
        };
      }
    }
    const listeners = [
      [document, "focusin", follow],
      [document, "focusout", follow],
      [document, "keydown", onKeyDown],
      [document, "paste", onPaste],
      [window, "resize", schedule]
    ];
    for (const [target, type, listener] of listeners) {
      target.addEventListener(type, listener, { capture: true, passive: true });
    }
    follow();
    return () => {
      for (const [target, type, listener] of listeners) {
        target.removeEventListener(type, listener, { capture: true });
      }
      observer?.disconnect();
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
    };
  }
  function startEffects() {
    const base = effectsUrl();
    if (!base) {
      return;
    }
    const host2 = startEffectHost({
      host: "vscode",
      theme: vscodeTheme,
      selectors: { editorRoot: ".monaco-editor", editor: ".monaco-editor" },
      lib: {
        startReveal,
        mountAcrylicFilter,
        acrylicFilterId: ACRYLIC_FILTER_ID,
        noiseDataUri: buildNoiseDataUri
      },
      idPrefix: "woodfish-fx-",
      reducedMotion: () => workbench().classList.contains("monaco-reduce-motion"),
      onError: (id, message2) => console.warn(`[Woodfish] 效果 ${id}：${message2}`),
      log: (id, message2) => console.warn(`[Woodfish] 效果 ${id}：${message2}`)
    });
    const typing = watchMonaco(host2);
    const themeObserver = new MutationObserver(() => host2.themeChanged());
    themeObserver.observe(workbench(), { attributes: true, attributeFilter: ["class"] });
    let version = "";
    let reload;
    let timer = 0;
    let disposed = false;
    async function poll() {
      const active = document.visibilityState === "visible" && document.hasFocus();
      if (!disposed && (active || version === "")) {
        try {
          const response = await fetch(`${base}effects.json?t=${Date.now()}`, { cache: "no-store" });
          const next = await response.json();
          const key = `${String(next.hash)}|${String(next.reload)}`;
          if (response.ok && key !== version) {
            const module = await import(`${base}effects.mjs?v=${encodeURIComponent(key)}`);
            const list = Array.isArray(module.default) ? module.default : [];
            if (next.reload !== reload) {
              host2.apply([]);
              reload = next.reload;
            }
            host2.apply(list);
            version = key;
          }
        } catch (error) {
          console.warn("[Woodfish] 加载效果失败", error);
        }
      }
      if (!disposed) {
        timer = window.setTimeout(() => void poll(), POLL_MS);
      }
    }
    void poll();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      themeObserver.disconnect();
      typing();
      host2.dispose();
    };
  }

  // browser/overlay-bootstrap.ts
  var VERSION = "7.2.0";
  var CONTROLLER_KEY = "__woodfishOverlayController";
  var TOKEN_SELECTOR = '.monaco-editor .view-lines span[class*="mtk"]:not(.cursor):not(.colorpicker-color-decoration)';
  var VIEW_LINES_SELECTOR = ".monaco-editor .view-lines";
  var MAX_TOKENS_PER_FRAME = 600;
  var THEME_POLL_INTERVAL_MS = 1200;
  var ACCENT_VARIABLES = [
    "--vscode-activityBarBadge-background",
    "--vscode-editorCursor-foreground",
    "--vscode-focusBorder",
    "--vscode-textLink-foreground"
  ];
  var REVEAL_TARGETS = [
    ".monaco-list-row",
    ".action-menu-item",
    ".monaco-button",
    ".tabs-container > .tab",
    ".statusbar-item",
    ".activitybar .action-item",
    ".composite-bar .action-item",
    ".pane-header"
  ];
  disposeController(CONTROLLER_KEY);
  var OWN_TOKEN_CLASS = /^(?:mtk\w*|bracket-highlighting-\d+)$/;
  function hasForeignDecoration(token) {
    const className = token.className;
    if (typeof className !== "string") {
      return false;
    }
    return className.split(/\s+/).some((name) => name.length > 0 && !OWN_TOKEN_CLASS.test(name));
  }
  var disposers = createDisposerRegistry();
  function readGradientContext() {
    const host2 = document.querySelector(".monaco-workbench") ?? document.body;
    const style = getComputedStyle(host2);
    const background = style.getPropertyValue("--vscode-editor-background").trim() || null;
    const foreground = style.getPropertyValue("--vscode-editor-foreground").trim() || null;
    return {
      background,
      foreground,
      preset: background && foreground ? detectGradientPreset(background, foreground) : null
    };
  }
  function startTokens() {
    if (readNumberVariable("--woodfish-overlay-tokens", 1) !== 1) {
      return;
    }
    const engine = startTextGradientEngine({
      tokenSelector: TOKEN_SELECTOR,
      rootSelector: VIEW_LINES_SELECTOR,
      acceptToken: (token) => !hasForeignDecoration(token),
      params: {
        hueShift: readNumberVariable("--woodfish-overlay-hue-shift", DEFAULT_TEXT_GRADIENT.hueShift),
        lightnessDelta: readNumberVariable(
          "--woodfish-overlay-lightness-delta",
          DEFAULT_TEXT_GRADIENT.lightnessDelta
        ),
        neutralChroma: readNumberVariable(
          "--woodfish-overlay-neutral-chroma",
          DEFAULT_TEXT_GRADIENT.neutralChroma
        )
      },
      gradientContext: readGradientContext,
      accentVariables: ACCENT_VARIABLES,
      themeAttributes: ["class", "data-color-theme"],
      themeSignature: ({ tokenPaletteSignature }) => {
        const rootStyle = getComputedStyle(document.documentElement);
        const bodyStyle = getComputedStyle(document.body);
        return [
          rootStyle.getPropertyValue("--vscode-editor-background"),
          rootStyle.getPropertyValue("--vscode-editor-foreground"),
          rootStyle.getPropertyValue("--vscode-activityBarBadge-background"),
          bodyStyle.getPropertyValue("--vscode-editor-background"),
          document.documentElement.className,
          document.body.className,
          tokenPaletteSignature()
        ].join("|");
      },
      pollIntervalMs: THEME_POLL_INTERVAL_MS,
      maxTokensPerFrame: MAX_TOKENS_PER_FRAME
    });
    disposers.add(() => engine.dispose());
    return engine.refresh;
  }
  function startAcrylicFilter() {
    if (readStringVariable("--woodfish-glass-mode") !== "acrylic") {
      return;
    }
    disposers.add(
      mountAcrylicFilter({
        blur: readNumberVariable("--woodfish-glass-blur", DEFAULT_GLASS.blur)
      })
    );
  }
  function startRevealHighlight() {
    if (readNumberVariable("--woodfish-reveal-enabled", 0) !== 1) {
      return;
    }
    disposers.add(startReveal({ targets: REVEAL_TARGETS }));
  }
  function startEffectPlugins() {
    const stop = startEffects();
    if (stop) {
      disposers.add(stop);
    }
  }
  function start() {
    if (!document.body) {
      globalThis.setTimeout(start, 0);
      return;
    }
    const { refresh } = runSteps(
      [startTokens, startAcrylicFilter, startRevealHighlight, startEffectPlugins],
      (failure) => console.warn("[Woodfish] overlay step failed", failure.error)
    );
    document.documentElement.dataset.woodfishOverlay = "active";
    document.documentElement.dataset.woodfishOverlayVersion = VERSION;
    installController(CONTROLLER_KEY, {
      version: VERSION,
      refresh,
      dispose() {
        disposers.disposeAll();
        delete document.documentElement.dataset.woodfishOverlay;
        delete document.documentElement.dataset.woodfishOverlayVersion;
      }
    });
  }
  start();
})();
