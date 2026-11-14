/*
 * 输入框光标：默认 6px、实心不闪、80 ms 平滑移动、彩虹色，和 Woodfish 在 VS Code 里的光标一样
 * （editor.cursorWidth 6、cursorBlinking solid、cursorSmoothCaretAnimation on）。
 * 彩虹来自 Woodfish 的光标样式（themes/shared/cursor-core.css）：一个 900% 高的渐变在光标里
 * 慢慢往上滑，所以颜色一直在变。原生光标没法做渐变，这里把它设成透明，再在宿主报告的
 * 光标位置（ctx.onCaret，来源 user）画一根同样的光标。
 */
module.exports = function caret(ctx) {
  const bar = document.createElement('div');
  bar.setAttribute('data-woodfish-caret', '');
  bar.hidden = true;
  ctx.layer.append(bar);
  let last = null;
  let typedAt = 0;
  let cancelSettle = null;

  function colors() {
    const theme = ctx.theme();
    if (ctx.params.colors === 'rainbow') return ctx.rainbow;
    if (ctx.params.colors === 'theme') return theme.stops;
    // Like VS Code: a theme with its own cursor colors uses them, the rest get the rainbow.
    return Array.isArray(theme.cursor) && theme.cursor.length > 1 ? theme.cursor : ctx.rainbow;
  }

  const BLINK = {
    blink: '@keyframes woodfish-caret-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }',
    smooth:
      '@keyframes woodfish-caret-blink { 0%, 20% { opacity: 1; } 60%, 80% { opacity: 0; } 100% { opacity: 1; } }',
    phase: '@keyframes woodfish-caret-blink { 0%, 20% { opacity: 1; } 90%, 100% { opacity: 0; } }',
    expand:
      '@keyframes woodfish-caret-blink { 0%, 20% { transform: scaleY(1); } 80%, 100% { transform: scaleY(0); } }',
  };

  function restyle() {
    const p = ctx.params;
    const stops = colors();
    const blink = BLINK[p.blinking];
    const glow =
      p.glow > 0
        ? `box-shadow: 0 0 ${4 + p.glow * 8}px color-mix(in oklab, ${stops[0]} ${Math.round(p.glow * 80)}%, transparent);`
        : '';
    ctx.style(`
${ctx.selectors.composerEditor} {
  caret-color: transparent !important;
}
[data-woodfish-caret] {
  position: absolute;
  left: 0;
  top: 0;
  width: ${p.width}px;
  will-change: transform;
}
[data-woodfish-caret][data-glide] {
  transition: transform 80ms linear;
}
[data-woodfish-caret] > i {
  position: absolute;
  inset: 0;
  border-radius: ${p.radius}px;
  overflow: hidden;
  ${glow}
  ${blink ? 'animation: woodfish-caret-blink 1.06s ease-in-out infinite;' : ''}
}
[data-woodfish-caret][data-typing] > i {
  animation: none;
}
[data-woodfish-caret] > i::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 900%;
  background: linear-gradient(180deg, var(--woodfish-caret-stops, ${[...stops, stops[0]].join(', ')}));
  animation: woodfish-caret-flow ${p.flowSeconds}s linear infinite;
}
@keyframes woodfish-caret-flow {
  from { transform: translateY(0); }
  to { transform: translateY(-88.8889%); }
}
${blink || ''}
:root[data-woodfish-paused] [data-woodfish-caret] > i,
:root[data-woodfish-paused] [data-woodfish-caret] > i::before {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  [data-woodfish-caret] { transition: none !important; }
  [data-woodfish-caret] > i, [data-woodfish-caret] > i::before { animation: none; }
  [data-woodfish-caret] > i::before { height: 100%; }
}`);
  }

  bar.append(document.createElement('i'));

  ctx.onInsert((event) => {
    if (event.source === 'user') typedAt = performance.now();
  });

  ctx.onCaret((caret) => {
    if (caret.source !== 'user') return;
    if (!caret.visible) {
      bar.hidden = true;
      last = null;
      return;
    }
    const mode = ctx.params.smoothCaretAnimation;
    const typing = performance.now() - typedAt < 60;
    const glide =
      last !== null && !ctx.simplified() && (mode === 'on' || (mode === 'explicit' && !typing));
    bar.toggleAttribute('data-glide', glide);
    bar.style.height = `${caret.height}px`;
    bar.style.transform = `translate(${caret.x}px, ${caret.y}px)`;
    bar.hidden = false;
    last = caret;
    // VS Code keeps the cursor lit while it moves and starts blinking again afterwards.
    bar.setAttribute('data-typing', '');
    if (cancelSettle) cancelSettle();
    cancelSettle = ctx.later(500, () => bar.removeAttribute('data-typing'));
  });

  ctx.onTheme(restyle);
  restyle();

  return {
    update: restyle,
    dispose: () => bar.remove(),
  };
};
