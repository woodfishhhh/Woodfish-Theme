/*
 * 流光边框：侧栏选中的会话照抄 Bifrost 控制台「创建 Key」按钮（.ui-button--bridge，
 * 经 Bifrost 作者同意照抄）。
 *
 * - 1.5px 透明边框里用 border-box 画七色 conic-gradient 光谱环，@property 角度 3.2 秒转一圈；
 * - ::after 是里面干净的面（圆角 8.5px），悬停换成更亮一档；
 * - ::before 是同一个光谱环向外扩 5px、模糊 14px、0.5 浓度的柔光晕，悬停 0.85 并上浮 1px；
 * - 运行中（没选中）的会话用弱化版：光晕更淡、不上浮；
 * - 窗口在后台时停转，系统“减少动态”时不转。
 */
module.exports = function threadRing(ctx) {
  /* Bifrost "bridge at night" (dark) and "bridge at dawn" (light) tokens. */
  const BANDS = {
    dark: ['#ff5f4e', '#ff9b3d', '#ffd25e', '#4fd18b', '#38c6c8', '#5b8cff', '#9b7bff'],
    light: ['#e5432f', '#ee7a1a', '#e3a600', '#1fa463', '#109fa2', '#3b6cf0', '#7a52f0'],
  };
  const FACE = {
    dark: { rest: '#10142a', hover: '#171c36' },
    light: { rest: '#ffffff', hover: '#eef0f7' },
  };

  function colors() {
    const theme = ctx.theme();
    if (ctx.params.followTheme) {
      return {
        bands: theme.stops,
        rest: theme.background,
        hover: `color-mix(in oklab, ${theme.background} 92%, ${theme.foreground})`,
      };
    }
    return { bands: BANDS[theme.mode], ...FACE[theme.mode] };
  }

  function restyle() {
    const p = ctx.params;
    const row = ctx.selectors.threadRow;
    const active = ctx.selectors.activeThread;
    const running = ctx.selectors.runningThread;
    const { bands, rest, hover } = colors();
    const ring = `conic-gradient(from var(--woodfish-ring-angle), ${[...bands, bands[0]].join(', ')})`;
    const lit = `${active}, ${running}`;
    const pseudo = (part) => `${active}::${part}, ${running}::${part}`;
    ctx.style(`
@property --woodfish-ring-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
@keyframes woodfish-ring-flow {
  to { --woodfish-ring-angle: 360deg; }
}
${row} {
  border-radius: ${p.radius}px !important;
}
${lit} {
  --woodfish-ring: ${ring};
  position: relative;
  isolation: isolate;
  border: ${p.border}px solid transparent !important;
  background: var(--woodfish-ring) border-box !important;
  animation: woodfish-ring-flow ${p.turnSeconds}s linear infinite;
  transition: transform 160ms ease;
}
${pseudo('after')} {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: ${Math.max(0, p.radius - p.border)}px;
  background: ${rest};
  transition: background 160ms ease;
  pointer-events: none;
}
${pseudo('before')} {
  content: "";
  position: absolute;
  z-index: -1;
  inset: -5px;
  border-radius: inherit;
  background: var(--woodfish-ring);
  filter: blur(14px);
  opacity: ${p.halo};
  animation: inherit;
  transition: opacity 200ms ease;
  pointer-events: none;
}
${running}:not(${active})::before {
  opacity: ${p.runningHalo};
}
${active}:hover {
  ${p.lift ? 'transform: translateY(-1px);' : ''}
}
${active}:hover::after {
  background: ${hover};
}
${active}:hover::before {
  opacity: ${p.hoverHalo};
}
:root[data-woodfish-paused] :is(${lit}),
:root[data-woodfish-paused] :is(${lit})::before {
  animation-play-state: paused;
}
:root[data-reduced-motion="true"] :is(${lit}),
:root[data-reduced-motion="true"] :is(${lit})::before {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  ${lit}, ${pseudo('before')} { animation: none; }
}`);
  }

  ctx.onTheme(restyle);
  restyle();
  return { update: restyle };
};
