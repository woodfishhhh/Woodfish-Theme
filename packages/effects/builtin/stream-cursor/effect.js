/*
 * 吐字光标：Codex 流式输出时，回复末尾跟着一根彩虹光标。
 * 宿主把“吐字的末尾”报告成来源为 ai 的光标事件（ctx.onCaret），回复写完时发 onStreamEnd，
 * 光标随之消失；光标本身是一个 div，长相和 VS Code 里 Woodfish 的光标一样：
 * 900% 高的渐变在光标里慢慢往上滑，所以颜色一直在变。
 * 身后的单色拖尾是另一个效果（caret-trail），两个可以分开开关。
 */
module.exports = function streamCursor(ctx) {
  const bar = document.createElement('div');
  bar.setAttribute('data-woodfish-stream-cursor', '');
  bar.hidden = true;
  ctx.layer.append(bar);
  let last = null;

  function restyle() {
    const p = ctx.params;
    const stops = p.followTheme ? ctx.theme().stops : ctx.rainbow;
    ctx.style(`
[data-woodfish-stream-cursor] {
  position: absolute;
  left: 0;
  top: 0;
  width: ${p.width}px;
  border-radius: ${p.radius}px;
  overflow: hidden;
  will-change: transform;
  transition: transform ${p.smooth ? 80 : 0}ms linear;
}
[data-woodfish-stream-cursor][data-jump] {
  transition: none;
}
[data-woodfish-stream-cursor]::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 900%;
  background: linear-gradient(180deg, ${[...stops, stops[0]].join(', ')});
  animation: woodfish-stream-cursor-flow ${p.flowSeconds}s linear infinite;
}
@keyframes woodfish-stream-cursor-flow {
  from { transform: translateY(0); }
  to { transform: translateY(-88.8889%); }
}
:root[data-woodfish-paused] [data-woodfish-stream-cursor]::before {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  [data-woodfish-stream-cursor] { transition: none; }
  [data-woodfish-stream-cursor]::before { animation: none; height: 100%; }
}`);
  }

  function hide() {
    bar.hidden = true;
    last = null;
  }

  ctx.onCaret((caret) => {
    if (caret.source !== 'ai') return;
    if (!caret.visible) {
      hide();
      return;
    }
    // A new line (or a still frame) jumps; moving along the line glides.
    const jump = !last || Math.abs(caret.y - last.y) > caret.height / 2 || ctx.simplified();
    bar.toggleAttribute('data-jump', jump);
    bar.style.height = `${caret.height}px`;
    bar.style.transform = `translate(${caret.x + ctx.params.gap}px, ${caret.y}px)`;
    bar.hidden = false;
    last = caret;
  });
  ctx.onStreamEnd(hide);
  ctx.onTheme(restyle);
  restyle();

  return {
    update: restyle,
    dispose: () => bar.remove(),
  };
};
