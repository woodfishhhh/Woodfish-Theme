#!/usr/bin/env node
/*
 * Renders the Woodfish promo video. Every frame is the real extension at work: the built
 * workbench bootstrap paints a Monaco-like DOM with the CSS from `buildRuntimeCss`, in
 * headless Chrome; frames go straight into ffmpeg together with the BGM.
 *
 *   pnpm compile && pnpm runtime:build
 *   node apps/vscode-extension/scripts/promo/render-promo-video.js --bgm <music.mp3>
 *     [--out output/promo/woodfish-promo.mp4] [--fps 30] [--from 0] [--to 108.45]
 *     [--still 12.3,40] (writes PNG stills instead of a video)
 *
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
const { storyboard } = require('./storyboard');

const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION = 108.45;
const FADE_IN = 0.6;
const FADE_OUT = 1.9;
const CAPTION_FADE = 0.3;
const CODE_FONT = "Consolas, 'Microsoft YaHei', monospace";
const UI_FONT = "'Microsoft YaHei UI', 'Segoe UI', sans-serif";

function parseArgs(argv) {
  const options = {
    out: path.join(REPO_ROOT, 'output', 'promo', 'woodfish-promo.mp4'),
    fps: 30,
    from: 0,
    to: DURATION,
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

/** Editor colors per palette, keyed by `data-palette`, plus caption colors. */
function paletteCss() {
  return PALETTES.map((palette) => {
    const scope = `[data-palette="${palette.slug}"]`;
    const roles = { ...palette.tokens, fg: palette.ui.fg };
    const tokens = Object.entries(roles)
      .map(([role, color]) => `${scope} .${roleClass(role)} { color: ${color}; }`)
      .join('\n');
    return `.monaco-workbench${scope} { --vscode-editor-background: ${palette.ui.bg}; --vscode-editor-foreground: ${palette.ui.fg}; background: ${palette.ui.bg}; color: ${palette.ui.fg}; }
${scope} .caption .main { color: ${palette.ui.fg}; }
${scope} .caption .sub, ${scope} .pane-label { color: ${palette.ui.fgMuted ?? palette.ui.fg}; }
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

function pageHtml(stageUrl) {
  const suggest = suggestWidget({ font: "15px/24px 'Segoe UI', 'Microsoft YaHei', sans-serif" });
  return `<!doctype html><meta charset="utf-8"><style>
html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #000; }
/* The bottom band is kept for captions; code centers in the space above it. */
.monaco-workbench { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding-bottom: 190px; box-sizing: border-box; }
.panes { display: flex; flex-direction: column; gap: 64px; width: 1560px; }
.pane { position: relative; }
.pane-label { font: 600 24px/1 ${UI_FONT}; letter-spacing: 2px; margin-bottom: 18px; }
.editor { position: relative; }
.view-line { font: 32px/50px ${CODE_FONT}; height: 50px; white-space: pre; }
.pane.large .view-line { font: 44px/68px ${CODE_FONT}; height: 68px; }
.pane.compact .view-line { font: 26px/42px ${CODE_FONT}; height: 42px; }
.split { display: inline; }
.cursors-layer { position: absolute; inset: 0; pointer-events: none; }
.cursor { position: absolute; width: 3px; height: 38px; }
.pane.large .cursor { width: 4px; height: 54px; }
.pane.compact .cursor { height: 32px; }
.suggest-slot { position: absolute; transform: scale(1.75); transform-origin: top left; }
${suggest.css}
.caption { position: fixed; left: 180px; bottom: 92px; font-family: ${UI_FONT}; }
.caption .main { font-size: 40px; font-weight: 600; letter-spacing: 1px; }
.caption .sub { margin-top: 10px; font-size: 24px; }
.fade { position: fixed; inset: 0; background: #000; pointer-events: none; }
${paletteCss()}
</style>
<style id="woodfish-css"></style>
<div class="monaco-workbench"><div class="panes"></div></div>
<div class="caption"><div class="main"></div><div class="sub"></div></div>
<div class="fade"></div>
<script>window.__WOODFISH_CSS = ${JSON.stringify(effectCss())}; window.__SUGGEST_HTML = ${JSON.stringify(suggest.html)};</script>
<script src="${BOOTSTRAP_URL}"></script>
<script src="${stageUrl}"></script>`;
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

/** The stage state for global time `t`. */
function frameState(scenes, t) {
  const scene = scenes.find((candidate) => t >= candidate.start && t < candidate.end) ?? scenes.at(-1);
  const local = t - scene.start;
  const shot = scene.build(local);
  const palette = resolvePalette(shot.palette) ?? DARK_MODERN;
  return {
    palette: palette.slug,
    light: palette.type === 'light',
    css: shot.css,
    panes: shot.panes.map((pane) => ({
      html: paneHtml(pane),
      woodfish: pane.woodfish !== false,
      label: pane.label,
      className: pane.large ? 'large' : pane.compact ? 'compact' : '',
      cursor: Boolean(pane.cursor),
      suggest: pane.suggest ?? null,
    })),
    caption: shot.caption
      ? { main: shot.caption.main, sub: shot.caption.sub, opacity: captionOpacity(shot.caption, local, scene.end - scene.start) }
      : null,
    fade: Math.max(0, 1 - t / FADE_IN, (t - (DURATION - FADE_OUT)) / FADE_OUT),
    timeMs: t * 1000,
  };
}

async function renderFrame(session, state) {
  const complete = await session.evaluate(`window.__woodfishPromo.apply(${JSON.stringify(state)})`);
  if (!complete) {
    throw new Error(`The engine did not paint every token at ${state.timeMs} ms`);
  }
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woodfish-promo-'));
  const page = path.join(workDir, 'promo.html');
  fs.writeFileSync(page, pageHtml(pathToFileURL(path.join(__dirname, 'stage.js')).href));
  const browser = await launchPage(findChrome(), path.join(workDir, 'profile'), { width: WIDTH, height: HEIGHT });
  try {
    const loaded = browser.session.once('Page.loadEventFired');
    await browser.session.send('Page.navigate', { url: pathToFileURL(page).href });
    await loaded;
    const scenes = storyboard();
    const capture = async (format) =>
      Buffer.from(
        (await browser.session.send('Page.captureScreenshot', { format, quality: format === 'jpeg' ? 94 : undefined })).data,
        'base64'
      );

    if (options.stills) {
      const dir = path.join(path.dirname(options.out), 'stills');
      fs.mkdirSync(dir, { recursive: true });
      for (const t of options.stills) {
        // Run the second before the still so time-based state (typing, animations) is real.
        for (let warm = Math.max(0, t - 1); warm < t; warm += 1 / options.fps) {
          await renderFrame(browser.session, frameState(scenes, warm));
        }
        await renderFrame(browser.session, frameState(scenes, t));
        const file = path.join(dir, `still-${t.toFixed(2)}.png`);
        fs.writeFileSync(file, await capture('png'));
        console.log(`✓ ${path.relative(REPO_ROOT, file)}`);
      }
      return;
    }

    const encoder = startEncoder(options);
    const frames = Math.round((options.to - options.from) * options.fps);
    const started = Date.now();
    for (let frame = 0; frame < frames; frame += 1) {
      const t = options.from + frame / options.fps;
      await renderFrame(browser.session, frameState(scenes, t));
      await encoder.write(await capture('jpeg'));
      if (frame % (options.fps * 5) === 0) {
        const rate = (frame + 1) / ((Date.now() - started) / 1000);
        console.log(`${t.toFixed(1)}s / ${options.to}s  (${rate.toFixed(1)} frames/s)`);
      }
    }
    await encoder.end();
    console.log(`✓ ${path.relative(REPO_ROOT, options.out)}`);
  } finally {
    await browser.close();
    fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
