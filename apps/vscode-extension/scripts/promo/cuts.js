'use strict';
/*
 * The three cuts of the 8.0 promo, all on the same BGM ("no more fires", see docs/promo.md)
 * and beat grid (storyboard.js):
 *
 * - `full`: the original Codex + VS Code film (storyboard.js), bars 1–25.
 * - `codex`: everything Woodfish does for the Codex desktop app, from enabling it to every
 *   effect, bars 1–18 (the quiet intro, then the drop at 4 s).
 * - `vscode`: only what is new in VS Code with 8.0, bars 25–39.5 (the last quiet bar of the
 *   breakdown, the drop at 4 s, the end card in the quiet outro).
 *
 * A cut's first scene starts before its `start`, so the pre-roll before the first frame
 * already belongs to it.
 */

const path = require('path');
const { pathToFileURL } = require('url');
const { REPO_ROOT } = require('../lib/scene-kit');
const full = require('./storyboard');

const {
  BEAT,
  BAR,
  bar,
  CODE,
  POPULAR,
  RAIN,
  WEEKLY,
  REACT,
  PARTICLES,
  GOLD_USER_CSS,
  THREADS,
  THREADS_LATER,
  CI_THREAD,
  T,
  blocksLength,
  codex,
  conversation,
  glide,
  revealed,
} = full;

/** The current Codex settings page (Codex 26.1013, 2026-11-14), shown as a real screenshot. */
const SETTINGS_SCREENSHOT = pathToFileURL(
  path.join(REPO_ROOT, 'docs', 'hosts', 'codex-screenshots', 'effects-settings-page.jpg')
).href;

const REPO_LINE = [[T('https://github.com/woodfishhhh/Woodfish-Theme', 'string')]];
const ENABLE_CODEX = [[T('>', 'operator'), T(' ', 'fg'), T('Woodfish Theme:', 'function'), T(' ', 'fg'), T('为 Codex 启用 Woodfish', 'string')]];
const INSTALL_VSCODE = [[T('ext install', 'keyword'), T(' ', 'fg'), T('zhongjun.woodfish-theme', 'string')]];

/** user.css as the owner would type it; saved after the third line. */
const USER_CSS = [
  [T('/* user.css：一行一个变量，保存即生效 */', 'comment')],
  [T(':root', 'tag'), T(' {', 'punctuation')],
  [T('  --woodfish-caret-trail-color', 'property'), T(': ', 'punctuation'), T('#ff4d4f', 'number'), T(';', 'punctuation')],
  [T('}', 'punctuation')],
  [T('/* 拖尾已经是红色了 */', 'comment')],
];
/** Characters up to the end of the closing brace, when the file is saved. */
const USER_CSS_SAVED_AT = USER_CSS.slice(0, 4).reduce((sum, line) => sum + line.reduce((s, [text]) => s + text.length, 0) + 1, 0);
const RED_TRAIL_CSS = ':root {\n  --woodfish-caret-trail-color: #ff4d4f;\n}\n';

/** The opening lines of the effects folder's AGENTS.md (packages/effects/builtin/AGENTS.md). */
const AGENTS_MD = [
  [T('# ', 'punctuation'), T('怎么改 Woodfish 效果（写给 Codex、Claude 等 AI）', 'keyword')],
  [],
  [T('**改法的先后**：', 'type')],
  [],
  [T('1. ', 'operator'), T('先用 user.css：颜色、粗细、长度、速度这类样子，写一行 CSS 变量', 'fg')],
  [T('2. ', 'operator'), T('其次改参数：某个效果的 params.json', 'fg')],
  [T('3. ', 'operator'), T('最后才改代码：换画法、新效果时改 effect.js', 'fg')],
];

/** The effects folder both editors read. */
const EFFECTS_FOLDER = [
  [T('%APPDATA%\\Woodfish\\effects', 'string')],
  [T('├─ ', 'comment'), T('caret-trail', 'function'), T('       effect.json  effect.js  README.md', 'fg')],
  [T('├─ ', 'comment'), T('typing-particles', 'function'), T('  effect.json  effect.js  README.md', 'fg')],
  [T('├─ ', 'comment'), T('mouse-trail', 'function'), T('       effect.json  effect.js  README.md', 'fg')],
  [T('├─ ', 'comment'), T('…', 'fg'), T('                 共 12 个效果，Codex 也读这里', 'comment')],
  [T('├─ ', 'comment'), T('user.css', 'type')],
  [T('└─ ', 'comment'), T('AGENTS.md', 'type')],
];

/** A reply streaming in between `start` and `end` (BGM seconds). */
function rain(start, end) {
  const rate = blocksLength(RAIN.blocks) / (end - start);
  return (audioTime) => {
    const streaming = audioTime < end;
    return {
      threads: { items: THREADS, active: 0, running: streaming ? 0 : CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN, revealed(audioTime - start, rate), !streaming),
    };
  };
}

/** The end card on 《彩云》: the star line, how to get it, the repository typed below. */
function endCard(note) {
  return (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: REPO_LINE, typed: revealed(t - 0.2, 30), cursor: true, large: true, centered: true }],
    end: note,
  });
}

/** “Ask Codex to make the particles gold”, 10 beats; the reply is a real user.css change. */
function askCodex(t) {
  const sentAt = 4 * BEAT;
  const replyStart = sentAt + 0.6;
  const replyEnd = 10 * BEAT - 0.3;
  const sent = t >= sentAt;
  const streaming = sent && t < replyEnd;
  const rate = blocksLength(PARTICLES.blocks) / (replyEnd - replyStart);
  return codex({
    threads: { items: THREADS_LATER, active: 0, running: streaming ? 0 : null },
    title: PARTICLES.title,
    messages: sent ? conversation(PARTICLES, revealed(t - replyStart, rate), !streaming) : [],
    composer: sent ? { focus: false, text: '' } : { focus: true, text: PARTICLES.user.slice(0, revealed(t - 0.3, 9)) },
    camera: sent
      ? { zoom: glide(t, 4, 5, 1.6, 1.4), focus: 'stream', fallback: ['reply', 'column'], alignX: 'column', lag: 0.4 }
      : { zoom: glide(t, 0, 1.5, 1, 1.6), focus: 'composer' },
    badge: true,
    heading: { main: '一句话让 Codex 改效果', sub: '它照效果文件夹里的 AGENTS.md 改', delay: 0 },
    caption: { main: '对 Codex 说一句：把打字粒子改成金色', sub: '效果文件夹里有写给 AI 的 AGENTS.md，它照着改 user.css', at: t - 0.3, position: 'top' },
  });
}

function codexCut() {
  const scenes = [];
  const add = (start, end, host, build) => scenes.push({ start, end, host, build });
  const START = bar(1);
  const stream = rain(2.5, bar(5) - BEAT);

  // Hook: a reply streams in rainbow text with its cursor, trail and sparks.
  add(0, bar(2), 'codex', (t) =>
    codex({
      ...stream(t),
      camera: { zoom: glide(t, START / BEAT, bar(2) / BEAT, 1, 1.06), focus: 'window' },
      heading: { main: 'Woodfish 8.0', sub: 'Codex 桌面版', delay: START + 0.3 },
      caption: t > START + 0.5 ? { main: 'Woodfish 8.0 · Codex 桌面版', sub: '给 Codex 换上彩虹回复字、吐字光标和七色光环', at: t - START - 0.5 } : null,
    })
  );

  // How to get it: one command in the VS Code extension, or woodfish.exe.
  add(bar(2), bar(3), 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: ENABLE_CODEX, typed: revealed(t - 0.3, 18), cursor: true, large: true, centered: true }],
    caption: {
      heading: { main: '一键启用', sub: 'VS Code 扩展里一条命令，或下载 woodfish.exe', delay: 0 },
      main: '装上 Woodfish Theme，一条命令为 Codex 启用',
      sub: '或从 GitHub Release 下载 woodfish.exe 双击；不改你原来的 Codex 快捷方式，Codex 重启后效果自己回来',
      at: t - 0.3,
    },
  }));

  // The drop already happened; in on the line being written.
  add(bar(3), bar(5), 'codex', (t) =>
    codex({
      ...stream(bar(3) + t),
      camera: { zoom: glide(t, 0, 1.5, 1.06, 1.85), focus: 'stream', fallback: 'reply', alignX: 'column', lag: 0.3 },
      badge: true,
      heading: { main: '彩虹回复字', sub: 'AI 吐字时彩虹光标领着字走', delay: 0 },
      caption: { main: '彩虹回复字 + 吐字光标', sub: 'AI 吐字时彩虹光标领着字走，身后拖一段尾巴，新字轻轻淡入', at: t - 0.3 },
    })
  );

  // The selected thread's ring; the selection hops every beat.
  const ringOrder = [0, 2, 1, 0];
  const chats = [RAIN, WEEKLY, REACT];
  add(bar(5), bar(6), 'codex', (t) => {
    const active = ringOrder[Math.min(ringOrder.length - 1, Math.floor(t / BEAT))];
    return codex({
      threads: { items: THREADS, active, running: CI_THREAD },
      title: chats[active].title,
      messages: conversation(chats[active]),
      camera: { zoom: glide(t, 0.25, 1.25, 1, 2.5), focus: 'thread', lag: 0.3 },
      badge: true,
      heading: { main: '七色光环', sub: '选中的会话外圈慢慢转', delay: 0 },
      caption: { main: '选中的会话：七色光环', sub: '光谱环慢慢转，外面一圈柔光；运行中的会话亮一圈弱光', at: t - 0.3 },
    });
  });

  // Frosted glass: the thread scrolls slowly behind the menu, so the rainbow text visibly
  // flows under the glass.
  add(bar(6), bar(7), 'codex', (t) => {
    const open = t >= 0.5 * BEAT;
    return codex({
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      // The colorful code reply slides up under the glass; sharp text stays in view above it.
      messages: [...conversation(RAIN), ...conversation(REACT)],
      scrollBack: glide(t, 0, 4, 520, 0),
      composer: { focus: true, text: open ? '/' : '' },
      slash: open ? Math.min(3, Math.floor((t - 0.5 * BEAT) / (0.75 * BEAT))) : null,
      camera: { zoom: glide(t, 0.25, 1.5, 1.25, 1.45), focus: open ? 'menu' : 'composer', dy: open ? -30 : 0, lag: 0.3 },
      badge: true,
      heading: { main: '毛玻璃浮层', sub: '菜单后面的字透出来', delay: 0 },
      caption: { main: '毛玻璃浮层', sub: '菜单弹出来，后面的彩虹字透出来', at: t - 0.3 },
    });
  });

  // The window background: off, 《彩云》, then another picture (the built-in 彩云渐变).
  add(bar(7), bar(8), 'codex', (t) => {
    const beat = Math.floor(t / BEAT);
    const captions = [
      { main: '关掉背景', sub: '' },
      { main: '窗口背景《彩云》', sub: '默认背景；侧栏和输入框是磨砂玻璃，文字照样清楚' },
      { main: '窗口背景《彩云》', sub: '默认背景；侧栏和输入框是磨砂玻璃，文字照样清楚' },
      { main: '换成你自己的图', sub: '设置 → 外观里「上传图片」或直接拖进窗口；这里换成了自带的「彩云渐变」' },
    ];
    const shown = captions[Math.min(3, beat)];
    return codex({
      background: beat >= 1,
      backgroundImage: beat >= 3 ? 'gradient' : 'caiyun',
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      // The thread drifts over the still picture, so it reads as a background.
      messages: [...conversation(WEEKLY), ...conversation(RAIN)],
      scrollBack: glide(t, 0, 4, 300, 0),
      camera: { zoom: 1, focus: 'window' },
      badge: true,
      heading: { main: '彩云背景', sub: '也能换成你自己的图', delay: 0 },
      caption: { ...shown, at: beat === 0 ? t : beat === 3 ? t - 3 * BEAT : t - BEAT },
    });
  });

  // The composer: caret, trail on Home / End, particles.
  const draft = '帮我把第二段改得更口语一点，保留原来的意思。';
  const more = '再补一句结尾。';
  add(bar(8), bar(10), 'codex', (t) => {
    let text = draft.slice(0, revealed(t - 0.3, 7.5));
    let caret = null;
    if (t >= 4 * BEAT && t < 5 * BEAT) {
      caret = 0;
    }
    if (t >= 5.5 * BEAT) {
      text = draft + more.slice(0, revealed(t - 5.5 * BEAT, 6));
    }
    return codex({
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN),
      composer: { focus: true, text, caret },
      camera: { zoom: glide(t, 0, 1.25, 1.25, 1.85), focus: 'composer', dy: -20 },
      badge: true,
      heading: { main: '打字粒子 · 光标拖尾', sub: '输入框里是 VS Code 同款彩虹光标', delay: 0 },
      caption: { main: '输入框：彩虹光标、拖尾、打字粒子', sub: '和 VS Code 里一样的 6px 光标；光标一跳就拖出一段尾巴', at: t - 0.3, position: 'top' },
    });
  });

  // Fifteen themes; four of them, one per beat.
  const themes = [['tokyonight', 'Tokyo Night'], ['catppuccin-latte', 'Catppuccin Latte'], ['dracula', 'Woodfish Dracula'], ['gruvbox-dark', 'Gruvbox Dark']];
  add(bar(10), bar(11), 'codex', (t) => {
    const index = Math.min(themes.length - 1, Math.floor(t / BEAT));
    return codex({
      palette: themes[index][0],
      threads: { items: THREADS, active: 2, running: CI_THREAD },
      title: REACT.title,
      messages: conversation(REACT),
      heading: { main: '15 套主题', sub: '整个界面跟着换色', delay: 0 },
      caption: { main: 'Codex 能用全部 15 套主题', sub: `整个界面跟着换色 · ${themes[index][1]}`, at: index === 0 ? t : 1 },
    });
  });

  // The settings page (a real screenshot): themes first, then the effect switches.
  add(bar(11), bar(12), 'codex', (t) =>
    codex({
      // The window stays underneath; the screenshot covers it.
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN),
      // The Woodfish section down to the effect list's header, about the screenshot's own size.
      picture: { src: SETTINGS_SCREENSHOT, viewBox: 'inset(80px 330px 250px 600px)' },
      camera: { zoom: glide(t, 0, 4, 1, 1.1), focus: 'window' },
      badge: true,
      heading: { main: 'Woodfish 外观', sub: '设置 → 外观，开关和参数都在这里', delay: 0 },
      caption: { main: '设置 → 外观 → Woodfish 外观', sub: '15 套主题点一下就换，每个效果有开关和全部参数（真机截图）', at: t - 0.3 },
    })
  );

  add(bar(12), bar(12) + 10 * BEAT, 'codex', askCodex);

  // Saved: gold sparks, no restart.
  const tryText = '好看！金色的粒子，大了一号。再打几个字看看，就要这个颜色。';
  add(bar(12) + 10 * BEAT, bar(16), 'codex', (t) =>
    codex({
      userCss: GOLD_USER_CSS,
      threads: { items: THREADS_LATER, active: 0, running: null },
      title: PARTICLES.title,
      messages: conversation(PARTICLES),
      composer: { focus: true, text: tryText.slice(0, revealed(t - 0.35, 5.5)) },
      camera: { zoom: 2, focus: 'caret', fallback: 'composer', dy: -60, lag: 0.45 },
      badge: true,
      heading: { main: '保存即生效', sub: '金色粒子，不用重启 Codex', delay: 0 },
      caption: { main: '保存即生效', sub: 'user.css 写一行变量，一两秒后自动刷新，不用重启 Codex', at: t - 0.3, position: 'top' },
    })
  );

  add(bar(16), bar(18) + 1, 'vscode', endCard('Codex：在 VS Code 扩展里「为 Codex 启用 Woodfish」一键启用，或从 GitHub Release 下载 woodfish.exe'));

  return scenes;
}

function vscodeCut() {
  const scenes = [];
  const add = (start, end, host, build) => scenes.push({ start, end, host, build });
  const START = bar(25);

  // Hook (the last quiet bar): typing on 《彩云》 with the caret trail and sparks.
  add(bar(24), bar(26), 'vscode', (t) => {
    const u = t - BAR;
    return {
      palette: 'dark',
      css: 'base',
      panes: [{ code: CODE.greet, typed: revealed(u - 0.3, 14), cursor: true, large: true }],
      camera: { zoom: glide(u, 0, 4, 1, 1.25), focus: 'cursor', fallback: 'code', x: 430, lag: 0.45 },
      heading: { main: 'Woodfish Theme 8.0', sub: 'VS Code 新功能', delay: BAR + 0.3 },
      caption: u > 0.5 ? { main: 'Woodfish Theme 8.0', sub: 'VS Code 新版本：10 套热门主题、窗口背景、光标拖尾、打字粒子、效果插件', at: u - 0.5 } : null,
    };
  });

  // Ten new themes, one per beat; the background stays, only the colors change.
  add(bar(26), bar(26) + 10 * BEAT, 'vscode', (t) => {
    const index = Math.min(POPULAR.length - 1, Math.floor(t / BEAT));
    const [slug, label] = POPULAR[index];
    return {
      palette: slug,
      css: 'base',
      panes: [{ code: CODE.typescript, cursor: true }],
      camera: { zoom: glide(t, 0, 2, 1, 1.2), focus: 'code' },
      heading: { main: '10 套热门主题', sub: '原样收录上游配色，渐变自动生成', delay: 0 },
      caption: { main: label, sub: '新增 10 套热门主题，原样收录上游配色，渐变按各自配色自动生成', at: index === 0 ? t : 1 },
    };
  });

  // The window background: off for two beats, then 《彩云》.
  add(bar(26) + 10 * BEAT, bar(29) + 2 * BEAT, 'vscode', (t) => {
    const on = t >= 2 * BEAT;
    return {
      palette: 'dark',
      css: on ? 'base' : 'plain',
      panes: [{ code: CODE.typescript, cursor: true }],
      camera: { zoom: 1, focus: 'window' },
      badge: true,
      heading: { main: '彩云背景', sub: '窗口背景，换成你的图也行', delay: 0 },
      caption: on
        ? { main: '窗口背景《彩云》', sub: '运行「设置背景图片」换成你的图；编辑器透出背景，侧栏和面板是毛玻璃', at: t - 2 * BEAT }
        : { main: '没有背景', sub: '', at: t },
    };
  });

  // The caret trail and typing sparks, followed by the camera.
  add(bar(29) + 2 * BEAT, bar(31) + 2 * BEAT, 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: CODE.greet, typed: revealed(t - 0.3, 15), cursor: true, large: true }],
    camera: { zoom: glide(t, 0, 1.5, 1, 1.7), focus: 'cursor', fallback: 'code', x: 350, lag: 0.45 },
    badge: true,
    heading: { main: '光标拖尾 · 打字粒子', sub: '照 VS Code Animations 插件画的带子', delay: 0 },
    caption: { main: '光标拖尾和打字粒子', sub: '照 VS Code Animations 插件画的单色带子；打字迸出主题色光点。设置里打开', at: t - 0.3 },
  }));

  // The mouse trail: the pointer wanders over the code.
  add(bar(31) + 2 * BEAT, bar(32) + 2 * BEAT, 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: CODE.typescript }],
    pointer: { x: 480 + 300 * Math.sin(t * 1.9), y: 200 + 90 * Math.sin(t * 3.1 + 0.6) },
    camera: { zoom: 1, focus: 'window' },
    badge: true,
    heading: { main: '鼠标拖尾', sub: '默认关闭，设置里打开', delay: 0 },
    caption: { main: '鼠标拖尾', sub: '指针身后一条单色带子，默认关闭：woodfishTheme.mouseTrail.enabled', at: t - 0.3 },
  }));

  // user.css: typed, saved, and the next keystrokes trail in red.
  add(bar(32) + 2 * BEAT, bar(34) + 2 * BEAT, 'vscode', (t) => {
    const typed = revealed(t - 0.3, 16);
    const saved = typed >= USER_CSS_SAVED_AT && t >= 4.6 * BEAT;
    const shown = saved ? typed : Math.min(typed, USER_CSS_SAVED_AT);
    return {
      palette: 'dark',
      css: 'base',
      userCss: saved ? RED_TRAIL_CSS : '',
      panes: [{ code: USER_CSS, typed: saved ? USER_CSS_SAVED_AT + revealed(t - 4.8 * BEAT, 8) : shown, cursor: true, large: true }],
      camera: { zoom: glide(t, 0, 1.5, 1, 1.45), focus: 'cursor', fallback: 'code', x: 400, lag: 0.45 },
      badge: true,
      heading: { main: 'user.css 一行改样子', sub: '保存即生效，不用重新加载窗口', delay: 0 },
      caption: saved
        ? { main: '保存即生效', sub: '不用重新加载窗口；升级也不会覆盖你的 user.css', at: t - 4.6 * BEAT }
        : { main: '效果插件 + user.css', sub: '每个效果参数都是一个 CSS 变量，写进效果文件夹的 user.css', at: t - 0.3 },
    };
  });

  // AGENTS.md: the folder tells an AI how to change it.
  add(bar(34) + 2 * BEAT, bar(35) + 2 * BEAT, 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: AGENTS_MD, compact: true }],
    camera: { zoom: 1.15, focus: 'code' },
    badge: true,
    heading: { main: '让 AI 改效果', sub: '效果文件夹里有写给 AI 的 AGENTS.md', delay: 0 },
    caption: { main: '让 AI 改效果', sub: '效果文件夹里有写给 AI 的 AGENTS.md：对 Codex、Claude 说“把拖尾改成红色”就行', at: t - 0.3 },
  }));

  // One folder for both editors.
  add(bar(35) + 2 * BEAT, bar(36) + 2 * BEAT, 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: EFFECTS_FOLDER, compact: true }],
    camera: { zoom: 1.15, focus: 'code' },
    badge: true,
    heading: { main: '和 Codex 共用', sub: '同一个效果文件夹，改一次两边都变', delay: 0 },
    caption: { main: '和 Codex 共用一个效果文件夹', sub: 'VS Code 和 Codex 桌面版读同一份效果，改一次两边都变', at: t - 0.3 },
  }));

  // How to get it, then the end card in the quiet outro.
  add(bar(36) + 2 * BEAT, bar(37) + 2 * BEAT, 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: INSTALL_VSCODE, typed: revealed(t - 0.3, 18), cursor: true, large: true, centered: true }],
    heading: { main: '安装', sub: '扩展商店 / Open VSX 搜 Woodfish Theme', delay: 0 },
    caption: { main: 'Woodfish Theme 8.0', sub: 'VS Code 扩展商店 / Open VSX 搜 Woodfish Theme', at: t - 0.3 },
  }));

  add(bar(37) + 2 * BEAT, bar(39.5) + 1, 'vscode', endCard('VS Code 扩展商店 / Open VSX 搜 Woodfish Theme · ext install zhongjun.woodfish-theme'));

  return scenes;
}

const CUTS = {
  full: { scenes: full.storyboard, start: full.START, end: full.END, badge: '你可以让 Codex 随时调整此效果', out: 'woodfish-8.0-promo.mp4' },
  codex: { scenes: codexCut, start: bar(1), end: bar(18), badge: '你可以让 Codex 随时调整此效果', out: 'woodfish-8.0-codex.mp4' },
  vscode: { scenes: vscodeCut, start: bar(25), end: bar(39.5), badge: '你可以让 AI 随时调整此效果', out: 'woodfish-8.0-vscode.mp4' },
};

/** user.css contents a VS Code shot can switch to (the page carries one effects module each). */
const USER_CSS_VARIANTS = [RED_TRAIL_CSS];

module.exports = { CUTS, USER_CSS_VARIANTS };
