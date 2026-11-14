/*
 * Runs in both promo pages, after the stage. The video's own layer: caption card, the
 * corner badge, the end card and the fade. It is laid out in output pixels (1920×1080) and
 * placed over the camera's clip each frame, scaled down by the same factor the capture
 * scales up, so it stays fixed and sharp on screen however far the camera pushes in.
 */
(() => {
  'use strict';

  const FONT = "'Microsoft YaHei UI', 'Segoe UI', sans-serif";
  const style = document.createElement('style');
  style.textContent = `
.promo-overlay { position: fixed; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; z-index: 2147483600; pointer-events: none; font-family: ${FONT}; color: #f4f6fb; }
.promo-card { position: absolute; padding: 18px 28px 20px; border-radius: 18px; background: rgb(12 14 24 / 74%); border: 1px solid rgb(255 255 255 / 10%); box-shadow: 0 18px 50px -18px rgb(0 0 0 / 70%); -webkit-backdrop-filter: blur(16px) saturate(140%); backdrop-filter: blur(16px) saturate(140%); }
.promo-caption { left: 56px; bottom: 48px; }
.promo-caption.top { bottom: auto; top: 56px; }
.promo-caption .main { font-size: 36px; font-weight: 600; letter-spacing: 1px; }
.promo-caption .sub { margin-top: 8px; font-size: 22px; color: #d6dbe6; }
.promo-caption .sub:empty { display: none; }
.promo-badge { right: 48px; top: 48px; padding: 11px 22px; border-radius: 999px; font-size: 21px; color: #e9ecf4; background: rgb(12 14 24 / 58%); }
.promo-badge b { margin-right: 8px; font-weight: 400; background: linear-gradient(135deg, #ffd25e, #ff6fb5 55%, #7aa2ff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
/* The repository line is drawn by the editor below the card, at y ≈ 690. */
.promo-end { position: absolute; left: 0; right: 0; top: 318px; text-align: center; }
.promo-end .promo-card { position: relative; display: inline-block; padding: 26px 56px 30px; }
.promo-end .star { font-size: 72px; font-weight: 700; letter-spacing: 2px; }
.promo-end .welcome { margin-top: 10px; font-size: 38px; font-weight: 600; color: #e9ecf4; display: flex; align-items: center; justify-content: center; gap: 14px; }
.promo-end .welcome svg { flex: none; }
.promo-end .obit { margin-top: 12px; font-size: 26px; color: #e1e5ee; }
.promo-end .obit b { font-weight: 600; color: #f3d17a; }
.promo-end .note { margin-top: 10px; font-size: 24px; color: #b9c1d1; }
/* The effect's name (docs/playground/promo-titles.html #14): eyebrow, title and one line
   placed in an empty part of the picture, a thin line from the words to the effect. */
.promo-callout { position: absolute; left: 0; top: 0; }
.promo-callout .eyebrow { font-size: 24px; font-weight: 600; letter-spacing: .22em; color: #f3d17a; margin-bottom: 6px; white-space: nowrap; }
.promo-callout .main { font-size: 72px; font-weight: 800; line-height: 1.15; letter-spacing: 1px; white-space: nowrap; }
.promo-callout .sub { margin-top: 12px; font-size: 30px; line-height: 1.45; color: #d8deea; white-space: pre; }
.promo-callout .sub:empty { display: none; }
.promo-callout .eyebrow, .promo-callout .main, .promo-callout .sub { text-shadow: 0 2px 14px rgb(0 0 0 / 55%); }
.promo-leader { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; }
.promo-dot { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 5px rgb(255 255 255 / 25%); }
.promo-scrim { position: absolute; inset: 0; }
.promo-fade { position: absolute; inset: 0; background: #000; }
`;
  document.head.append(style);

  const root = document.createElement('div');
  root.className = 'promo-overlay';
  root.innerHTML = `<div class="promo-scrim"></div><div class="promo-card promo-caption"><div class="main"></div><div class="sub"></div></div>
<div class="promo-card promo-badge"><b>✦</b><span></span></div>
<svg class="promo-leader"><path fill="none" stroke="rgb(255 255 255 / 85%)" stroke-width="2.5" stroke-linecap="round"/></svg><div class="promo-dot"></div><div class="promo-callout"><div class="eyebrow"></div><div class="main"></div><div class="sub"></div></div>
<div class="promo-end"><div class="promo-card"><div class="star">觉得好看？求求star！⭐</div><div class="welcome"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b89cff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.4"/><circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M6 7.4v9.2M18 16.6V10a3 3 0 0 0-3-3h-4"/><path d="m13 4.6-2.4 2.4 2.4 2.4"/></svg>欢迎共建~会看PR！</div><div class="obit">要 fork 来提 PR？推荐装上<b>讣告 · AI 的回收站</b>（obituary.woodfish.site）</div><div class="note"></div></div></div>
<div class="promo-fade"></div>`;
  document.body.append(root);
  const caption = root.querySelector('.promo-caption');
  const badge = root.querySelector('.promo-badge');
  const end = root.querySelector('.promo-end');
  const fade = root.querySelector('.promo-fade');
  const callout = root.querySelector('.promo-callout');
  const leader = root.querySelector('.promo-leader path');
  const dot = root.querySelector('.promo-dot');
  const scrim = root.querySelector('.promo-scrim');
  const SCRIMS = {
    right: 'linear-gradient(to left, rgb(6 8 14 / 94%) 20%, rgb(6 8 14 / 66%) 36%, transparent 60%)',
    left: 'linear-gradient(to right, rgb(6 8 14 / 95%) 26%, rgb(6 8 14 / 70%) 36%, transparent 54%)',
    // Only the margin left of a picture that starts at about a third of the frame.
    gutter: 'linear-gradient(to right, rgb(6 8 14 / 95%) 24%, rgb(6 8 14 / 70%) 30%, transparent 34%)',
    top: 'linear-gradient(to bottom, rgb(6 8 14 / 97%) 20%, rgb(6 8 14 / 60%) 26%, transparent 33%)',
    bottom: 'linear-gradient(to top, rgb(6 8 14 / 85%) 15%, transparent 55%)',
  };

  /**
   * A line from the text box to `target`: it leaves the side (or top/bottom) facing the
   * target, runs straight, then turns 45° into it. `lineY` is where a line leaving from the
   * side starts (the middle of the title). Nearly level or plumb lines are drawn straight.
   */
  function leaderLine(box, target, lineY) {
    const gap = 22;
    const outX = target.x < box.x ? box.x - target.x : Math.max(0, target.x - (box.x + box.w));
    const outY = target.y < box.y ? box.y - target.y : Math.max(0, target.y - (box.y + box.h));
    const start =
      outX >= outY
        ? { x: target.x < box.x ? box.x - gap : box.x + box.w + gap, y: lineY }
        : { x: Math.min(box.x + box.w - 24, Math.max(box.x + 24, target.x)), y: target.y < box.y ? box.y - gap : box.y + box.h + gap };
    if (outX >= outY && Math.abs(target.y - start.y) < 48) start.y = target.y;
    if (outX < outY && Math.abs(target.x - start.x) < 48) start.x = target.x;
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const elbow =
      Math.abs(dx) > Math.abs(dy)
        ? { x: target.x - Math.sign(dx) * Math.abs(dy), y: start.y }
        : { x: start.x, y: target.y - Math.sign(dy) * Math.abs(dx) };
    // A stub shorter than the dot looks like a glitch: go straight instead.
    if (Math.hypot(start.x - elbow.x, start.y - elbow.y) < 48) {
      elbow.x = start.x;
      elbow.y = start.y;
    }
    return { start, elbow };
  }

  /** The effect's name; `heading` holds its text, where it sits, the target point and each piece's progress. */
  function showTitle(heading) {
    const visible = Boolean(heading);
    for (const node of [callout, dot, scrim, leader]) {
      node.style.opacity = '0';
    }
    if (!visible) {
      return;
    }
    const pieces = heading.pieces;
    callout.querySelector('.eyebrow').textContent = heading.eyebrow ?? '';
    callout.querySelector('.main').textContent = heading.main;
    callout.querySelector('.sub').textContent = heading.sub ?? '';
    const box = { w: callout.offsetWidth, h: callout.offsetHeight };
    box.x = (heading.at[0] / 100) * 1920;
    box.y = (heading.at[1] / 100) * 1080 - box.h / 2;
    callout.style.transform = `translate(${box.x}px, ${box.y}px)`;
    callout.style.opacity = '1';
    const out = 1 - pieces.out;
    const set = (selector, piece, rise = 0) => {
      const node = callout.querySelector(selector);
      node.style.opacity = String(piece * out);
      node.style.transform = rise ? `translateY(${rise * (1 - piece)}px)` : 'none';
    };
    set('.eyebrow', pieces.eyebrow);
    set('.main', pieces.main, 36);
    set('.sub', pieces.sub);
    scrim.style.background = SCRIMS[heading.scrim] ?? 'none';
    scrim.style.opacity = String(Math.max(pieces.dot, pieces.eyebrow) * out);
    if (!heading.point) {
      return;
    }
    const target = { x: heading.point[0], y: heading.point[1] };
    const main = callout.querySelector('.main');
    const { start, elbow } = leaderLine(box, target, box.y + main.offsetTop + main.offsetHeight / 2);
    const length = Math.hypot(elbow.x - target.x, elbow.y - target.y) + Math.hypot(start.x - elbow.x, start.y - elbow.y);
    leader.setAttribute('d', `M${target.x},${target.y} L${elbow.x},${elbow.y} L${start.x},${start.y}`);
    leader.setAttribute('stroke-dasharray', String(length));
    leader.setAttribute('stroke-dashoffset', String(length * (1 - pieces.line)));
    leader.style.opacity = String(out);
    dot.style.left = `${target.x}px`;
    dot.style.top = `${target.y}px`;
    dot.style.opacity = String(Math.min(1, pieces.dot * 1.5) * out);
    dot.style.transform = `scale(${0.82 + 0.18 * pieces.dot})`;
  }

  /** `clip` is the camera's rectangle in page pixels; `badge` the badge text (or null). */
  async function show({ clip, caption: text, badge: withBadge, end: endNote, fade: dark, title: heading }) {
    showTitle(heading);
    root.style.transform = `translate(${clip.x}px, ${clip.y}px) scale(${clip.width / 1920})`;
    caption.classList.toggle('top', text?.at === 'top');
    caption.querySelector('.main').textContent = text?.main ?? '';
    caption.querySelector('.sub').textContent = text?.sub ?? '';
    caption.style.opacity = String(text?.opacity ?? 0);
    badge.style.opacity = withBadge ? '1' : '0';
    badge.querySelector('span').textContent = withBadge ?? '';
    end.style.opacity = endNote ? '1' : '0';
    end.querySelector('.note').textContent = endNote ?? '';
    fade.style.opacity = String(dark ?? 0);
    await window.__promoClock.painted();
  }

  window.__promoOverlay = { show };
})();
