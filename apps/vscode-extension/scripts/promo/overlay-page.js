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
.promo-end { position: absolute; left: 0; right: 0; top: 230px; text-align: center; }
.promo-end .star { font-size: 72px; font-weight: 700; letter-spacing: 2px; }
/* The repository line sits between the two, drawn by the editor below at y ≈ 444. */
.promo-end .note { position: absolute; left: 0; right: 0; top: 330px; font-size: 26px; color: #c9d0de; }
.promo-fade { position: absolute; inset: 0; background: #000; }
`;
  document.head.append(style);

  const root = document.createElement('div');
  root.className = 'promo-overlay';
  root.innerHTML = `<div class="promo-card promo-caption"><div class="main"></div><div class="sub"></div></div>
<div class="promo-card promo-badge"><b>✦</b>你可以让 Codex 随时调整此效果</div>
<div class="promo-end"><div class="star">觉得好看，就点个 Star ⭐</div><div class="note"></div></div>
<div class="promo-fade"></div>`;
  document.body.append(root);
  const caption = root.querySelector('.promo-caption');
  const badge = root.querySelector('.promo-badge');
  const end = root.querySelector('.promo-end');
  const fade = root.querySelector('.promo-fade');

  /** `clip` is the camera's rectangle in page pixels; the rest is what the shot shows. */
  async function show({ clip, caption: text, badge: withBadge, end: endNote, fade: dark }) {
    root.style.transform = `translate(${clip.x}px, ${clip.y}px) scale(${clip.width / 1920})`;
    caption.classList.toggle('top', text?.at === 'top');
    caption.querySelector('.main').textContent = text?.main ?? '';
    caption.querySelector('.sub').textContent = text?.sub ?? '';
    caption.style.opacity = String(text?.opacity ?? 0);
    badge.style.opacity = withBadge ? '1' : '0';
    end.style.opacity = endNote ? '1' : '0';
    end.querySelector('.note').textContent = endNote ?? '';
    fade.style.opacity = String(dark ?? 0);
    await window.__promoClock.painted();
  }

  window.__promoOverlay = { show };
})();
