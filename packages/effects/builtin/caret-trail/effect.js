/*
 * 光标拖尾：文字光标移动时，身后拖一条单色的带子。你打字时跟着你的光标，Codex 里 AI
 * 流式吐字时跟着吐字的末尾（宿主把两者都报告成 ctx.onCaret 事件）。
 *
 * 照抄 VS Code 的 Animations 插件（brandonkirbyson.vscode-animations 2.0.9 的
 * CursorAnimation，MIT 协议，Copyright (c) 2023 Brandon Kirbyson）：一串点首尾相连，
 * 每帧第一个点贴着光标，后面每个点向前一个点挪 42%（横向）和 35%（纵向），画成一条实心
 * 带子，宽 = 光标宽，高 = 光标高。光标停下、带子收拢后停止绘制。
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

  const painter = ctx.painter((g) => {
    let moving = false;
    for (const trail of trails.values()) {
      if (step(trail)) {
        moving = true;
        draw(g, trail);
      }
    }
    return moving;
  });

  ctx.onCaret((caret) => {
    const wanted = ctx.params.sources;
    if (wanted !== 'all' && wanted !== caret.source) return;
    if (!caret.visible || ctx.simplified()) {
      trails.delete(caret.source);
      painter.wake();
      return;
    }
    const width = caret.width > 0 ? caret.width : ctx.params.width;
    const length = Math.round(ctx.params.length);
    let trail = trails.get(caret.source);
    const x = caret.x + width / 2;
    // AI text wraps to the next line all the time; its caret jumps there instead of sweeping
    // a band back across the new line. Your own caret sweeps, as in VS Code.
    const wrapped =
      trail && caret.source === 'ai' && Math.abs(caret.y - trail.head.y) > caret.height / 2;
    if (!trail || trail.points.length !== length || wrapped) {
      trail = { head: { x, y: caret.y }, points: [], width, height: caret.height };
      trail.points = Array.from({ length }, () => ({ x, y: caret.y }));
      trails.set(caret.source, trail);
    }
    trail.head.x = x;
    trail.head.y = caret.y;
    trail.width = width;
    trail.height = caret.height;
    painter.wake();
  });
  ctx.onStreamEnd(() => trails.delete('ai'));

  return {
    update() {
      trails.clear();
    },
  };
};
