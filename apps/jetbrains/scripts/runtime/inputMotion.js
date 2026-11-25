import trail from '../../../../packages/effects/builtin/caret-trail/effect.js';
import particles from '../../../../packages/effects/builtin/typing-particles/effect.js';
import { DEFAULT_CURSOR_GRADIENT_STOPS } from '../../../../packages/theme-core/src/effects/params';

let now = 0;
Object.assign(globalThis, { performance: { now: () => now } });

// The two packaged canvas plugins emit a small list of Java2D paths. No editor text crosses this boundary.
function recorder(out) {
  function ink(css, alpha) {
    return (Math.round(255 * alpha) << 24) | Number.parseInt(css.slice(1), 16);
  }
  return {
    globalAlpha: 1,
    lineWidth: 1,
    beginPath() {
      out.push(0);
    },
    moveTo(x, y) {
      out.push(1, x, y);
    },
    lineTo(x, y) {
      out.push(2, x, y);
    },
    closePath() {
      out.push(3);
    },
    arc(x, y, radius) {
      out.push(4, x, y, radius);
    },
    fill() {
      out.push(5, ink(this.fillStyle, this.globalAlpha));
    },
    stroke() {
      out.push(6, ink(this.strokeStyle, this.globalAlpha), this.lineWidth);
    },
    // The shared-canvas path has no DOM layer and both offsets are zero.
    translate() {},
  };
}

export function motionCreate(encoded, accent, stops, dark) {
  const options = JSON.parse(encoded);
  const renderers = [];
  const input = {};
  const theme = { accent, stops: stops.split(','), mode: dark ? 'dark' : 'light' };
  function mount(effect, group) {
    const params = options[group];
    if (!params.enabled) return;
    effect({
      params,
      lib: {},
      selectors: {},
      rainbow: DEFAULT_CURSOR_GRADIENT_STOPS,
      simplified: () => false,
      theme: () => theme,
      onCaret: (fn) => {
        input.caret = fn;
      },
      onInsert: (fn) => {
        input.insert = fn;
      },
      onStreamEnd() {},
      painter(fn) {
        const layer = { fn, active: false };
        renderers.push(layer);
        return {
          wake() {
            layer.active = true;
          },
        };
      },
    });
  }
  mount(trail, 'caretTrail');
  mount(particles, 'typingParticles');
  const state = { renderers, input, shake: null };
  state.block = {
    closest: () => ({
      animate(frames, options) {
        const match = /translate\(([-.\d]+)px, ([-.\d]+)px\)/.exec(frames[1].transform);
        if (match)
          state.shake = {
            x: Number(match[1]),
            y: Number(match[2]),
            start: now,
            duration: options.duration,
          };
      },
    }),
  };
  return state;
}

export function motionEvent(state, kind, x, y, height, width, time) {
  now = time;
  const callback = state.input[kind];
  if (callback)
    callback({ x, y, height, width, visible: true, source: 'user', text: ' ', block: state.block });
  return state.renderers.some((layer) => layer.active);
}

export function motionFrame(state, time, elapsed) {
  now = time;
  const out = [0, 0, 0];
  if (state.shake) {
    const phase = (time - state.shake.start) / state.shake.duration;
    if (phase < 1) {
      const offset = Math.sin(Math.PI * Math.max(0, phase));
      out[0] = 1;
      out[1] = offset * state.shake.x;
      out[2] = offset * state.shake.y;
    } else state.shake = null;
  }
  for (const layer of state.renderers) {
    if (layer.active) layer.active = layer.fn(recorder(out), now, elapsed);
    if (layer.active) out[0] = 1;
  }
  return out;
}
