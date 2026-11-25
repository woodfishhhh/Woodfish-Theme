/*
 * 强调色点缀：输入框聚焦光晕、双色渐变的发送按钮、当前标签下的渐变短条。
 * 颜色来自宿主的强调色变量（Woodfish 主题会把它换成主题强调色），第二强调色用主题的，
 * 没有就把强调色在 OKLCH 里转 60°。
 */
module.exports = function accent(ctx) {
  /* Where each host keeps its accent, the theme's second accent and the tab gradient. */
  const HOST = {
    codex: {
      scope: ':root',
      accent: 'var(--app-color-text-accent, #339cff)',
      accent2: '--woodfish-codex-accent-2',
      tab: '--woodfish-codex-tab-gradient',
    },
    // dsh declares its colors on <body>, so the derived ones are declared there too.
    dsh: {
      scope: 'body',
      accent: 'var(--dsw-alias-state-business-primary, #4176e6)',
      accent2: '--woodfish-dsh-accent-2',
      tab: '--woodfish-dsh-tab-gradient',
    },
  };
  const host = HOST[ctx.host] || HOST.codex;

  function restyle() {
    const p = ctx.params;
    const accent = host.accent;
    const parts = [
      `${host.scope} {
  --woodfish-accent: ${accent};
  --woodfish-accent-alt: var(${host.accent2}, oklch(from ${accent} l c calc(h + 60)));
}`,
    ];
    if (p.composerGlow) {
      // On the element Codex rounds, so the glow follows its radius and Codex's clipping
      // (a long draft scrolls with `overflow: auto`) cannot cut it.
      parts.push(`:is(${ctx.selectors.composerSurface}):focus-within {
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--woodfish-accent) 55%, transparent),
    0 0 ${Math.round(22 * p.glow)}px -8px var(--woodfish-accent),
    0 0 ${Math.round(34 * p.glow)}px -14px var(--woodfish-accent-alt) !important;
}`);
    }
    if (p.sendButton) {
      parts.push(`${ctx.selectors.composerPrimaryButton} {
  background-image: linear-gradient(
    135deg,
    var(--woodfish-accent),
    color-mix(in oklab, var(--woodfish-accent-alt) 50%, var(--woodfish-accent))
  ) !important;
  box-shadow: 0 0 ${Math.round(14 * p.glow)}px -4px color-mix(in oklab, var(--woodfish-accent) 70%, transparent) !important;
}`);
    }
    if (p.tabBar) {
      parts.push(`@keyframes woodfish-accent-tab-drift {
  from { background-position: 0% 50%; }
  to { background-position: 100% 50%; }
}
${ctx.selectors.activeTab}::after {
  content: "";
  position: absolute;
  left: 22%;
  right: 22%;
  bottom: 1px;
  height: 2px;
  border-radius: 999px;
  background-image: var(
    ${host.tab},
    linear-gradient(to right, var(--woodfish-accent), var(--woodfish-accent-alt))
  );
  background-size: 200% 100%;
  animation: woodfish-accent-tab-drift 6s ease-in-out infinite alternate;
  pointer-events: none;
}
:root[data-woodfish-paused] ${ctx.selectors.activeTab}::after {
  animation-play-state: paused;
}
:root[data-reduced-motion="true"] ${ctx.selectors.activeTab}::after {
  animation: none;
  background-size: 100% 100%;
}
@media (prefers-reduced-motion: reduce) {
  ${ctx.selectors.activeTab}::after { animation: none; background-size: 100% 100%; }
}`);
    }
    ctx.style(parts.join('\n\n'), true);
  }

  restyle();
  return { update: restyle };
};
