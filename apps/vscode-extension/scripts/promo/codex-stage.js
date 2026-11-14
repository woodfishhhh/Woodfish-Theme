/*
 * Runs inside the Codex promo page (codex-page.js). `render-promo-video.js` sends one state
 * per frame; the stage changes the Codex-like DOM the way Codex does (a reply grows as text
 * streams in, the composer gets real input events, the sidebar marks the active and running
 * threads) and lets the real Woodfish overlay react. Time comes from clock.js.
 */
(() => {
  'use strict';

  const clock = window.__promoClock;
  const root = document.documentElement;
  const app = document.getElementById('app');
  const threadsRoot = document.querySelector('.threads');
  const title = document.querySelector('.thread-title');
  const column = document.querySelector('.column');
  const editor = document.querySelector('[data-codex-composer-root] [contenteditable="true"]');
  const floating = document.querySelector('[data-composer-overlay-floating-ui]');
  const slashItems = [...floating.querySelectorAll('[role="option"]')];
  const timeline = document.querySelector('[data-app-action-timeline-scroll]');
  const send = document.querySelector('.bg-composer-primary');
  const overlay = document.querySelector('.promo-overlay');
  const caption = overlay.querySelector('.caption');
  const fade = overlay.querySelector('.fade');
  const icons = window.__promoIcons;
  const born = new WeakMap();
  let controller = null;
  const last = { core: null, threads: null, messages: new Map() };

  const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function settingsFor(slug, light) {
    return {
      palette: { dark: light ? 'dark' : slug, light: light ? slug : 'light' },
      backgroundImage: 'caiyun',
      customCss: [],
    };
  }

  function effectsFor(background) {
    return window.__promoCodexEffects.map((effect) =>
      effect.id === 'background'
        ? { ...effect, values: { ...effect.values, enabled: background } }
        : effect
    );
  }

  /** The picture is decoded and blurred asynchronously; frames wait until it is on screen. */
  async function waitForBackground() {
    for (let attempt = 0; attempt < 2000; attempt += 1) {
      if (getComputedStyle(root).getPropertyValue('--woodfish-background-image').includes('blob:')) {
        return;
      }
      await clock.settle();
    }
    throw new Error('the background picture never loaded');
  }

  async function applyCore(state) {
    const userCss = state.userCss ?? '';
    const background = state.background !== false;
    const key = JSON.stringify([state.palette, state.light, background, userCss]);
    if (key === last.core) {
      return;
    }
    root.setAttribute('data-theme', state.light ? 'light' : 'dark');
    const settings = settingsFor(state.palette, state.light);
    if (controller) {
      controller.update(settings, effectsFor(background), 0, userCss);
    } else {
      controller = window.__promoStartCodex(settings, 'userscript', effectsFor(background), 0, userCss);
    }
    last.core = key;
    if (background) {
      await waitForBackground();
    }
  }

  function applyThreads(spec) {
    const key = JSON.stringify(spec.items);
    if (key !== last.threads) {
      threadsRoot.innerHTML = spec.items
        .map((item) => `<div data-app-action-sidebar-thread-row><span class="title">${escapeHtml(item)}</span></div>`)
        .join('');
      last.threads = key;
    }
    [...threadsRoot.children].forEach((row, index) => {
      if (index === spec.active) {
        row.setAttribute('data-app-action-sidebar-thread-active', 'true');
      } else {
        row.removeAttribute('data-app-action-sidebar-thread-active');
      }
      const spinner = row.querySelector('.motion-safe\\:animate-spin');
      if ((index === spec.running) !== Boolean(spinner)) {
        if (spinner) {
          spinner.remove();
        } else {
          row.insertAdjacentHTML('beforeend', '<span class="motion-safe:animate-spin"></span>');
        }
      }
    });
  }

  const codeLength = (lines) => lines.reduce((sum, line) => sum + line.reduce((s, [text]) => s + text.length, 0) + 1, 0);
  const blockLength = (block) => (block[0] === 'code' ? codeLength(block[2]) : block[1].length);

  function createBlock(block) {
    if (block[0] === 'code') {
      const element = document.createElement('div');
      element.setAttribute('data-code-block', 'true');
      element.setAttribute('data-markdown-copy', 'code-block');
      element.innerHTML = `<div class="head">${icons.code}${escapeHtml(block[1])}<span class="tools">${icons.split}${icons.copy}</span></div><pre data-code-block-source="true"><code></code></pre>`;
      return element;
    }
    const element = document.createElement(block[0]);
    element.append(document.createTextNode(''));
    return element;
  }

  /**
   * Code arrives a line at a time (a line shows once the stream reaches it), as highlight.js
   * output: classed spans for tokens, bare text for the rest.
   */
  function updateCode(element, lines, visible) {
    const code = element.querySelector('code');
    let start = 0;
    let count = 0;
    for (const line of lines) {
      if (start >= visible) {
        break;
      }
      count += 1;
      start += line.reduce((s, [text]) => s + text.length, 0) + 1;
    }
    let shown = Number(code.dataset.lines ?? 0);
    for (; shown < count; shown += 1) {
      for (const [text, cls] of lines[shown]) {
        if (cls) {
          const token = document.createElement('span');
          token.className = cls;
          token.textContent = text;
          code.append(token);
        } else {
          code.append(text);
        }
      }
      code.append('\n');
    }
    code.dataset.lines = String(shown);
  }

  function createMessage(message) {
    const element = document.createElement('div');
    if (message.role === 'user') {
      element.className = 'turn-user';
      element.innerHTML = `<div data-user-message-bubble>${escapeHtml(message.text)}</div>`;
      return { element, blocks: [] };
    }
    element.className = 'turn-assistant';
    element.innerHTML = `<div data-markdown-text-style="assistant-message"></div><div class="turn-actions" hidden>${icons.copy}${icons.speaker}${icons.thumb}</div>`;
    return { element, blocks: [] };
  }

  function updateAssistant(entry, message) {
    const markdown = entry.element.firstElementChild;
    let budget = message.shown ?? Infinity;
    message.blocks.forEach((block, index) => {
      const length = blockLength(block);
      const visible = Math.max(0, Math.min(length, budget));
      budget -= length;
      let element = entry.blocks[index];
      if (visible <= 0) {
        element?.remove();
        entry.blocks[index] = null;
        return;
      }
      if (!element) {
        element = createBlock(block);
        markdown.append(element);
        entry.blocks[index] = element;
      }
      if (block[0] === 'code') {
        updateCode(element, block[2], visible);
      } else {
        const text = block[1].slice(0, visible);
        if (element.firstChild.data !== text) {
          element.firstChild.data = text;
        }
      }
    });
    entry.element.lastElementChild.hidden = !message.actions;
  }

  /** Messages only ever get appended within a shot; a different list starts over. */
  function applyMessages(messages) {
    const ids = messages.map((message) => message.id);
    const known = [...last.messages.keys()];
    if (!known.every((id, index) => ids[index] === id)) {
      column.replaceChildren();
      last.messages.clear();
    }
    for (const message of messages) {
      let entry = last.messages.get(message.id);
      if (!entry) {
        entry = createMessage(message);
        column.append(entry.element);
        last.messages.set(message.id, entry);
      }
      if (message.role === 'assistant') {
        updateAssistant(entry, message);
      }
    }
  }

  function paragraph() {
    return editor.querySelector('p');
  }

  function placeCaret(offset) {
    const line = paragraph();
    const node = line.firstChild && line.firstChild.nodeType === Node.TEXT_NODE ? line.firstChild : line;
    const range = document.createRange();
    range.setStart(node, node === line ? 0 : Math.min(offset, node.length));
    range.collapse(true);
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function caretOffset() {
    const selection = document.getSelection();
    return selection.rangeCount && editor.contains(selection.anchorNode) ? selection.anchorOffset : -1;
  }

  /** Typing goes through execCommand, so the page sees real input events (what Woodfish listens to). */
  function applyComposer(spec) {
    const want = spec.text ?? '';
    const have = editor.textContent;
    if (spec.focus && document.activeElement !== editor) {
      editor.focus();
    } else if (!spec.focus && document.activeElement === editor) {
      editor.blur();
    }
    if (want !== have) {
      if (spec.focus && want.startsWith(have)) {
        placeCaret(have.length);
        document.execCommand('insertText', false, want.slice(have.length));
      } else {
        // Sent or cleared: like ProseMirror, an empty paragraph keeps a trailing <br>.
        editor.innerHTML = '<p data-placeholder="和 Codex 一起工作"></p>';
        paragraph().textContent = want;
        if (!want) {
          paragraph().innerHTML = '<br class="ProseMirror-trailingBreak">';
        }
      }
    }
    const line = paragraph();
    line.classList.toggle('is-empty', line.textContent === '');
    if (spec.focus) {
      const at = spec.caret ?? want.length;
      if (caretOffset() !== at) {
        placeCaret(at);
      }
    }
    send.classList.toggle('idle', want === '');
  }

  function applyOverlay(state) {
    overlay.style.zoom = String(1 / (state.zoom ?? 1));
    const opacity = state.caption?.opacity ?? 0;
    const at = state.caption?.at === 'top' ? 'top' : 'bottom';
    caption.classList.toggle('top', at === 'top');
    caption.querySelector('.main').textContent = state.caption?.main ?? '';
    caption.querySelector('.sub').textContent = state.caption?.sub ?? '';
    caption.style.opacity = String(opacity);
    fade.style.opacity = String(state.fade ?? 0);
  }

  /** CSS animations and transitions follow the frame clock, not the wall clock. */
  function pinAnimations(timeMs) {
    for (const animation of document.getAnimations()) {
      if (!born.has(animation)) {
        born.set(animation, timeMs);
      }
      animation.pause();
      animation.currentTime = Math.max(0, timeMs - born.get(animation));
    }
  }

  async function apply(state) {
    await applyCore(state);
    app.classList.toggle('no-sidebar', state.sidebar === false);
    applyThreads(state.threads);
    title.textContent = state.title ?? '';
    applyMessages(state.messages ?? []);
    applyComposer(state.composer ?? {});
    // Codex keeps the newest text in view while a reply streams.
    timeline.scrollTop = timeline.scrollHeight;
    floating.hidden = state.slash == null;
    slashItems.forEach((item, index) => item.setAttribute('aria-selected', String(index === state.slash)));
    applyOverlay(state);
    // Observers, input and selection events first, then timers and one animation frame.
    await clock.settle();
    await clock.settle();
    clock.advance(state.timeMs);
    clock.frame();
    await clock.settle();
    pinAnimations(state.timeMs);
    await clock.painted();
    return true;
  }

  window.__woodfishPromo = { apply };
})();
