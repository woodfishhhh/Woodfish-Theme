/*
 * Runs inside the promo page. `render-promo-video.js` sends one state per frame; the stage
 * applies it to the Monaco-like DOM, pins every CSS animation to the frame time and waits
 * for the real Woodfish engine (overlay-bootstrap.js) to paint before the frame is captured.
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
  const born = new WeakMap();
  let last = { palette: null, css: null, panes: [] };

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

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
    editor.innerHTML = `<div class="view-lines"></div><div class="cursors-layer"></div>`;
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
      last.panes = signatures.map((signature) => ({ signature, html: null }));
    }
    panes.forEach((pane, index) => {
      const element = panesRoot.children[index];
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
        cursor.style.top = `${rect.top - box.top + 6}px`;
      }
      const suggest = pane.querySelector('.suggest-slot');
      if (suggest) {
        suggest.style.left = `${rect.left - box.left - 40}px`;
        suggest.style.top = `${rect.bottom - box.top + 6}px`;
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

    await nextFrame();
    for (let attempt = 0; attempt < 12 && !painted(); attempt += 1) {
      await nextFrame();
    }
    await nextFrame();
    placeWidgets();
    pinAnimations(state.timeMs);
    return painted();
  }

  window.__woodfishPromo = { apply };
})();
