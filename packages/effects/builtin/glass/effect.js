/*
 * 浮层毛玻璃：菜单、弹窗、下拉和浮层用磨砂玻璃，弹出时淡入，列表项跟着指针微微发亮。
 * 只动浮层，主界面不动（Codex 自己的 Windows 11 Mica 照常）。亚克力滤镜和指针柔光用
 * 宿主提供的 ctx.lib 小工具（同一套代码也在 VS Code 里用）。
 */
module.exports = function glass(ctx) {
  const lib = ctx.lib;
  let reveal = null;
  let acrylic = null;

  function rule(selector, lines) {
    return `${selector} {\n${lines.map((line) => `  ${line}`).join('\n')}\n}`;
  }

  function css() {
    const p = ctx.params;
    const targets = ctx.selectors.floatingLayer;
    const surface = 'var(--color-surface-elevated, var(--app-color-background-elevated-primary))';
    const filter =
      p.mode === 'acrylic'
        ? `url(#${lib.acrylicFilterId}) saturate(${p.saturate}%)`
        : `blur(${p.blur}px) saturate(${p.saturate}%)`;
    const glassLines = [
      `background-color: color-mix(in oklab, ${surface} ${Math.round(p.opacity * 100)}%, transparent) !important;`,
      // A hairline and a soft shadow keep thin glass readable over busy backgrounds.
      'border-color: color-mix(in oklab, var(--app-color-text-foreground, currentColor) 14%, transparent) !important;',
      'box-shadow: 0 0 0 1px color-mix(in oklab, var(--app-color-text-foreground, currentColor) 8%, transparent), 0 16px 40px -16px rgb(0 0 0 / 55%) !important;',
      `-webkit-backdrop-filter: ${filter} !important;`,
      `backdrop-filter: ${filter} !important;`,
    ];
    if (p.noise > 0) glassLines.push(`background-image: ${lib.noiseDataUri(p.noise)} !important;`);
    if (p.borderRadius > 0) glassLines.push(`border-radius: ${p.borderRadius}px !important;`);
    const parts = [
      `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {\n${rule(targets, glassLines)}\n}`,
      `@media (prefers-reduced-transparency: reduce) {\n${rule(targets, ['backdrop-filter: none !important;', '-webkit-backdrop-filter: none !important;', 'background-image: none !important;'])}\n}`,
      // Section headers in the composer menu are opaque strips; let the glass through.
      rule(ctx.selectors.composerMenuHeader, ['background-color: transparent !important;']),
    ];
    if (p.animations) {
      const curve = 'cubic-bezier(0.22, 1, 0.36, 1)';
      const drop =
        '[role="menu"][data-state="open"], [role="listbox"][data-state="open"], [data-slot="popover-content"][data-state="open"]';
      const zoom = '[role="dialog"][data-state="open"]';
      parts.push(
        '@keyframes woodfish-glass-drop { from { opacity: 0; transform: translateY(-6px) scale(0.985); } }',
        '@keyframes woodfish-glass-zoom { from { opacity: 0; transform: scale(0.97); } }',
        rule(drop, [`animation: woodfish-glass-drop 200ms ${curve} backwards;`]),
        rule(zoom, [`animation: woodfish-glass-zoom 250ms ${curve} backwards;`]),
        `:root[data-reduced-motion="true"] :is(${drop}, ${zoom}) { animation: none !important; }`,
        `@media (prefers-reduced-motion: reduce) { :is(${drop}, ${zoom}) { animation: none !important; } }`
      );
    }
    if (p.reveal) {
      const revealed = '[data-woodfish-reveal="true"]';
      parts.push(
        rule(':root', [
          '--woodfish-reveal-color: rgb(255 255 255 / 9%);',
          '--woodfish-reveal-size: 120px;',
        ]),
        rule('[data-theme="light"]', ['--woodfish-reveal-color: rgb(0 0 0 / 6%);']),
        rule(revealed, [
          'background-image: radial-gradient(circle var(--woodfish-reveal-size) at var(--woodfish-reveal-x, 50%) var(--woodfish-reveal-y, 50%), var(--woodfish-reveal-color), transparent 100%) !important;',
        ]),
        `:root[data-reduced-motion="true"] ${revealed} { background-image: none !important; }`,
        `@media (prefers-reduced-motion: reduce) { ${revealed} { background-image: none !important; } }`
      );
    }
    return parts.join('\n\n');
  }

  function apply() {
    const p = ctx.params;
    ctx.style(css());
    if (p.reveal && !reveal) reveal = lib.startReveal({ targets: [ctx.selectors.revealTarget] });
    if (!p.reveal && reveal) {
      reveal();
      reveal = null;
    }
    const acrylicBlur = p.mode === 'acrylic' ? p.blur : null;
    if (acrylic && acrylic.blur !== acrylicBlur) {
      acrylic.dispose();
      acrylic = null;
    }
    if (acrylicBlur !== null && !acrylic) {
      acrylic = { blur: acrylicBlur, dispose: lib.mountAcrylicFilter({ blur: acrylicBlur }) };
    }
  }

  apply();
  return {
    update: apply,
    dispose() {
      if (reveal) reveal();
      if (acrylic) acrylic.dispose();
    },
  };
};
