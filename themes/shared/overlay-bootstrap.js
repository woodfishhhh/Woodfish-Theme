(() => {
  'use strict';

  const VERSION = '6.0.0-beta.1';
  const TOKEN_SELECTOR =
    '.monaco-editor .view-lines span[class*="mtk"]:not(.cursor):not(.colorpicker-color-decoration)';
  const VIEW_LINES_SELECTOR = '.monaco-editor .view-lines';
  const CONTROLLER_KEY = '__woodfishOverlayController';
  const NEUTRAL_CHROMA_THRESHOLD = 0.045;
  const MAX_TOKENS_PER_FRAME = 600;
  const THEME_POLL_INTERVAL_MS = 1200;

  const previousController = globalThis[CONTROLLER_KEY];
  if (previousController && typeof previousController.dispose === 'function') {
    previousController.dispose();
  }

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function parseCssColor(value) {
    const hexadecimal = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(value.trim());
    if (hexadecimal) {
      const compact = hexadecimal[1];
      const expanded =
        compact.length <= 4
          ? [...compact].map((channel) => `${channel}${channel}`).join('')
          : compact;
      return {
        r: Number.parseInt(expanded.slice(0, 2), 16),
        g: Number.parseInt(expanded.slice(2, 4), 16),
        b: Number.parseInt(expanded.slice(4, 6), 16),
        alpha:
          expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
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
      alpha: clamp(channels[3] === undefined ? 1 : Number(channels[3])),
    };
  }

  function srgbToLinear(value) {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }

  function linearToSrgb(value) {
    const channel =
      value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
    return channel * 255;
  }

  function rgbToOklch(color) {
    const red = srgbToLinear(color.r);
    const green = srgbToLinear(color.g);
    const blue = srgbToLinear(color.b);
    const lightRoot = Math.cbrt(
      0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue
    );
    const mediumRoot = Math.cbrt(
      0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue
    );
    const shortRoot = Math.cbrt(
      0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue
    );
    const lightness =
      0.2104542553 * lightRoot + 0.793617785 * mediumRoot - 0.0040720468 * shortRoot;
    const a =
      1.9779984951 * lightRoot - 2.428592205 * mediumRoot + 0.4505937099 * shortRoot;
    const b =
      0.0259040371 * lightRoot + 0.7827717662 * mediumRoot - 0.808675766 * shortRoot;

    return {
      l: lightness,
      c: Math.hypot(a, b),
      h: (Math.atan2(b, a) * 180) / Math.PI,
    };
  }

  function oklchToRgb(color) {
    const hue = (color.h * Math.PI) / 180;
    const a = color.c * Math.cos(hue);
    const b = color.c * Math.sin(hue);
    const lightRoot = color.l + 0.3963377774 * a + 0.2158037573 * b;
    const mediumRoot = color.l - 0.1055613458 * a - 0.0638541728 * b;
    const shortRoot = color.l - 0.0894841775 * a - 1.291485548 * b;
    const light = lightRoot ** 3;
    const medium = mediumRoot ** 3;
    const short = shortRoot ** 3;

    return {
      r: linearToSrgb(
        4.0767416621 * light - 3.3077115913 * medium + 0.2309699292 * short
      ),
      g: linearToSrgb(
        -1.2684380046 * light + 2.6097574011 * medium - 0.3413193965 * short
      ),
      b: linearToSrgb(
        -0.0041960863 * light - 0.7034186147 * medium + 1.707614701 * short
      ),
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

  function offsetLightness(lightness, delta) {
    const shifted = lightness + delta;
    if (shifted >= 0 && shifted <= 1) {
      return shifted;
    }

    return clamp(lightness - delta);
  }

  function formatRgba(color, alpha) {
    return `rgba(${Math.round(clamp(color.r, 0, 255))}, ${Math.round(
      clamp(color.g, 0, 255)
    )}, ${Math.round(clamp(color.b, 0, 255))}, ${Number(clamp(alpha).toFixed(4))})`;
  }

  function punctuationOnly(value) {
    const text = value.replace(/\u00a0/g, ' ').trim();
    return text.length > 0 && /^[()[\]{}.,;:+\-*/%=<>!?&|~^@#`'"\\]+$/.test(text);
  }

  function readNumberVariable(name, fallback) {
    const value = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(name)
    );
    return Number.isFinite(value) ? value : fallback;
  }

  function start() {
    if (!document.body) {
      globalThis.setTimeout(start, 0);
      return;
    }

    const settings = {
      hueShift: readNumberVariable('--woodfish-overlay-hue-shift', 24),
      lightnessDelta: readNumberVariable('--woodfish-overlay-lightness-delta', 0.06),
      neutralChroma: readNumberVariable('--woodfish-overlay-neutral-chroma', 0.06),
    };
    const pendingTokens = new Set();
    const tokenState = new WeakMap();
    const colorCache = new Map();
    const viewLineObservers = new Map();
    let anchorHue = 300;
    let profileVersion = 0;
    let frameId = 0;
    let profileRefreshTimer = 0;
    let hasTokenPalette = false;

    function deriveTokenColors(cssColor, punctuation) {
      const cacheKey = [
        cssColor,
        anchorHue.toFixed(3),
        settings.hueShift,
        settings.lightnessDelta,
        settings.neutralChroma,
        punctuation ? 'punctuation' : 'token',
      ].join('|');
      const cached = colorCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const parsed = parseCssColor(cssColor);
      if (!parsed) {
        return null;
      }

      const base = rgbToOklch(parsed);
      const neutral = base.c < NEUTRAL_CHROMA_THRESHOLD;
      const hue = neutral ? anchorHue : base.h;
      const chroma = neutral ? Math.max(base.c, settings.neutralChroma) : base.c;
      const light = gamutMapOklch({
        l: offsetLightness(base.l, settings.lightnessDelta),
        c: chroma,
        h: hue - settings.hueShift,
      });
      const dark = gamutMapOklch({
        l: offsetLightness(base.l, -settings.lightnessDelta),
        c: chroma,
        h: hue + settings.hueShift,
      });
      const nearOpacity = punctuation ? 0.28 : neutral ? 0.58 : 0.72;
      const midOpacity = punctuation ? 0.12 : neutral ? 0.28 : 0.42;
      const farOpacity = neutral ? 0.12 : 0.2;
      const result = {
        light: formatRgba(light, parsed.alpha),
        base: formatRgba(parsed, parsed.alpha),
        dark: formatRgba(dark, parsed.alpha),
        glowNear: formatRgba(parsed, parsed.alpha * nearOpacity),
        glowMid: formatRgba(parsed, parsed.alpha * midOpacity),
        glowFar: formatRgba(parsed, parsed.alpha * farOpacity),
        punctuationNear: formatRgba(parsed, parsed.alpha * 0.28),
        punctuationFar: formatRgba(parsed, parsed.alpha * 0.12),
        neutral,
      };
      colorCache.set(cacheKey, result);
      return result;
    }

    function applyToken(token) {
      if (!token.isConnected) {
        return;
      }

      const cssColor = getComputedStyle(token).color;
      const punctuation = punctuationOnly(token.textContent || '');
      const previous = tokenState.get(token);
      if (
        previous &&
        previous.profileVersion === profileVersion &&
        previous.cssColor === cssColor &&
        previous.punctuation === punctuation
      ) {
        return;
      }

      const colors = deriveTokenColors(cssColor, punctuation);
      if (!colors) {
        token.removeAttribute('data-woodfish-overlay-token');
        return;
      }

      token.style.setProperty('--woodfish-overlay-gradient-light', colors.light);
      token.style.setProperty('--woodfish-overlay-gradient-base', colors.base);
      token.style.setProperty('--woodfish-overlay-gradient-dark', colors.dark);
      token.style.setProperty('--woodfish-overlay-glow-near', colors.glowNear);
      token.style.setProperty('--woodfish-overlay-glow-mid', colors.glowMid);
      token.style.setProperty('--woodfish-overlay-glow-far', colors.glowFar);
      token.style.setProperty(
        '--woodfish-overlay-punctuation-glow-near',
        colors.punctuationNear
      );
      token.style.setProperty(
        '--woodfish-overlay-punctuation-glow-far',
        colors.punctuationFar
      );
      token.dataset.woodfishOverlayToken = 'true';
      token.dataset.woodfishNeutral = colors.neutral ? 'true' : 'false';
      token.dataset.woodfishPunctuation = punctuation ? 'true' : 'false';
      tokenState.set(token, {
        profileVersion,
        cssColor,
        punctuation,
      });
    }

    function flushTokens() {
      frameId = 0;
      let processed = 0;
      for (const token of pendingTokens) {
        pendingTokens.delete(token);
        applyToken(token);
        processed += 1;
        if (processed >= MAX_TOKENS_PER_FRAME) {
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
        const token = node.parentElement && node.parentElement.closest(TOKEN_SELECTOR);
        if (token) {
          queueToken(token);
        }
        return;
      }
      if (!(node instanceof Element)) {
        return;
      }
      if (node.matches(TOKEN_SELECTOR)) {
        queueToken(node);
      }
      for (const token of node.querySelectorAll(TOKEN_SELECTOR)) {
        queueToken(token);
      }
    }

    function attachViewLines(root) {
      if (viewLineObservers.has(root)) {
        return;
      }

      const observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'characterData') {
            queueTokensFromNode(record.target);
            continue;
          }
          if (record.type === 'attributes') {
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
        attributeFilter: ['class'],
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
      if (node.matches(VIEW_LINES_SELECTOR)) {
        attachViewLines(node);
      }
      for (const root of node.querySelectorAll(VIEW_LINES_SELECTOR)) {
        attachViewLines(root);
      }
    }

    function fallbackAccentHue() {
      const styles = [
        getComputedStyle(document.documentElement),
        getComputedStyle(document.body),
      ];
      const variableNames = [
        '--vscode-activityBarBadge-background',
        '--vscode-editorCursor-foreground',
        '--vscode-focusBorder',
        '--vscode-textLink-foreground',
      ];
      let best = null;
      for (const style of styles) {
        for (const variableName of variableNames) {
          const parsed = parseCssColor(style.getPropertyValue(variableName));
          if (!parsed) {
            continue;
          }
          const color = rgbToOklch(parsed);
          if (color.c >= NEUTRAL_CHROMA_THRESHOLD && (!best || color.c > best.c)) {
            best = color;
          }
        }
      }
      return best ? best.h : 300;
    }

    function resolveAnchorHue() {
      const palette = new Map();
      for (const token of document.querySelectorAll(TOKEN_SELECTOR)) {
        const text = (token.textContent || '').replace(/\u00a0/g, ' ').trim();
        if (!text || punctuationOnly(text)) {
          continue;
        }
        const cssColor = getComputedStyle(token).color;
        const parsed = parseCssColor(cssColor);
        if (!parsed) {
          continue;
        }
        const color = rgbToOklch(parsed);
        if (color.c < 0.075 || color.l < 0.4) {
          continue;
        }
        const entry = palette.get(cssColor) || { ...color, count: 0 };
        entry.count += 1;
        palette.set(cssColor, entry);
      }

      const ranked = [...palette.values()].sort(
        (left, right) => right.count * right.c - left.count * left.c
      );
      hasTokenPalette = ranked.length > 0;
      return ranked[0] ? ranked[0].h : fallbackAccentHue();
    }

    function refreshProfile() {
      if (profileRefreshTimer !== 0) {
        globalThis.clearTimeout(profileRefreshTimer);
        profileRefreshTimer = 0;
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
      if (profileRefreshTimer !== 0) {
        return;
      }
      profileRefreshTimer = globalThis.setTimeout(refreshProfile, 60);
    }

    function tokenPaletteSignature() {
      const palette = new Map();
      for (const token of document.querySelectorAll(TOKEN_SELECTOR)) {
        const className = token.className;
        if (typeof className !== 'string' || palette.has(className)) {
          continue;
        }
        palette.set(className, getComputedStyle(token).color);
        if (palette.size >= 24) {
          break;
        }
      }

      return [...palette.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([className, color]) => `${className}:${color}`)
        .join(',');
    }

    function themeSignature() {
      const rootStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      return [
        rootStyle.getPropertyValue('--vscode-editor-background'),
        rootStyle.getPropertyValue('--vscode-editor-foreground'),
        rootStyle.getPropertyValue('--vscode-activityBarBadge-background'),
        bodyStyle.getPropertyValue('--vscode-editor-background'),
        document.documentElement.className,
        document.body.className,
        tokenPaletteSignature(),
      ].join('|');
    }

    const discoveryObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          discoverViewLines(node);
        }
      }
    });
    discoveryObserver.observe(document.body, { childList: true, subtree: true });

    for (const root of document.querySelectorAll(VIEW_LINES_SELECTOR)) {
      attachViewLines(root);
    }

    let lastThemeSignature = themeSignature();
    const themeObserver = new MutationObserver(() => {
      scheduleProfileRefresh();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-color-theme'],
    });
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-color-theme'],
    });

    const themeInterval = globalThis.setInterval(() => {
      pruneViewLines();
      const nextSignature = themeSignature();
      if (nextSignature !== lastThemeSignature) {
        lastThemeSignature = nextSignature;
        scheduleProfileRefresh();
      }
    }, THEME_POLL_INTERVAL_MS);

    refreshProfile();
    document.documentElement.dataset.woodfishOverlay = 'active';
    document.documentElement.dataset.woodfishOverlayVersion = VERSION;

    globalThis[CONTROLLER_KEY] = {
      version: VERSION,
      refresh: refreshProfile,
      dispose() {
        discoveryObserver.disconnect();
        themeObserver.disconnect();
        for (const observer of viewLineObservers.values()) {
          observer.disconnect();
        }
        viewLineObservers.clear();
        globalThis.clearInterval(themeInterval);
        if (profileRefreshTimer !== 0) {
          globalThis.clearTimeout(profileRefreshTimer);
        }
        if (frameId !== 0) {
          cancelAnimationFrame(frameId);
        }
        delete document.documentElement.dataset.woodfishOverlay;
        delete document.documentElement.dataset.woodfishOverlayProfile;
        delete document.documentElement.dataset.woodfishOverlayVersion;
      },
    };
  }

  start();
})();
