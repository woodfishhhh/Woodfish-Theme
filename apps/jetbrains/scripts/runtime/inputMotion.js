import trail from '../../../../packages/effects/builtin/caret-trail/effect.js';
import particles from '../../../../packages/effects/builtin/typing-particles/effect.js';
import { DEFAULT_CURSOR_GRADIENT_STOPS } from '../../../../packages/theme-core/src/effects/params';

let now = 0;
Object.assign(globalThis, { performance: { now: () => now } });

export function motionCreate(encoded, accent, stops, dark) {
  const options = JSON.parse(encoded);
  const renderers = [];
  const input = {};
  const theme = {
    accent,
    stops: stops.split(',').map((color) => color.trim()),
    mode: dark ? 'dark' : 'light',
  };
  function mount(effect, group, handlers, owner) {
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
        handlers.caret = fn;
      },
      onInsert: (fn) => {
        handlers.insert = fn;
      },
      onStreamEnd() {},
      painter(fn) {
        const layer = { fn, active: false, owner };
        state.renderers.push(layer);
        return {
          wake() {
            layer.active = true;
          },
        };
      },
    });
  }
  const state = { renderers, input, shake: null, carets: new Map() };
  mount(particles, 'typingParticles', input, null);
  state.caret = (id) => {
    if (!state.carets.has(id)) {
      const handlers = {};
      mount(trail, 'caretTrail', handlers, id);
      state.carets.set(id, handlers);
    }
    return state.carets.get(id).caret;
  };
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

export function motionEvent(state, kind, id, x, y, height, width, time) {
  now = time;
  if (kind === 'remove') {
    state.carets.delete(id);
    state.renderers = state.renderers.filter((layer) => layer.owner !== id);
  }
  const callback = kind === 'caret' ? state.caret(id) : state.input[kind];
  if (callback)
    callback({ x, y, height, width, visible: true, source: 'user', text: ' ', block: state.block });
  return state.renderers.some((layer) => layer.active);
}

export function motionFrame(state, time, elapsed, pen) {
  now = time;
  let active = false;
  pen.shiftX = pen.shiftY = 0;
  if (state.shake) {
    const phase = (time - state.shake.start) / state.shake.duration;
    if (phase < 1) {
      const offset = Math.sin(Math.PI * Math.max(0, phase));
      active = true;
      pen.shiftX = offset * state.shake.x;
      pen.shiftY = offset * state.shake.y;
    } else state.shake = null;
  }
  for (const layer of state.renderers) {
    if (layer.active) {
      pen.globalAlpha = pen.lineWidth = 1;
      pen.globalCompositeOperation = 'source-over';
      layer.active = layer.fn(pen, now, elapsed);
    }
    if (layer.active) active = true;
  }
  return active;
}
