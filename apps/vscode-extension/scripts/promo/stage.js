/*
 * Runs inside the VS Code promo page. `render-promo-video.js` sends one state per frame; the
 * stage applies it to the Monaco-like DOM, pins every CSS animation to the frame time and
 * waits for the real Woodfish engine (overlay-bootstrap.js) to paint before the frame is
 * captured. Time comes from clock.js. A pane with a cursor is the focused editor: typing
 * sends a keydown before the cursor moves, which is how Woodfish's effects see VS Code typing.
 */
(() => {
  'use strict';

  const workbench = document.querySelector('.monaco-workbench');
  const panesRoot = document.querySelector('.panes');
  const style = document.getElementById('woodfish-css');
  const caption = document.querySelector('.caption');
  const captionMain = caption.querySelector('.main');
  const captionSub = caption.querySelector('.sub');
  const fade = document.querySelector('.fade');
  const clock = window.__promoClock;
  const scale = window.__PROMO_SCALE ?? 1;
  const born = new WeakMap();
  let last = { palette: null, css: null, panes: [] };

  function paneSignature(pane) {
    return `${pane.woodfish}|${pane.label ?? ''}|${pane.className ?? ''}`;
  }

  /** Builds a pane; a fresh editor element is how the engine discovers (or forgets) it. */
  function createPane(pane) {
    const element = document.createElement('div');
    element.className = `pane ${pane.className ?? ''}`;
    if (pane.label) {
      const label = document.createElement('div');
      label.className = 'pane-label';
      label.textContent = pane.label;
      element.append(label);
    }
    const editor = document.createElement('div');
    editor.className = pane.woodfish ? 'editor monaco-editor' : 'editor plain-editor';
    editor.classList.toggle('focused', Boolean(pane.cursor));
    editor.innerHTML = `<textarea class="inputarea" tabindex="0"></textarea><div class="view-lines"></div><div class="cursors-layer"></div>`;
    element.append(editor);
    return element;
  }

  function applyPanes(panes) {
    const signatures = panes.map(paneSignature);
    const rebuild =
      signatures.length !== last.panes.length ||
      signatures.some((signature, index) => signature !== last.panes[index]?.signature);
    if (rebuild) {
      panesRoot.replaceChildren(...panes.map(createPane));
      last.panes = signatures.map((signature) => ({ signature, html: null, typed: null }));
    }
    panes.forEach((pane, index) => {
      const element = panesRoot.children[index];
      const input = element.querySelector('.inputarea');
      if (pane.cursor && document.activeElement !== input) {
        input.focus();
      }
      const typedBefore = last.panes[index].typed;
      if (pane.cursor && pane.typed !== null && typedBefore !== null && pane.typed > typedBefore) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      }
      last.panes[index].typed = pane.typed;
      if (last.panes[index].html !== pane.html) {
        element.querySelector('.view-lines').innerHTML = pane.html;
        last.panes[index].html = pane.html;
      }
      const cursors = element.querySelector('.cursors-layer');
      const wantCursor = Boolean(pane.cursor);
      if (wantCursor !== (cursors.childElementCount > 0)) {
        cursors.innerHTML = wantCursor ? '<div class="cursor"></div>' : '';
      }
      // Built once per opening, so the glass entry animation plays once; selection moves by class.
      let slot = element.querySelector('.suggest-slot');
      if (pane.suggest && !slot) {
        slot = Object.assign(document.createElement('div'), { className: 'suggest-slot' });
        slot.innerHTML = window.__SUGGEST_HTML;
        element.querySelector('.editor').append(slot);
      } else if (!pane.suggest && slot) {
        slot.remove();
        slot = null;
      }
      if (slot) {
        slot.querySelectorAll('.monaco-list-row').forEach((row, rowIndex) => {
          row.classList.toggle('focused', rowIndex === pane.suggest.selected);
        });
      }
    });
  }

  /** Puts the cursor and the suggest list next to the caret anchor of each pane. */
  function placeWidgets() {
    for (const pane of panesRoot.children) {
      const editor = pane.querySelector('.editor');
      const anchor = pane.querySelector('.caret-anchor');
      if (!anchor) {
        continue;
      }
      const box = editor.getBoundingClientRect();
      const rect = anchor.getBoundingClientRect();
      const cursor = pane.querySelector('.cursor');
      if (cursor) {
        cursor.style.left = `${rect.left - box.left}px`;
        cursor.style.top = `${rect.top - box.top + 6 * scale}px`;
      }
      const suggest = pane.querySelector('.suggest-slot');
      if (suggest) {
        suggest.style.left = `${rect.left - box.left - 40 * scale}px`;
        suggest.style.top = `${rect.bottom - box.top + 6 * scale}px`;
      }
    }
  }

  /** CSS animations (cursor colors, glass entry) follow the frame clock, not the wall clock. */
  function pinAnimations(timeMs) {
    for (const animation of document.getAnimations()) {
      if (!born.has(animation)) {
        born.set(animation, timeMs);
      }
      animation.pause();
      animation.currentTime = Math.max(0, timeMs - born.get(animation));
    }
  }

  function painted() {
    return [...document.querySelectorAll('.monaco-editor .view-lines span[class*="mtk"]')].every(
      (span) => span.dataset.woodfishOverlayToken === 'true' || span.textContent === ''
    );
  }

  async function apply(state) {
    const paletteChanged = state.palette !== last.palette;
    if (paletteChanged) {
      document.documentElement.dataset.palette = state.palette;
      workbench.dataset.palette = state.palette;
      workbench.classList.toggle('vs', Boolean(state.light));
      last.palette = state.palette;
    }
    if (state.css !== last.css) {
      style.textContent = window.__WOODFISH_CSS[state.css];
      last.css = state.css;
    }
    applyPanes(state.panes);
    if (paletteChanged) {
      // The engine re-reads the editor colors (and with them the hand-tuned preset).
      globalThis.__woodfishOverlayController?.refresh();
    }

    captionMain.textContent = state.caption?.main ?? '';
    captionSub.textContent = state.caption?.sub ?? '';
    caption.style.opacity = String(state.caption?.opacity ?? 0);
    fade.style.opacity = String(state.fade ?? 0);

    // Observers see the new DOM, the cursor moves, then timers and one animation frame run.
    await clock.settle();
    placeWidgets();
    await clock.settle();
    clock.advance(state.timeMs);
    clock.frame();
    await clock.settle();
    // Rarely (a new pane, a new palette) the engine needs another pass before every token is painted.
    for (let attempt = 0; attempt < 12 && !painted(); attempt += 1) {
      clock.frame();
      await clock.settle();
    }
    pinAnimations(state.timeMs);
    await clock.painted();
    return painted();
  }

  window.__woodfishPromo = { apply };
})();
