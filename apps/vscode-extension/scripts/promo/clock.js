/*
 * Runs in every promo page before any other script (Page.addScriptToEvaluateOnNewDocument).
 * Page code sees a virtual clock: performance.now(), Date.now(), timers and
 * requestAnimationFrame only move when the renderer advances the frame time, so effects
 * that animate on their own (trails, particles, the streaming watcher) render the same
 * every time, however long a frame takes to capture.
 */
(() => {
  'use strict';

  const realRaf = window.requestAnimationFrame.bind(window);
  const realSetTimeout = window.setTimeout.bind(window);
  const EPOCH = Date.UTC(2026, 10, 14, 12);
  let now = 0;
  let nextId = 1;
  let frames = new Map();
  const timers = new Map();

  performance.now = () => now;
  Date.now = () => EPOCH + now;

  // Particles scatter with Math.random(); a seeded generator (mulberry32) keeps renders identical.
  let seed = 0x5eed;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  window.requestAnimationFrame = (callback) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => frames.delete(id);

  function addTimer(callback, ms, args, repeat) {
    const id = nextId++;
    if (typeof callback === 'function') {
      const delay = Math.max(repeat ? 1 : 0, Number(ms) || 0);
      timers.set(id, { at: now + delay, callback, args, every: repeat ? delay : 0 });
    }
    return id;
  }
  window.setTimeout = (callback, ms, ...args) => addTimer(callback, ms, args, false);
  window.setInterval = (callback, ms, ...args) => addTimer(callback, ms, args, true);
  window.clearTimeout = (id) => timers.delete(id);
  window.clearInterval = (id) => timers.delete(id);

  function run(callback, args) {
    try {
      callback(...args);
    } catch (error) {
      console.error(error);
    }
  }

  /** Fires every timer due up to `until` in time order, then sets the clock there. */
  function advance(until) {
    for (;;) {
      let next = null;
      for (const [id, timer] of timers) {
        if (timer.at <= until && (!next || timer.at < next[1].at)) {
          next = [id, timer];
        }
      }
      if (!next) {
        break;
      }
      const [id, timer] = next;
      now = Math.max(now, timer.at);
      if (timer.every) {
        timer.at += timer.every;
      } else {
        timers.delete(id);
      }
      run(timer.callback, timer.args);
    }
    now = Math.max(now, until);
  }

  /** Runs the animation frame callbacks queued so far (new ones wait for the next call). */
  function frame() {
    const due = frames;
    frames = new Map();
    for (const callback of due.values()) {
      run(callback, [now]);
    }
    return frames.size;
  }

  window.__promoClock = {
    advance,
    frame,
    now: () => now,
    /** A real animation frame: the page has painted. */
    painted: () => new Promise((resolve) => realRaf(() => resolve())),
    /** A real task turn: microtasks, observers and queued events have run. */
    settle: () => new Promise((resolve) => realSetTimeout(resolve, 0)),
  };
})();
