#!/usr/bin/env node
/*
 * Renders the README's effect gallery (assets/readme/effects/) with the promo's real
 * renders: the same Codex and VS Code stages, storyboard states and virtual clock, but a
 * still camera framed on the effect and no captions. Moving effects become short animated
 * WebP loops, the rest single WebP frames. The Codex settings page has no stand-in, so its
 * picture is cropped from a real screenshot in docs/hosts/codex-screenshots.
 *
 *   pnpm compile
 *   node apps/vscode-extension/scripts/promo/render-readme-effects.js [name …]
 *
 * Needs ffmpeg with libwebp on PATH and Chrome / Edge (CHROME_PATH to override).
 */
'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { REPO_ROOT } = require('../lib/scene-kit');
const { PREROLL, capture, frameState, openStages, renderFrame, warm } = require('./render-promo-video');
const { BEAT, bar } = require('./storyboard');
const { CUTS } = require('./cuts');

const OUT_DIR = path.join(REPO_ROOT, 'assets', 'readme', 'effects');
/** 2× the size the README shows them at. */
const WIDTH = 960;
/** Effects run at 60 Hz like on screen; the loops keep every second frame. */
const RENDER_FPS = 60;
const LOOP_FPS = 30;
const NO_OVERLAY = { caption: null, badge: false, end: null, fade: 0 };

const POPULAR = ['onedark', 'tokyonight', 'catppuccin-mocha', 'catppuccin-latte', 'nord', 'github-dark', 'github-light', 'nightowl', 'ayu-mirage', 'gruvbox-dark'];

/** `at` is a still, `from`–`to` a loop (BGM seconds of the promo storyboard). */
const SHOTS = [
  { name: 'codex-rainbow-reply', at: bar(6) + 0.3, camera: { zoom: 1.55, focus: 'column' } },
  { name: 'codex-stream', from: 11.5, to: 14, camera: { zoom: 1.8, focus: 'stream', fallback: 'reply', alignX: 'column', lag: 0.5 } },
  { name: 'codex-thread-ring', from: bar(21) + 0.4, to: bar(21) + 3.6, camera: { zoom: 2.4, focus: 'thread' } },
  { name: 'codex-glass', at: bar(6) + 2.9, camera: { zoom: 1.45, focus: 'menu', dy: 60 } },
  { name: 'codex-background-off', at: bar(7) + 1.2, camera: { zoom: 1, focus: 'window' } },
  { name: 'codex-background-on', at: bar(7) + 3.6, camera: { zoom: 1, focus: 'window' } },
  { name: 'codex-caret-trail', from: bar(8) + 3.7, to: bar(8) + 6.2, camera: { zoom: 1.85, focus: 'composer' } },
  { name: 'codex-typing-particles', from: bar(8) + 0.5, to: bar(8) + 3.3, camera: { zoom: 1.85, focus: 'composer' } },
  { name: 'codex-ask-codex', at: bar(10) + 10 * BEAT - 0.1, camera: { zoom: 1.35, focus: 'column' } },
  { name: 'codex-user-css-gold', from: bar(10) + 10 * BEAT + 0.5, to: bar(10) + 10 * BEAT + 3.5, camera: { zoom: 2, focus: 'caret', fallback: 'composer', dy: -60, lag: 0.45 }, quality: 76 },
  { name: 'vscode-effects', from: bar(17) + 1.6, to: bar(17) + 4.6, camera: { zoom: 1.7, focus: 'cursor', x: 350, lag: 0.45 } },
  ...POPULAR.map((slug, index) => ({
    name: `theme-${slug}`,
    at: bar(14) + (index === 0 ? 0.6 : (index + 2) * BEAT + 0.6),
    camera: { zoom: 1.2, focus: 'code' },
  })),
];

/** The Woodfish section of the real settings page (Codex 26.1013, 2026-11-14). */
const SETTINGS_CROP = {
  name: 'codex-settings',
  source: path.join(REPO_ROOT, 'docs', 'hosts', 'codex-screenshots', 'effects-settings-page.jpg'),
  crop: 'crop=740:630:615:92',
};

function ffmpeg(args, input) {
  return spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
}

function finished(child) {
  return new Promise((resolve, reject) => {
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  });
}

async function renderStill(stages, scenes, shot, adjust) {
  await warm(stages, CUTS.full, scenes, shot.at - PREROLL, shot.at, RENDER_FPS, adjust);
  const frame = await renderFrame(stages, adjust(frameState(CUTS.full, scenes, shot.at)));
  const encoder = ffmpeg(['-f', 'png_pipe', '-i', '-', '-c:v', 'libwebp', '-quality', '90', path.join(OUT_DIR, `${shot.name}.webp`)], true);
  encoder.stdin.end(await capture(frame, 'png', WIDTH));
  await finished(encoder);
}

async function renderLoop(stages, scenes, shot, adjust) {
  await warm(stages, CUTS.full, scenes, shot.from - PREROLL, shot.from, RENDER_FPS, adjust);
  const encoder = ffmpeg(
    [
      '-f', 'image2pipe', '-framerate', String(RENDER_FPS), '-c:v', 'mjpeg', '-i', '-',
      '-vf', `fps=${LOOP_FPS}`,
      '-c:v', 'libwebp_anim', '-quality', String(shot.quality ?? 70), '-compression_level', '6', '-loop', '0',
      path.join(OUT_DIR, `${shot.name}.webp`),
    ],
    true
  );
  const done = finished(encoder);
  const frames = Math.round((shot.to - shot.from) * RENDER_FPS);
  for (let index = 0; index < frames; index += 1) {
    const frame = await renderFrame(stages, adjust(frameState(CUTS.full, scenes, shot.from + index / RENDER_FPS)));
    if (!encoder.stdin.write(await capture(frame, 'jpeg', WIDTH))) {
      await new Promise((resolve) => encoder.stdin.once('drain', resolve));
    }
  }
  encoder.stdin.end();
  await done;
}

function cropSettings() {
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', SETTINGS_CROP.source, '-vf', SETTINGS_CROP.crop, '-c:v', 'libwebp', '-quality', '90', path.join(OUT_DIR, `${SETTINGS_CROP.name}.webp`)],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) {
    throw new Error('ffmpeg could not crop the settings screenshot');
  }
}

async function main() {
  const wanted = new Set(process.argv.slice(2));
  const pick = (name) => wanted.size === 0 || wanted.has(name);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (pick(SETTINGS_CROP.name)) {
    cropSettings();
    console.log(`✓ ${SETTINGS_CROP.name}.webp`);
  }
  const shots = SHOTS.filter((shot) => pick(shot.name));
  if (shots.length === 0) {
    return;
  }
  const { stages, close } = await openStages();
  try {
    const scenes = CUTS.full.scenes();
    // Each page's clock only runs forward, so shots render in time order.
    const start = (shot) => shot.at ?? shot.from;
    for (const shot of [...shots].sort((a, b) => start(a) - start(b))) {
      const adjust = (state) => ({ ...state, camera: shot.camera, overlay: NO_OVERLAY });
      await (shot.at === undefined ? renderLoop : renderStill)(stages, scenes, shot, adjust);
      const size = fs.statSync(path.join(OUT_DIR, `${shot.name}.webp`)).size;
      console.log(`✓ ${shot.name}.webp (${Math.round(size / 1024)} KB)`);
    }
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
