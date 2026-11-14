'use strict';
/*
 * Sound effects for the promo, synthesized in code (seeded noise and sines with envelopes,
 * no samples) from the very frame states the picture is rendered from, so every sound lands on
 * its frame:
 *
 * - a cut or the start of a camera push → a light whoosh;
 * - the thread ring appearing or the selection moving → a shimmer; the background coming on
 *   or a user.css save → a soft swell; a menu opening → a pop; a theme switch → a tick;
 * - the end card → a chime.
 *
 * Two mono stems: `light` (pops and ticks) and `accent` (the rest). The accent stem
 * ducks the BGM a little; everything is loudness-normalized to -14 LUFS, -1 dBTP in two passes.
 */

const fs = require('fs');
const { spawnSync } = require('child_process');

const RATE = 48000;
/** Make-up gain of the stems in the mix (measured: BGM -10.8 LUFS, raw stems -38 / -30). */
const LIGHT_GAIN = '14dB';
const ACCENT_GAIN = '8dB';

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Adds `seconds` of `sample(time)` into `buffer` starting at `at` (seconds). */
function mixInto(buffer, at, seconds, sample) {
  const start = Math.round(at * RATE);
  const length = Math.round(seconds * RATE);
  for (let i = 0; i < length; i += 1) {
    const index = start + i;
    if (index >= 0 && index < buffer.length) {
      buffer[index] += sample(i / RATE);
    }
  }
}

const SOUNDS = {
  /** Noise through a sweeping low-pass, swelling and fading. */
  whoosh(buffer, at, rng, level) {
    const duration = 0.5;
    let low = 0;
    mixInto(buffer, at - 0.12, duration, (t) => {
      const k = t / duration;
      const cutoff = 250 + 2600 * Math.sin(Math.PI * Math.min(1, k * 1.1));
      const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
      low += alpha * (rng() * 2 - 1 - low);
      return level * low * Math.pow(Math.sin(Math.PI * k), 2);
    });
  },
  /** Detuned high partials with a slow attack and a long tail. */
  shimmer(buffer, at, rng, level) {
    const partials = [1318.5, 1760, 2637, 3520].map((f, i) => [f + (rng() - 0.5) * 6, 1 / (i + 1)]);
    mixInto(buffer, at, 1.4, (t) => {
      let sum = 0;
      for (const [frequency, gain] of partials) {
        sum += gain * Math.sin(2 * Math.PI * frequency * t);
      }
      const envelope = Math.min(1, t / 0.04) * Math.exp(-t / 0.55) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 6 * t));
      return level * 0.45 * sum * envelope;
    });
  },
  /** A soft rising pad, for things that come on. */
  swell(buffer, at, rng, level) {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    mixInto(buffer, at, 1.2, (t) => {
      let sum = 0;
      chord.forEach((frequency, i) => {
        sum += Math.sin(2 * Math.PI * frequency * t + i) / (i + 1.5);
      });
      const envelope = Math.min(1, t / 0.25) * Math.exp(-Math.max(0, t - 0.25) / 0.45);
      return level * 0.5 * sum * envelope;
    });
  },
  /** A sine dropping in pitch. */
  pop(buffer, at, rng, level, high) {
    const from = high ? 1500 : 900;
    const to = high ? 950 : 320;
    let phase = 0;
    mixInto(buffer, at, high ? 0.05 : 0.09, (t) => {
      const frequency = to + (from - to) * Math.exp(-t / 0.018);
      phase += (2 * Math.PI * frequency) / RATE;
      return level * Math.sin(phase) * Math.min(1, t / 0.002) * Math.exp(-t / (high ? 0.015 : 0.035));
    });
  },
  /** Two bell notes, a fifth apart. */
  chime(buffer, at, rng, level) {
    const notes = [[1046.5, 0], [1568, 0.13]];
    const ratios = [[1, 1, 1.6], [2, 0.45, 1.1], [2.76, 0.32, 0.8], [4.07, 0.18, 0.5], [5.4, 0.1, 0.35]];
    for (const [root, offset] of notes) {
      mixInto(buffer, at + offset, 2.2, (t) => {
        let sum = 0;
        for (const [ratio, gain, decay] of ratios) {
          sum += gain * Math.sin(2 * Math.PI * root * ratio * t) * Math.exp(-t / decay);
        }
        return level * 0.5 * sum * Math.min(1, t / 0.003);
      });
    }
  },
};

/** What a frame shows that sounds can hang on, for comparing with the previous frame. */
function features(state) {
  const stage = state.stage;
  return {
    shot: state.shot,
    host: state.host,
    zoom: state.camera.zoom,
    focus: state.camera.focus,
    active: stage.threads?.active ?? null,
    slash: stage.slash ?? null,
    background: state.host === 'codex' ? stage.background !== false : stage.css !== 'plain',
    palette: stage.palette,
    userCss: state.host === 'codex' ? stage.userCss ?? '' : stage.effectsHash ?? '',
    end: Boolean(state.overlay.end),
  };
}

/**
 * The sound events of a cut: `stateAt(t)` is the renderer's frame state, sampled at `fps`
 * from `from` to `to`. Times are relative to `from` (the video's first frame).
 */
function soundEvents(stateAt, from, to, fps) {
  const events = [];
  let previous = null;
  let lastWhoosh = -Infinity;
  for (let frame = 0; from + frame / fps < to; frame += 1) {
    const t = frame / fps;
    const now = features(stateAt(from + t));
    const add = (kind, at = t, extra = {}) => events.push({ kind, at, ...extra });
    if (previous) {
      const cut = now.shot !== previous.shot;
      const zoomStep = Math.abs(now.zoom - previous.zoom);
      if (cut && t - lastWhoosh > 0.3) {
        add('whoosh', t, { level: 0.22 });
        lastWhoosh = t;
      } else if (!cut && zoomStep > 0.002 && previous.zoomStep <= 0.002 && t - lastWhoosh > 0.6) {
        add('whoosh', t, { level: 0.13 });
        lastWhoosh = t;
      }
      now.zoomStep = cut ? 0 : zoomStep;
      if (!cut) {
        if (now.active !== previous.active && now.focus === 'thread') add('shimmer', t, { level: 0.1 });
        if (now.slash !== null && previous.slash === null) add('pop', t, { level: 0.22 });
        else if (now.slash !== null && now.slash !== previous.slash) add('pop', t, { level: 0.06, high: true });
        if (now.background && !previous.background) add('swell', t, { level: 0.1 });
        if (now.userCss !== previous.userCss && now.userCss) add('swell', t, { level: 0.08 });
        if (now.palette !== previous.palette) add('pop', t, { level: 0.07, high: true });
      } else if (now.focus === 'thread') {
        add('shimmer', t + 0.3, { level: 0.1 });
      }
      if (now.end && !previous.end) add('chime', t + 0.15, { level: 0.2 });
    } else {
      now.zoomStep = 0;
    }
    previous = now;
  }
  return events;
}

const STEM = { pop: 'light', whoosh: 'accent', shimmer: 'accent', swell: 'accent', chime: 'accent' };

function writeWav(file, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

/** Synthesizes the two stems for `events` over `duration` seconds into `dir`. */
function writeStems(events, duration, dir) {
  const stems = { light: new Float32Array(Math.ceil((duration + 3) * RATE)), accent: new Float32Array(Math.ceil((duration + 3) * RATE)) };
  const rng = random(0xc1a7);
  for (const event of events) {
    SOUNDS[event.kind](stems[STEM[event.kind]], event.at, rng, event.level, event.high);
  }
  const files = { light: `${dir}/sfx-light.wav`, accent: `${dir}/sfx-accent.wav` };
  writeWav(files.light, stems.light);
  writeWav(files.accent, stems.accent);
  return files;
}

/**
 * The audio graph: BGM from `from`, ducked a little under the accent stem, both stems on top,
 * faded, then loudness-normalized. Inputs are numbered from `first` (the video is 0).
 */
function audioGraph(first, duration, fadeOut, loudnorm) {
  const [bgm, light, accent] = [first, first + 1, first + 2];
  const stereo = 'aformat=sample_rates=48000:channel_layouts=stereo';
  return [
    `[${bgm}:a]atrim=duration=${duration.toFixed(3)},${stereo}[bgm]`,
    // Keep pops and ticks light, with accents a little more prominent.
    `[${accent}:a]${stereo},volume=${ACCENT_GAIN},asplit=2[accent][key]`,
    '[bgm][key]sidechaincompress=threshold=0.03:ratio=3:attack=15:release=350[ducked]',
    `[${light}:a]${stereo},volume=${LIGHT_GAIN}[light]`,
    '[ducked][light][accent]amix=inputs=3:normalize=0:duration=first,' +
      `afade=t=in:st=0:d=0.3,afade=t=out:st=${(duration - fadeOut).toFixed(2)}:d=${fadeOut},${loudnorm}[aout]`,
  ].join(';');
}

/**
 * Builds the soundtrack's ffmpeg inputs and filter (`[aout]`): writes the stems, measures the
 * mix once and returns a graph with a loudnorm to -14 LUFS, true peak -2.5 dBTP: the AAC encode
 * can overshoot synthesized transients, so leave headroom below the final -1 dBTP ceiling.
 */
function prepareSoundtrack({ stateAt, from, to, fps, bgm, dir, fadeOut, first }) {
  const duration = to - from;
  const events = soundEvents(stateAt, from, to, fps);
  const stems = writeStems(events, duration, dir);
  const inputs = ['-ss', String(from), '-i', bgm, '-i', stems.light, '-i', stems.accent];
  const target = 'I=-14:TP=-2.5:LRA=11';
  const measure = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', ...inputs, '-filter_complex', audioGraph(0, duration, fadeOut, `loudnorm=${target}:print_format=json`), '-map', '[aout]', '-f', 'null', '-'],
    { encoding: 'utf8' }
  );
  const json = /\{[\s\S]*"target_offset"[\s\S]*?\}/.exec(measure.stderr ?? '');
  if (measure.status !== 0 || !json) {
    throw new Error(`could not measure the soundtrack loudness\n${measure.stderr}`);
  }
  const m = JSON.parse(json[0]);
  const loudnorm = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  return {
    inputs,
    filter: audioGraph(first, duration, fadeOut, loudnorm),
    events,
  };
}

module.exports = { prepareSoundtrack, soundEvents };
