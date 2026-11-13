/*
 * 打字粒子：插入文字时，从光标处迸出一簇光点，颜色取主题的渐变色。
 * 订阅统一的“插入文字”事件（ctx.onInsert），所以 VS Code 里你打字、Codex 输入框里你打字、
 * Codex 流式吐字都会触发。AI 吐字很快时按每秒上限限流，长回复不会堆满粒子。
 */
module.exports = function typingParticles(ctx) {
  /** Particles drawn per second at most, however fast text arrives. */
  const MAX_PER_SECOND = 240;
  const dots = [];
  let budget = MAX_PER_SECOND;
  let budgetAt = 0;

  function palette() {
    if (ctx.params.colors === 'single') return [ctx.params.color];
    if (ctx.params.colors === 'rainbow') return ctx.rainbow;
    return ctx.theme().stops;
  }

  const painter = ctx.painter((g, now, dt) => {
    const seconds = dt / 1000;
    const drag = Math.pow(0.9, dt / 16.7);
    g.globalCompositeOperation = ctx.theme().mode === 'dark' ? 'lighter' : 'source-over';
    for (let i = dots.length - 1; i >= 0; i -= 1) {
      const dot = dots[i];
      const age = now - dot.born;
      if (age >= dot.life) {
        dots.splice(i, 1);
        continue;
      }
      dot.vy += ctx.params.gravity * seconds;
      dot.vx *= drag;
      dot.x += dot.vx * seconds;
      dot.y += dot.vy * seconds;
      const left = 1 - Math.max(0, age) / dot.life;
      g.globalAlpha = Math.min(1, left * 1.4);
      g.fillStyle = dot.color;
      g.beginPath();
      g.arc(dot.x, dot.y, dot.size * (0.55 + 0.45 * left), 0, Math.PI * 2);
      g.fill();
    }
    return dots.length > 0;
  });

  function shake(event) {
    const target = event.block && event.block.closest(ctx.selectors.editorRoot || '*');
    if (!target || typeof target.animate !== 'function') return;
    const x = (Math.random() - 0.5) * 6;
    const y = (Math.random() - 0.5) * 4;
    target.animate(
      [
        { transform: 'translate(0, 0)' },
        { transform: `translate(${x}px, ${y}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 120, easing: 'ease-out' }
    );
  }

  ctx.onInsert((event) => {
    const wanted = ctx.params.sources;
    if ((wanted !== 'all' && wanted !== event.source) || !event.text || ctx.simplified()) return;
    const now = performance.now();
    budget = Math.min(MAX_PER_SECOND, budget + ((now - budgetAt) / 1000) * MAX_PER_SECOND);
    budgetAt = now;
    const count = Math.min(Math.round(ctx.params.count), Math.floor(budget));
    if (count <= 0) return;
    budget -= count;
    const colors = palette();
    const spread = (ctx.params.spread * Math.PI) / 180;
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const speed = ctx.params.speed * (0.4 + Math.random() * 0.6);
      dots.push({
        x: event.x,
        y: event.y + event.height * 0.6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: ctx.params.size * (0.6 + Math.random() * 0.4),
        life: ctx.params.life * (0.6 + Math.random() * 0.4),
        born: now,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    if (ctx.params.shake && event.source === 'user') shake(event);
    painter.wake();
  });

  return {
    update() {
      painter.wake();
    },
  };
};
