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
.promo-end { position: absolute; left: 0; right: 0; top: 360px; text-align: center; }
.promo-end .promo-card { position: relative; display: inline-block; padding: 26px 56px 30px; }
.promo-end .star { font-size: 72px; font-weight: 700; letter-spacing: 2px; }
.promo-end .welcome { margin-top: 10px; font-size: 38px; font-weight: 600; color: #e9ecf4; display: flex; align-items: center; justify-content: center; gap: 14px; }
.promo-end .welcome svg { flex: none; }
.promo-end .note { margin-top: 14px; font-size: 26px; color: #c9d0de; }
/* The effect's name, centered at the start of its shot; frameState drives the motion. */
.promo-title { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.promo-title .promo-card { position: relative; padding: 34px 72px 38px; border-radius: 32px; text-align: center; }
.promo-title .main { font-size: 108px; line-height: 1.15; font-weight: 800; letter-spacing: 4px; background: linear-gradient(90deg, #ffd25e, #ff8fb1, #b89cff, #7ad7ff, #8ff0c0, #ffd25e); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.promo-title .sub { margin-top: 14px; font-size: 36px; color: #e6eaf2; }
.promo-title .sub:empty { display: none; }
.promo-fade { position: absolute; inset: 0; background: #000; }
`;
  document.head.append(style);

  const root = document.createElement('div');
  root.className = 'promo-overlay';
  root.innerHTML = `<div class="promo-card promo-caption"><div class="main"></div><div class="sub"></div></div>
<div class="promo-card promo-badge"><b>✦</b><span></span></div>
<div class="promo-title"><div class="promo-card"><div class="main"></div><div class="sub"></div></div></div>
<div class="promo-end"><div class="promo-card"><div class="star">觉得好看？求求star！⭐</div><div class="welcome"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b89cff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.4"/><circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M6 7.4v9.2M18 16.6V10a3 3 0 0 0-3-3h-4"/><path d="m13 4.6-2.4 2.4 2.4 2.4"/></svg>欢迎共建~会看PR！</div><div class="note"></div></div></div>
<div class="promo-fade"></div>`;
  document.body.append(root);
  const caption = root.querySelector('.promo-caption');
  const badge = root.querySelector('.promo-badge');
  const end = root.querySelector('.promo-end');
  const fade = root.querySelector('.promo-fade');
  const title = root.querySelector('.promo-title');

  /** The centered title: `heading` holds its text and this frame's opacity, scale, blur, sweep. */
  function showTitle(heading) {
    title.style.opacity = String(heading?.opacity ?? 0);
    if (!heading) {
      return;
    }
    title.querySelector('.main').textContent = heading.main;
    title.querySelector('.sub').textContent = heading.sub ?? '';
    title.style.transform = `scale(${heading.scale})`;
    title.style.filter = heading.blur > 0.05 ? `blur(${heading.blur}px)` : 'none';
    title.querySelector('.main').style.backgroundPosition = `${100 - heading.sweep * 100}% 0`;
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
