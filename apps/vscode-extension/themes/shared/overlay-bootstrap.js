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

  // ../../packages/theme-core/src/color/format.ts
  function formatRgba(color, alpha) {
    return `rgba(${Math.round(clamp(color.r, 0, 255))}, ${Math.round(
      clamp(color.g, 0, 255)
    )}, ${Math.round(clamp(color.b, 0, 255))}, ${Number(clamp(alpha).toFixed(4))})`;
  }

  // ../../packages/theme-core/src/gradient/tokenGradient.ts
  var NEUTRAL_CHROMA_THRESHOLD = 0.045;
  var DEFAULT_ANCHOR_HUE = 300;
  function offsetLightness(lightness, delta) {
    const shifted = lightness + delta;
    if (shifted >= 0 && shifted <= 1) {
      return shifted;
    }
    return clamp(lightness - delta);
  }
  function deriveTokenGradient(cssColor, options) {
    const parsed = parseCssColor(cssColor);
    if (!parsed) {
      return null;
    }
    const base = rgbToOklch(parsed);
    const neutral = base.c < NEUTRAL_CHROMA_THRESHOLD;
    const hue = neutral ? options.anchorHue : base.h;
    const chroma = neutral ? Math.max(base.c, options.neutralChroma) : base.c;
    const light = gamutMapOklch({
      l: offsetLightness(base.l, options.lightnessDelta),
      c: chroma,
      h: hue - options.hueShift
    });
    const dark = gamutMapOklch({
      l: offsetLightness(base.l, -options.lightnessDelta),
      c: chroma,
      h: hue + options.hueShift
    });
    const nearOpacity = options.punctuation ? 0.28 : neutral ? 0.58 : 0.72;
    const midOpacity = options.punctuation ? 0.12 : neutral ? 0.28 : 0.42;
    const farOpacity = neutral ? 0.12 : 0.2;
    return {
      light: formatRgba(light, parsed.alpha),
      base: formatRgba(parsed, parsed.alpha),
      dark: formatRgba(dark, parsed.alpha),
      glowNear: formatRgba(parsed, parsed.alpha * nearOpacity),
      glowMid: formatRgba(parsed, parsed.alpha * midOpacity),
      glowFar: formatRgba(parsed, parsed.alpha * farOpacity),
      punctuationNear: formatRgba(parsed, parsed.alpha * 0.28),
      punctuationFar: formatRgba(parsed, parsed.alpha * 0.12),
      neutral
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
    hueShift: 24,
    lightnessDelta: 0.06,
    neutralChroma: 0.06,
    angle: 90
  });
  var DEFAULT_GLASS = /* @__PURE__ */ Object.freeze({
    mode: "blur",
    blur: 30,
    saturate: 125,
    opacity: 0.7,
    noise: 0.02,
    borderRadius: 0
  });

  // ../../packages/renderer-runtime/src/textGradientEngine.ts
  var TOKEN_MARKER_ATTRIBUTE = "data-woodfish-overlay-token";
  var TOKEN_VARIABLES = {
    gradientLight: "--woodfish-overlay-gradient-light",
    gradientBase: "--woodfish-overlay-gradient-base",
    gradientDark: "--woodfish-overlay-gradient-dark",
    glowNear: "--woodfish-overlay-glow-near",
    glowMid: "--woodfish-overlay-glow-mid",
    glowFar: "--woodfish-overlay-glow-far",
    punctuationGlowNear: "--woodfish-overlay-punctuation-glow-near",
    punctuationGlowFar: "--woodfish-overlay-punctuation-glow-far"
  };
  var DEFAULT_POLL_INTERVAL_MS = 1200;
  var DEFAULT_MAX_TOKENS_PER_FRAME = 600;
  var PALETTE_SIGNATURE_LIMIT = 24;
  function startTextGradientEngine(options) {
    const tokenSelector = options.tokenSelector;
    const rootSelector = options.rootSelector;
    const acceptToken = options.acceptToken ?? (() => true);
    const MAX_TOKENS_PER_FRAME2 = options.maxTokensPerFrame ?? DEFAULT_MAX_TOKENS_PER_FRAME;
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    let settings = { ...options.params };
    const pendingTokens = /* @__PURE__ */ new Set();
    const tokenState = /* @__PURE__ */ new WeakMap();
    const colorCache = /* @__PURE__ */ new Map();
    const viewLineObservers = /* @__PURE__ */ new Map();
    let anchorHue = DEFAULT_ANCHOR_HUE;
    let profileVersion = 0;
    let frameId = 0;
    let profileRefreshTimer = null;
    let hasTokenPalette = false;
    let disposed = false;
    function deriveTokenColors(cssColor, punctuation) {
      const cacheKey = [
        cssColor,
        anchorHue.toFixed(3),
        settings.hueShift,
        settings.lightnessDelta,
        settings.neutralChroma,
        punctuation ? "punctuation" : "token"
      ].join("|");
      const cached = colorCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      const result = deriveTokenGradient(cssColor, { ...settings, anchorHue, punctuation });
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
        return;
      }
      token.style.setProperty(TOKEN_VARIABLES.gradientLight, colors.light);
      token.style.setProperty(TOKEN_VARIABLES.gradientBase, colors.base);
      token.style.setProperty(TOKEN_VARIABLES.gradientDark, colors.dark);
      token.style.setProperty(TOKEN_VARIABLES.glowNear, colors.glowNear);
      token.style.setProperty(TOKEN_VARIABLES.glowMid, colors.glowMid);
      token.style.setProperty(TOKEN_VARIABLES.glowFar, colors.glowFar);
      token.style.setProperty(TOKEN_VARIABLES.punctuationGlowNear, colors.punctuationNear);
      token.style.setProperty(TOKEN_VARIABLES.punctuationGlowFar, colors.punctuationFar);
      token.dataset.woodfishOverlayToken = "true";
      token.dataset.woodfishNeutral = colors.neutral ? "true" : "false";
      token.dataset.woodfishPunctuation = punctuation ? "true" : "false";
      tokenState.set(token, {
        profileVersion,
        cssColor,
        punctuation
      });
    }
    function flushTokens() {
      frameId = 0;
      let processed = 0;
      for (const token of pendingTokens) {
        pendingTokens.delete(token);
        applyToken(token);
        processed += 1;
        if (processed >= MAX_TOKENS_PER_FRAME2) {
          break;
        }
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

  // browser/overlay-bootstrap.ts
  var VERSION = "7.0.0";
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
  function start() {
    if (!document.body) {
      globalThis.setTimeout(start, 0);
      return;
    }
    const { refresh } = runSteps(
      [startTokens, startAcrylicFilter, startRevealHighlight],
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
