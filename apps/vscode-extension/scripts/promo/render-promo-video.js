#!/usr/bin/env node
/*
 * Renders the Woodfish promo video. Every frame is the real product at work, in headless
 * Chrome: the VS Code shots run the built workbench bootstrap on a Monaco-like DOM with
 * the CSS from `buildRuntimeCss` and the shipped effect plugins; the Codex shots run the
 * real Codex overlay and effect plugins on a page laid out like Codex (codex-page.js).
 * A virtual clock (clock.js) makes every frame reproducible. Each page keeps one window
 * size; the camera is the clip each frame is captured with (Chrome re-rasterizes at the
 * clip's scale, so push-ins stay sharp), and overlay-page.js keeps captions fixed on
 * screen. Frames go straight into ffmpeg together with the BGM.
 *
 *   pnpm compile && pnpm runtime:build
 *   node apps/vscode-extension/scripts/promo/render-promo-video.js --bgm <music.mp3>
 *     [--out output/promo/woodfish-7.3-promo.mp4] [--fps 60] [--from <s>] [--to <s>]
 *     [--still 12.3,40] (writes PNG stills instead of a video)
 *
 * Times are seconds of the BGM; the video starts at the storyboard's START.
 * Needs ffmpeg on PATH and Chrome / Edge (CHROME_PATH to override).
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const {
  BOOTSTRAP_URL,
  DARK_MODERN,
  REPO_ROOT,
  core,
  escapeHtml,
  findChrome,
  resolvePalette,
  runtimeCss,
  splitLikeMonaco,
  suggestWidget,
} = require('../lib/scene-kit');
const { launchPage } = require('./cdp');
const { BUILTIN_EFFECTS, buildOverlayBundle, codexPageHtml, effectsPackage } = require('./codex-page');
const { storyboard, START, END } = require('./storyboard');

const WIDTH = 1920;
const HEIGHT = 1080;
/** Window sizes in CSS pixels; the full window fills the frame. */
const PAGES = { codex: { width: 1280, height: 720 }, vscode: { width: 960, height: 540 } };
/** Device pixels per CSS pixel: enough for the effects canvas to stay crisp when pushed in. */
const PIXEL_RATIO = 3;
/** The VS Code page is laid out at half of 1920, so text and effects keep VS Code's proportions. */
const VS_ZOOM = 2;
/** Seconds the camera takes to settle on a moving target (exponential easing). */
const CAMERA_LAG = 0.22;
const FADE_IN = 0.6;
const FADE_OUT = 1.9;
const CAPTION_FADE = 0.3;
/** Seconds rendered (not captured) before the first frame, so trails and particles are live. */
const PREROLL = 2;
const CODE_FONT = "Consolas, 'Microsoft YaHei', monospace";
const UI_FONT = "'Microsoft YaHei UI', 'Segoe UI', sans-serif";
/** The VS Code effects Woodfish ships, on as in the owner's setup (they default to off). */
const VSCODE_EFFECTS_ON = new Set(['caret-trail', 'typing-particles']);
const EFFECTS_VERSION = { hash: 'promo', reload: 0 };

const px = (value) => `${value / VS_ZOOM}px`;

function parseArgs(argv) {
  const options = {
    out: path.join(REPO_ROOT, 'output', 'promo', 'woodfish-7.3-promo.mp4'),
    // The caret trail moves once per animation frame (like VS Code Animations), so 60 fps
    // shows it as long as on a 60 Hz screen.
    fps: 60,
    from: START,
    to: END,
    bgm: null,
    stills: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const [key, value] = [argv[index], argv[index + 1]];
    if (key === '--out') options.out = path.resolve(value);
    else if (key === '--bgm') options.bgm = path.resolve(value);
    else if (key === '--fps') options.fps = Number(value);
    else if (key === '--from') options.from = Number(value);
    else if (key === '--to') options.to = Number(value);
    else if (key === '--still') options.stills = value.split(',').map(Number);
    else throw new Error(`Unknown option ${key}`);
    index += 1;
  }
  if (!options.stills && !options.bgm) {
    throw new Error('--bgm <music> is required to render the video');
  }
  return options;
}

const roleClass = (role) => `mtk${role[0].toUpperCase()}${role.slice(1)}`;
const PALETTES = [...core.WOODFISH_PALETTES, DARK_MODERN];

/** Editor colors per palette, keyed by `data-palette`. */
function paletteCss() {
  return PALETTES.map((palette) => {
    const scope = `[data-palette="${palette.slug}"]`;
    const roles = { ...palette.tokens, fg: palette.ui.fg };
    const tokens = Object.entries(roles)
      .map(([role, color]) => `${scope} .${roleClass(role)} { color: ${color}; }`)
      .join('\n');
    return `.monaco-workbench${scope} { --vscode-editor-background: ${palette.ui.bg}; --vscode-editor-foreground: ${palette.ui.fg}; background: ${palette.ui.bg}; color: ${palette.ui.fg}; }
${scope} .pane-label { color: ${palette.ui.fgMuted ?? palette.ui.fg}; }
${tokens}`;
  }).join('\n');
}

/** The extension's injected CSS for every effect variant the storyboard uses. */
function effectCss() {
  const cursor = { cursor: { enabled: true } };
  const variants = {
    base: runtimeCss(cursor),
    glass: runtimeCss({ ...cursor, glass: { enabled: true, opacity: 0.5, blur: 14 } }),
    'glow-off': runtimeCss({ ...cursor, glow: { enabled: false } }),
  };
  for (let step = 1; step <= 40; step += 1) {
    const intensity = step / 20;
    variants[`glow-${intensity.toFixed(2)}`] = runtimeCss({ ...cursor, glow: { intensity } });
  }
  return variants;
}

/**
 * The effects module the extension writes into global storage, served the way the
 * workbench bootstrap asks for it: `effects.json` through fetch, `effects.mjs` through an
 * import map (headless Chrome has no vscode-file:// scheme).
 */
function vscodeEffectsHead() {
  const module = effectsPackage.buildEffectsModule(
    effectsPackage.readUserEffects(BUILTIN_EFFECTS),
    'vscode',
    (effect) => ({ enabled: VSCODE_EFFECTS_ON.has(effect.id) })
  );
  const base = 'vscode-file://promo/';
  const specifier = `${base}effects.mjs?v=${encodeURIComponent(`${EFFECTS_VERSION.hash}|${EFFECTS_VERSION.reload}`)}`;
  const imports = { [specifier]: `data:text/javascript;base64,${Buffer.from(module).toString('base64')}` };
  return `<script type="importmap">${JSON.stringify({ imports })}</script>
<script>{ const realFetch = window.fetch.bind(window);
window.fetch = (input, init) => String(input).startsWith(${JSON.stringify(`${base}effects.json`)})
  ? Promise.resolve(new Response(${JSON.stringify(JSON.stringify(EFFECTS_VERSION))}, { headers: { 'content-type': 'application/json' } }))
  : realFetch(input, init); }</script>
<style>:root { --woodfish-effects-url: ${JSON.stringify(base)}; }</style>`;
}

function vscodePageHtml(stageUrl, overlayUrl) {
  const suggest = suggestWidget({ font: "15px/24px 'Segoe UI', 'Microsoft YaHei', sans-serif" });
  return `<!doctype html><meta charset="utf-8">${vscodeEffectsHead()}<style>
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
/* The bottom band is kept for captions; code centers in the space above it. */
.monaco-workbench { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding-bottom: ${px(190)}; box-sizing: border-box; }
.panes { display: flex; flex-direction: column; gap: ${px(64)}; width: ${px(1560)}; }
.pane { position: relative; }
.pane-label { font: 600 ${px(24)}/1 ${UI_FONT}; letter-spacing: ${px(2)}; margin-bottom: ${px(18)}; }
.editor { position: relative; }
.inputarea { position: absolute; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; resize: none; }
.view-line { font: ${px(32)}/${px(50)} ${CODE_FONT}; height: ${px(50)}; white-space: pre; }
.pane.large .view-line { font: ${px(44)}/${px(68)} ${CODE_FONT}; height: ${px(68)}; }
.pane.compact .view-line { font: ${px(26)}/${px(42)} ${CODE_FONT}; height: ${px(42)}; }
.pane.centered .view-line { text-align: center; }
.split { display: inline; }
.cursors-layer { position: absolute; inset: 0; pointer-events: none; }
.cursor { position: absolute; width: ${px(6)}; height: ${px(38)}; }
.pane.large .cursor { width: ${px(8)}; height: ${px(54)}; }
.pane.compact .cursor { height: ${px(32)}; }
.suggest-slot { position: absolute; transform: scale(${1.75 / VS_ZOOM}); transform-origin: top left; }
${suggest.css}
${paletteCss()}
</style>
<style id="woodfish-css"></style>
<div class="monaco-workbench"><div class="panes"></div></div>
<script>window.__WOODFISH_CSS = ${JSON.stringify(effectCss())}; window.__SUGGEST_HTML = ${JSON.stringify(suggest.html)}; window.__PROMO_SCALE = ${1 / VS_ZOOM};</script>
<script src="${BOOTSTRAP_URL}"></script>
<script src="${stageUrl}"></script>
<script src="${overlayUrl}"></script>`;
}

/**
 * Monaco-like line markup. `typed` limits the visible characters in reading order (a line
 * break counts as one); `revealRest` shows the lines after the typing line in full. A caret
 * anchor marks where the cursor sits. `splitRuns` keeps split pieces apart, as before 7.2.
 */
function paneHtml(pane) {
  const limit = pane.typed ?? Infinity;
  const joiner = pane.splitRuns ? '<b class="split"></b>' : '';
  let remaining = limit;
  let caretPlaced = false;
  const lines = pane.code.map((tokens) => {
    if (remaining <= 0 && !(pane.revealRest && caretPlaced)) {
      return '<div class="view-line"><span></span></div>';
    }
    const unlimited = caretPlaced && pane.revealRest;
    let html = '';
    for (const [text, role] of tokens) {
      const visible = unlimited ? text : text.slice(0, Math.max(0, remaining));
      if (!unlimited) {
        remaining -= text.length;
      }
      if (visible.length > 0) {
        html += splitLikeMonaco(visible)
          .map((part) => `<span class="${roleClass(role)}">${escapeHtml(part)}</span>`)
          .join(joiner);
      }
      if (!unlimited && remaining <= 0) {
        break;
      }
    }
    if (!caretPlaced && !unlimited && remaining <= 0) {
      html += '<span class="caret-anchor"></span>';
      caretPlaced = true;
    }
    if (!unlimited) {
      remaining -= 1;
      if (remaining < 0 && !caretPlaced) {
        html += '<span class="caret-anchor"></span>';
        caretPlaced = true;
      }
    }
    return `<div class="view-line"><span>${html}</span></div>`;
  });
  if (!caretPlaced && lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(
      /<\/span><\/div>$/,
      '<span class="caret-anchor"></span></span></div>'
    );
  }
  return lines.join('');
}

function captionOpacity(caption, sceneTime, sceneEnd) {
  if (!caption || caption.at < 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, caption.at / CAPTION_FADE, (sceneEnd - sceneTime) / 0.2));
}

/** Everything one frame needs: the shot for the stage, the camera and the overlay. */
function frameState(scenes, t) {
  let index = scenes.findIndex((candidate) => t >= candidate.start && t < candidate.end);
  index = index < 0 ? scenes.length - 1 : index;
  const scene = scenes[index];
  const local = t - scene.start;
  const shot = scene.build(local);
  const palette = resolvePalette(shot.palette) ?? DARK_MODERN;
  const host = scene.host ?? 'vscode';
  const base = { palette: palette.slug, light: palette.type === 'light', timeMs: t * 1000 };
  const stage =
    host === 'codex'
      ? { ...shot, ...base }
      : {
          ...base,
          css: shot.css,
          panes: shot.panes.map((pane) => ({
            html: paneHtml(pane),
            woodfish: pane.woodfish !== false,
            label: pane.label,
            className: [pane.large ? 'large' : pane.compact ? 'compact' : '', pane.centered ? 'centered' : ''].join(' ').trim(),
            cursor: Boolean(pane.cursor),
            typed: Number.isFinite(pane.typed) ? pane.typed : null,
            suggest: pane.suggest ?? null,
          })),
        };
  return {
    host,
    shot: index,
    t,
    stage,
    camera: shot.camera ?? { zoom: 1, focus: 'window' },
    overlay: {
      caption: shot.caption
        ? {
            main: shot.caption.main,
            sub: shot.caption.sub,
            at: shot.caption.position,
            opacity: captionOpacity(shot.caption, local, scene.end - scene.start),
          }
        : null,
      badge: Boolean(shot.badge),
      end: shot.end ?? null,
      fade: Math.max(0, 1 - (t - START) / FADE_IN, (t - (END - FADE_OUT)) / FADE_OUT),
    },
  };
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const centerOf = (rect) => [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2];

/**
 * Where the camera wants to look: the center of `focus` (else the first `fallback` anchor
 * present, else the whole window), with x taken from `x` (a number) or the anchor `alignX`.
 */
function cameraTarget(spec, anchors) {
  const pick = (name) => (name && anchors[name]) || null;
  const names = [spec.focus, ...[].concat(spec.fallback ?? [])];
  let [x, y] = centerOf(names.map(pick).find(Boolean) ?? anchors.window);
  if (typeof spec.x === 'number') {
    x = spec.x;
  } else if (pick(spec.alignX)) {
    x = centerOf(pick(spec.alignX))[0];
  }
  return [x, y + (spec.dy ?? 0)];
}

/**
 * One camera per page. The zoom comes from the storyboard (eased on the beat); the center
 * glides toward its target and snaps at a cut.
 */
function createCamera(page) {
  let center = null;
  let shot = null;
  let time = 0;
  return (state, anchors) => {
    const spec = state.camera;
    const target = cameraTarget(spec, anchors);
    if (center === null || shot !== state.shot || state.t <= time) {
      center = target;
    } else {
      const k = 1 - Math.exp(-(state.t - time) / (spec.lag ?? CAMERA_LAG));
      center = [center[0] + (target[0] - center[0]) * k, center[1] + (target[1] - center[1]) * k];
    }
    shot = state.shot;
    time = state.t;
    const width = page.width / spec.zoom;
    const height = page.height / spec.zoom;
    return {
      x: clamp(center[0] - width / 2, 0, page.width - width),
      y: clamp(center[1] - height / 2, 0, page.height - height),
      width,
      height,
    };
  };
}

async function openStage(name, workDir, html) {
  const page = PAGES[name];
  const browser = await launchPage(findChrome(), path.join(workDir, `profile-${name}`), page);
  const { session } = browser;
  await session.send('Emulation.setDeviceMetricsOverride', {
    ...page,
    deviceScaleFactor: PIXEL_RATIO,
    mobile: false,
  });
  await session.send('Page.addScriptToEvaluateOnNewDocument', {
    source: fs.readFileSync(path.join(__dirname, 'clock.js'), 'utf8'),
  });
  // Effects only run in a focused window (they pause in the background, like the real hosts).
  await session.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const file = path.join(workDir, `${name}.html`);
  fs.writeFileSync(file, html);
  const loaded = session.once('Page.loadEventFired');
  await session.send('Page.navigate', { url: pathToFileURL(file).href });
  await loaded;
  return { browser, session, camera: createCamera(page) };
}

async function renderFrame(stages, state) {
  const stage = stages[state.host];
  const anchors = await stage.session.evaluate(`window.__woodfishPromo.apply(${JSON.stringify(state.stage)})`);
  if (!anchors) {
    throw new Error(`The engine did not paint every token at ${state.t.toFixed(3)} s`);
  }
  const clip = stage.camera(state, anchors);
  await stage.session.evaluate(`window.__promoOverlay.show(${JSON.stringify({ ...state.overlay, clip })})`);
  return { stage, clip };
}

async function capture({ stage, clip }, format) {
  const shot = await stage.session.send('Page.captureScreenshot', {
    format,
    quality: format === 'jpeg' ? 94 : undefined,
    clip: { ...clip, scale: WIDTH / (clip.width * PIXEL_RATIO) },
  });
  return Buffer.from(shot.data, 'base64');
}

function startEncoder(options) {
  fs.mkdirSync(path.dirname(options.out), { recursive: true });
  const fadeStart = (options.to - options.from - FADE_OUT).toFixed(2);
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(options.fps), '-c:v', 'mjpeg', '-i', '-',
      '-ss', String(options.from), '-i', options.bgm,
      '-map', '0:v', '-map', '1:a',
      // A clip can round a pixel off 1920×1080; every frame goes out at the exact size.
      '-vf', `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      '-af', `afade=t=in:st=0:d=0.3,afade=t=out:st=${fadeStart}:d=${FADE_OUT}`,
      '-shortest', '-movflags', '+faststart',
      options.out,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );
  const done = new Promise((resolve, reject) => {
    ffmpeg.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  });
  return {
    async write(buffer) {
      if (!ffmpeg.stdin.write(buffer)) {
        await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
      }
    },
    async end() {
      ffmpeg.stdin.end();
      await done;
    },
  };
}

/** Renders without capturing from `from` up to (not including) `to`. */
async function warm(stages, scenes, from, to, fps) {
  for (let frame = 0; from + frame / fps < to - 1e-6; frame += 1) {
    await renderFrame(stages, frameState(scenes, from + frame / fps));
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-promo-'));
  const bundle = path.join(workDir, 'codex-overlay.js');
  fs.writeFileSync(bundle, await buildOverlayBundle());
  const stageUrl = (file) => pathToFileURL(path.join(__dirname, file)).href;
  const stages = {};
  try {
    const overlayUrl = stageUrl('overlay-page.js');
    stages.vscode = await openStage('vscode', workDir, vscodePageHtml(stageUrl('stage.js'), overlayUrl));
    stages.codex = await openStage(
      'codex',
      workDir,
      codexPageHtml({ stageUrl: stageUrl('codex-stage.js'), bundleUrl: pathToFileURL(bundle).href, overlayUrl })
    );
    const scenes = storyboard();

    if (options.stills) {
      const dir = path.join(path.dirname(options.out), 'stills');
      fs.mkdirSync(dir, { recursive: true });
      let clock = -Infinity;
      for (const t of [...options.stills].sort((a, b) => a - b)) {
        await warm(stages, scenes, Math.max(clock, t - PREROLL), t, options.fps);
        const frame = await renderFrame(stages, frameState(scenes, t));
        clock = t + 1 / options.fps;
        const file = path.join(dir, `still-${t.toFixed(2)}.png`);
        fs.writeFileSync(file, await capture(frame, 'png'));
        console.log(`✓ ${path.relative(REPO_ROOT, file)}`);
      }
      return;
    }

    await warm(stages, scenes, options.from - PREROLL, options.from, options.fps);
    const encoder = startEncoder(options);
    const frames = Math.round((options.to - options.from) * options.fps);
    const started = Date.now();
    for (let frame = 0; frame < frames; frame += 1) {
      const t = options.from + frame / options.fps;
      const frame = await renderFrame(stages, frameState(scenes, t));
      await encoder.write(await capture(frame, 'jpeg'));
      if (frame % (options.fps * 5) === 0) {
        const rate = (frame + 1) / ((Date.now() - started) / 1000);
        console.log(`${t.toFixed(1)}s / ${options.to.toFixed(1)}s  (${rate.toFixed(1)} frames/s)`);
      }
    }
    await encoder.end();
    console.log(`✓ ${path.relative(REPO_ROOT, options.out)}`);
  } finally {
    for (const stage of Object.values(stages)) {
      await stage.browser.close();
    }
    fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
