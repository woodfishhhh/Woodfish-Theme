/*
 * 回复正文彩虹：助手回复的正文用渐变色。纯 CSS（background-clip: text），
 * 流式输出时新字一出来就带颜色，长对话也不需要脚本逐段处理。
 * 宿主在 ctx.theme().reply 里给出当前主题特调的正文渐变（Woodfish 主题有手调的一套）。
 */
module.exports = function rainbowText(ctx) {
  function gradient() {
    const theme = ctx.theme();
    const p = ctx.params;
    if (p.colors === 'theme' && typeof theme.reply === 'string') return theme.reply;
    const stops = p.colors === 'rainbow' ? ctx.rainbow : theme.stops;
    const soft = stops.map(
      (color) => `color-mix(in oklab, ${color} ${p.strength}%, ${theme.foreground})`
    );
    return `linear-gradient(${p.angle}deg, ${soft.join(', ')})`;
  }

  function restyle() {
    ctx.style(`
${ctx.selectors.bodyText} {
  background-image: var(--woodfish-rainbow-text-gradient, ${gradient()}) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}
${ctx.selectors.assistantMarkdown} :is(a, code, pre, .katex, [data-code-block]) {
  -webkit-text-fill-color: currentColor !important;
}`);
  }

  ctx.onTheme(restyle);
  restyle();
  return { update: restyle };
};
