/*
 * 鼠标拖尾：鼠标指针移动时，身后拖一条单色的带子。
 *
 * 画法照抄 VS Code 的 Animations 插件（brandonkirbyson.vscode-animations 2.0.9 里的
 * CursorAnimation，MIT 协议，Copyright (c) 2023 Brandon Kirbyson）：一串点首尾相连，
 * 每帧第一个点贴着指针，后面每个点向前一个点挪 42%（横向）和 35%（纵向），再把这串点
 * 画成一条实心带子（block）或四条细线（line）。和插件不同的只有两处：按屏幕像素比绘制
 * （不发虚），指针停下、带子收拢以后就停止绘制（不空转）。
 *
 * 参数在 effect.json，值在 params.json；改完保存会自动刷新，或运行 woodfish codex reload。
 */
module.exports = function mouseTrail(ctx) {
  let points = [];
  const head = { x: 0, y: 0 };
  let inside = false;

  function color() {
    return ctx.params.followTheme ? ctx.theme().accent : ctx.params.color;
  }

  /** One frame of the chain (Animations' updateParticles); false once it has caught up. */
  function step() {
    let x = head.x;
    let y = head.y;
    let moving = false;
    for (let i = 0; i < points.length; i += 1) {
      const next = points[i + 1] || points[0];
      const point = points[i];
      moving = moving || Math.abs(point.x - x) > 0.05 || Math.abs(point.y - y) > 0.05;
      point.x = x;
      point.y = y;
      x += 0.42 * (next.x - point.x);
      y += 0.35 * (next.y - point.y);
    }
    return moving;
  }

  function draw(g) {
    const width = ctx.params.width;
    const height = ctx.params.height;
    g.globalAlpha = ctx.params.opacity;
    g.fillStyle = color();
    g.strokeStyle = color();
    g.lineJoin = 'round';
    if (ctx.params.style === 'line') {
      // Four strands across the height, like the plugin's "line" style.
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
    // "block": the band between the points and the points shifted down by the height,
    // plus a stroke along the middle so the ends are rounded.
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
    if (!inside || points.length < 2) return false;
    const moving = step();
    draw(g);
    return moving;
  });

  ctx.on(
    window,
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch' || ctx.simplified()) {
        points = [];
        return;
      }
      inside = true;
      head.x = event.clientX + ctx.params.width / 2;
      head.y = event.clientY;
      const length = Math.round(ctx.params.length);
      if (points.length !== length) {
        points = Array.from({ length }, () => ({ x: head.x, y: head.y }));
      }
      painter.wake();
    },
    { passive: true, capture: true }
  );
  ctx.on(document.documentElement, 'pointerleave', () => {
    inside = false;
    points = [];
    painter.wake();
  });

  return {
    update() {
      painter.wake();
    },
  };
};
