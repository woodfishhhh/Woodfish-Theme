/*
 * 新字淡入：流式输出时，刚出现的字有一个很短的出场。
 *
 * - 淡入（fade）：给正在写的段落加一层遮罩，最后一行里最近几段新字按出现时间从淡到实，
 *   其余部分照常显示；淡完立刻撤掉遮罩。
 * - 模糊变清晰（blur）：在新字上盖一小块背景模糊，随后淡掉。
 * - 新字发光（glow）：用 CSS Highlight API 给新字加一圈 text-shadow，分四档退去。
 *
 * 三种都不拆字、不包 span、不改回复的 DOM，只在吐字时工作，写完就什么都不留。
 */
module.exports = function textReveal(ctx) {
  const MASK_PROPERTIES = ['mask-image', 'mask-size', 'mask-position', 'mask-repeat'];
  const HIGHLIGHT_NAMES = [0, 1, 2, 3].map((level) => `woodfish-text-reveal-${level}`);
  let block = null;
  let line = null;
  const chunks = [];
  const veils = [];
  const spare = [];
  const ranges = [];
  const highlights = [];

  function clearMask() {
    if (block) for (const name of MASK_PROPERTIES) block.style.removeProperty(name);
  }

  function paintMask(now) {
    const duration = ctx.params.duration;
    while (chunks.length && now - chunks[0].t >= duration) chunks.shift();
    if (!block || !chunks.length) {
      clearMask();
      return false;
    }
    const stops = ['#000 0px', `#000 ${chunks[0].x0}px`];
    for (const chunk of chunks) {
      const k = Math.min(1, Math.max(0, now - chunk.t) / duration);
      const alpha = (ctx.params.start + (1 - ctx.params.start) * k).toFixed(3);
      stops.push(`rgb(0 0 0 / ${alpha}) ${chunk.x0}px`, `rgb(0 0 0 / ${alpha}) ${chunk.x1}px`);
    }
    block.style.setProperty(
      'mask-image',
      `linear-gradient(#000, #000), linear-gradient(90deg, ${stops.join(', ')})`
    );
    block.style.setProperty('mask-size', `100% ${line.top}px, 100% ${line.height}px`);
    block.style.setProperty('mask-position', `0 0, 0 ${line.top}px`);
    block.style.setProperty('mask-repeat', 'no-repeat');
    return true;
  }

  function paintVeils(now) {
    const duration = Math.max(120, ctx.params.duration * 1.4);
    for (let i = veils.length - 1; i >= 0; i -= 1) {
      const k = (now - veils[i].t) / duration;
      if (k >= 1) {
        veils[i].el.hidden = true;
        spare.push(veils[i].el);
        veils.splice(i, 1);
      } else {
        veils[i].el.style.opacity = String(1 - Math.max(0, k));
      }
    }
    return veils.length > 0;
  }

  function paintGlow(now) {
    const duration = Math.max(160, ctx.params.duration * 2);
    highlights.forEach((highlight) => highlight.clear());
    for (let i = ranges.length - 1; i >= 0; i -= 1) {
      const age = Math.max(0, now - ranges[i].t);
      if (age >= duration) ranges.splice(i, 1);
      else highlights[Math.min(3, Math.floor((age / duration) * 4))].add(ranges[i].range);
    }
    return ranges.length > 0;
  }

  const painter = ctx.painter((g, now) => {
    if (ctx.params.style === 'fade') return paintMask(now);
    if (ctx.params.style === 'blur') return paintVeils(now);
    return paintGlow(now);
  });

  function setupGlow() {
    if (highlights.length || !(globalThis.CSS && CSS.highlights && globalThis.Highlight)) return;
    for (const name of HIGHLIGHT_NAMES) {
      const highlight = new Highlight();
      highlights.push(highlight);
      CSS.highlights.set(name, highlight);
    }
  }

  function restyle() {
    const color = ctx.theme().accent;
    const glow = HIGHLIGHT_NAMES.map(
      (name, level) =>
        `::highlight(${name}) { text-shadow: 0 0 ${9 - level * 2}px color-mix(in oklab, ${color} ${85 - level * 20}%, transparent), 0 0 ${5 - level}px color-mix(in oklab, ${color} ${60 - level * 14}%, transparent); }`
    );
    ctx.style(
      [
        ...glow,
        '[data-woodfish-text-reveal-veil] { position: absolute; left: 0; top: 0; border-radius: 4px; backdrop-filter: blur(3.5px); -webkit-backdrop-filter: blur(3.5px); }',
      ].join('\n')
    );
  }

  function onFade(event) {
    if (event.block !== block) {
      clearMask();
      block = event.block;
      chunks.length = 0;
      line = null;
    }
    if (!block) return;
    const box = block.getBoundingClientRect();
    const last = event.rects[event.rects.length - 1];
    const top = last.top - box.top;
    if (!line || Math.abs(top - line.top) > last.height / 2) {
      chunks.length = 0;
      line = { top, height: last.height + 2 };
    }
    chunks.push({ x0: last.left - box.left, x1: last.right - box.left + 1, t: performance.now() });
  }

  function onBlur(event) {
    for (const rect of event.rects) {
      const el = spare.pop() || document.createElement('div');
      el.setAttribute('data-woodfish-text-reveal-veil', '');
      el.hidden = false;
      el.style.transform = `translate(${rect.left - 2}px, ${rect.top}px)`;
      el.style.width = `${rect.width + 4}px`;
      el.style.height = `${rect.height}px`;
      el.style.opacity = '1';
      ctx.layer.append(el);
      veils.push({ el, t: performance.now() });
    }
  }

  function onGlow(event) {
    if (!event.node) return;
    setupGlow();
    if (!highlights.length) return;
    const range = document.createRange();
    range.setStart(event.node, event.start);
    range.setEnd(event.node, Math.min(event.node.length, event.start + event.text.length));
    ranges.push({ range, t: performance.now() });
  }

  ctx.onInsert((event) => {
    if (!event.text || ctx.simplified() || !event.rects.length) return;
    if (ctx.params.sources === 'ai' && event.source !== 'ai') return;
    if (ctx.params.style === 'fade') onFade(event);
    else if (ctx.params.style === 'blur') onBlur(event);
    else onGlow(event);
    painter.wake();
  });

  function reset() {
    clearMask();
    block = null;
    chunks.length = 0;
    ranges.length = 0;
    highlights.forEach((highlight) => highlight.clear());
    veils.splice(0).forEach((veil) => veil.el.remove());
  }

  ctx.onStreamEnd(reset);
  ctx.onTheme(restyle);
  restyle();

  return {
    update() {
      reset();
      restyle();
    },
    dispose() {
      reset();
      spare.forEach((el) => el.remove());
      if (highlights.length) HIGHLIGHT_NAMES.forEach((name) => CSS.highlights.delete(name));
    },
  };
};
