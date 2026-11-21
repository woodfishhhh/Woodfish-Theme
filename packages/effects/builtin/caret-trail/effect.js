/*
 * 光标拖尾：文字光标移动时，身后拖一条单色的带子。你打字时跟着你的光标，Codex 里 AI
 * 流式吐字时跟着吐字的末尾（宿主把两者都报告成 ctx.onCaret 事件）。
 *
 * 照抄 VS Code 的 Animations 插件（brandonkirbyson.vscode-animations 2.0.9 的
 * CursorAnimation，MIT 协议，Copyright (c) 2023 Brandon Kirbyson）：一串点首尾相连，
 * 每帧第一个点贴着光标，后面每个点向前一个点挪 42%（横向）和 35%（纵向），画成一条实心
 * 带子，宽 = 光标宽，高 = 光标高。光标停下、带子收拢后停止绘制。
 * 带子只画在光标所在文字露出来的范围里（事件里的 clip），不会盖到输入框或滚出去的地方。
 */
module.exports = function caretTrail(ctx) {
  /** One chain per caret: the user's and the AI's streaming end can move at the same time. */
  const trails = new Map();

  function color() {
    return ctx.params.followTheme ? ctx.theme().accent : ctx.params.color;
  }

  function step(trail) {
    let x = trail.head.x;
    let y = trail.head.y;
    let moving = false;
    for (let i = 0; i < trail.points.length; i += 1) {
      const next = trail.points[i + 1] || trail.points[0];
      const point = trail.points[i];
      moving = moving || Math.abs(point.x - x) > 0.05 || Math.abs(point.y - y) > 0.05;
      point.x = x;
      point.y = y;
      x += 0.42 * (next.x - point.x);
      y += 0.35 * (next.y - point.y);
    }
    return moving;
  }

  function draw(g, trail) {
    const { points, width, height } = trail;
    g.globalAlpha = ctx.params.opacity;
    g.fillStyle = color();
    g.strokeStyle = color();
    g.lineJoin = 'round';
    if (ctx.params.style === 'line') {
      const line = Math.min(width, height);
      const gap = (height - line) / 3;
      g.lineWidth = line;
      g.beginPath();
      for (let strand = 0; strand <= 3; strand += 1) {
        points.forEach((point, i) => {
          const y = point.y + strand * gap + line / 2;
          if (i === 0) g.moveTo(point.x, y);
          else g.lineTo(point.x, y);
        });
      }
      g.stroke();
      return;
    }
    g.beginPath();
    points.forEach((point, i) =>
      i === 0 ? g.moveTo(point.x, point.y) : g.lineTo(point.x, point.y)
    );
    for (let i = points.length - 1; i >= 0; i -= 1) g.lineTo(points[i].x, points[i].y + height);
    g.closePath();
    g.fill();
    g.beginPath();
    g.lineWidth = Math.min(width, height);
    const middle = -width / 2 + height / 2;
    points.forEach((point, i) =>
      i === 0 ? g.moveTo(point.x, point.y + middle) : g.lineTo(point.x, point.y + middle)
    );
    g.stroke();
  }

  function channel(source) {
    const layer = ctx.host === 'codex' ? document.createElement('div') : null;
    const canvas = layer ? document.createElement('canvas') : undefined;
    if (canvas) {
      layer.dataset.woodfishTrail = source;
      canvas.style.position = 'absolute';
      layer.append(canvas);
    }
    const state = { layer, canvas, trail: null, left: 0, top: 0 };
    state.painter = ctx.painter((g) => {
      const trail = state.trail;
      if (!trail || !step(trail)) return false;
      g.translate(-state.left, -state.top);
      if (!layer && trail.clip) {
        const r = trail.clip;
        g.beginPath();
        g.rect(r.left, r.top, r.right - r.left, r.bottom - r.top);
        g.clip();
      }
      draw(g, trail);
      return true;
    }, canvas);
    trails.set(source, state);
    return state;
  }

  function hide(source) {
    const state = trails.get(source);
    if (state) {
      state.layer?.remove();
      state.trail = null;
    }
  }

  ctx.onCaret((caret) => {
    const wanted = ctx.params.sources;
    if (wanted !== 'all' && wanted !== caret.source) return;
    if (!caret.visible || ctx.simplified()) {
      hide(caret.source);
      return;
    }
    const width = caret.width > 0 ? caret.width : ctx.params.width;
    const length = Math.round(ctx.params.length);
    const state = trails.get(caret.source) || channel(caret.source);
    let trail = state.trail;
    if (trail && trail.owner !== caret.owner) trail = null;
    const pos = state.layer ? ctx.lib.placeCaretLayer(state.layer, caret) : caret;
    const x = pos.x + width / 2;
    const y = pos.y;
    // AI text wraps to the next line all the time; its caret jumps there instead of sweeping
    // a band back across the new line. Your own caret sweeps, as in VS Code.
    const wrapped =
      trail && caret.source === 'ai' && Math.abs(caret.y - trail.lineY) > caret.height / 2;
    if (!trail || trail.points.length !== length || wrapped) {
      trail = { owner: caret.owner, head: { x, y }, points: [], width, height: caret.height };
      trail.points = Array.from({ length }, () => ({ x, y }));
      state.trail = trail;
    }
    trail.head.x = x;
    trail.lineY = caret.y;
    trail.head.y = y;
    trail.width = width;
    trail.height = caret.height;
    trail.clip = caret.clip || null;
    if (state.canvas) {
      // Only allocate pixels for the visible band swept out by this chain.
      const r = caret.clip;
      const dx = pos.x - caret.x,
        dy = y - caret.y;
      const xs = trail.points.map((p) => p.x),
        ys = trail.points.map((p) => p.y);
      const left = Math.floor(Math.max(r.left + dx, Math.min(x, ...xs) - width));
      const top = Math.floor(Math.max(r.top + dy, Math.min(y, ...ys) - width));
      const w = Math.max(1, Math.ceil(Math.min(r.right + dx, Math.max(x, ...xs) + width)) - left);
      const h = Math.max(
        1,
        Math.ceil(Math.min(r.bottom + dy, Math.max(y, ...ys) + caret.height + width)) - top
      );
      const c = state.canvas,
        ratio = window.devicePixelRatio || 1;
      state.left = left;
      state.top = top;
      Object.assign(c.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${w}px`,
        height: `${h}px`,
      });
      if (c.width !== Math.ceil(w * ratio)) c.width = Math.ceil(w * ratio);
      if (c.height !== Math.ceil(h * ratio)) c.height = Math.ceil(h * ratio);
    }
    state.painter.wake();
  });
  ctx.onStreamEnd(() => hide('ai'));

  return {
    update() {
      trails.forEach((_, source) => hide(source));
    },
    dispose() {
      trails.forEach((_, source) => hide(source));
    },
  };
};
