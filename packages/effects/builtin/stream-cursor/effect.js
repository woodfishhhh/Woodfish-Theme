/*
 * 吐字光标：Codex 流式输出时，回复末尾跟着一根彩虹光标。
 * 宿主把“吐字的末尾”报告成来源为 ai 的光标事件（ctx.onCaret），回复写完时发 onStreamEnd，
 * 光标随之消失；光标本身是一个 div，长相和 VS Code 里 Woodfish 的光标一样：
 * 900% 高的渐变在光标里慢慢往上滑，所以颜色一直在变。
 * 身后的单色拖尾是另一个效果（caret-trail），两个可以分开开关。
 * 光标只画在回复露出文字的范围里（事件里的 clip）：滚到输入框后面的那段字连同光标一起被遮住。
 */
module.exports = function streamCursor(ctx) {
  // 铺满窗口的一层，按 clip 裁剪；光标在里面移动，平滑动画不受裁剪范围变化影响。
  const clip = document.createElement('div');
  clip.setAttribute('data-woodfish-stream-cursor-clip', '');
  const bar = document.createElement('div');
  bar.setAttribute('data-woodfish-stream-cursor', '');
  bar.hidden = true;
  clip.append(bar);
  ctx.layer.append(clip);
  let last = null;

  /** The rectangle (viewport px) the cursor may show in; none means the whole window. */
  function clipPath(r) {
    return r
      ? `polygon(${r.left}px ${r.top}px, ${r.right}px ${r.top}px, ${r.right}px ${r.bottom}px, ${r.left}px ${r.bottom}px)`
      : '';
  }

  function restyle() {
    const p = ctx.params;
    const stops = p.followTheme ? ctx.theme().stops : ctx.rainbow;
    ctx.style(`
[data-woodfish-stream-cursor-clip] {
  position: absolute;
  inset: 0;
}
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
  background: linear-gradient(180deg, var(--woodfish-stream-cursor-stops, ${[...stops, stops[0]].join(', ')}));
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
    clip.style.clipPath = clipPath(caret.clip);
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
    dispose: () => clip.remove(),
  };
};
