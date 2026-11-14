'use strict';
/*
 * The three cuts of the promo (titles show the version in the stores when it goes out: 8.1), all on the same BGM ("no more fires", see docs/promo.md)
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

/*
 * Titles (render-promo-video.js `titleFrame`): eyebrow, title and sub at `at` (left edge and
 * vertical middle, % of the output frame), a line to `target` (a side of a stage anchor) when
 * the shot has one place to point at. A title takes 0.9 s to come in and holds 2.4 s; where it
 * points at a caret, typing and streaming stop for that long (`hold`), so the trail has
 * settled and the rainbow caret shows while it is on screen. The trail moves before the title
 * and after it.
 */
const TITLE_STILL = 0.9 + 2.4;

/** Shot time with the clock stopped while the title at `from` is in (plus `lead` before it). */
function hold(t, from, lead = 0.3) {
  const start = from - lead;
  const length = TITLE_STILL + lead;
  if (t < start) {
    return t;
  }
  return t < start + length ? start : t - length;
}

/** A reply streaming between `start` and `end` (BGM seconds), stopped while `titles` (BGM seconds) are in. */
function rain(start, end, titles = []) {
  const stop = TITLE_STILL + 0.3;
  const rate = blocksLength(RAIN.blocks) / (end - start - titles.length * stop);
  // Each stop sits on the stream's own clock, which the earlier stops have already held back.
  const streamTime = (audioTime) =>
    titles.reduce((time, at, index) => hold(time, at - start - index * stop), audioTime - start);
  return (audioTime) => {
    const streaming = audioTime < end;
    return {
      threads: { items: THREADS, active: 0, running: streaming ? 0 : CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN, revealed(streamTime(audioTime), rate), !streaming),
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

const CODEX = 'CODEX 桌面版';

/**
 * “Ask Codex to make the particles gold”, 10 beats: the title over the empty composer first,
 * then the request is typed and sent, and the reply (a real user.css change) streams in.
 */
function askCodex(t) {
  const typingFrom = 0.3 + TITLE_STILL;
  const sentAt = typingFrom + PARTICLES.user.length / 12 + 0.3;
  const replyStart = sentAt + 0.6;
  const replyEnd = 10 * BEAT - 0.3;
  const sent = t >= sentAt;
  const streaming = sent && t < replyEnd;
  const rate = blocksLength(PARTICLES.blocks) / (replyEnd - replyStart);
  return codex({
    threads: { items: THREADS_LATER, active: 0, running: streaming ? 0 : null },
    title: PARTICLES.title,
    messages: sent ? conversation(PARTICLES, revealed(t - replyStart, rate), !streaming) : [],
    composer: sent ? { focus: false, text: '' } : { focus: true, text: PARTICLES.user.slice(0, revealed(t - typingFrom, 12)) },
    camera: sent
      ? { zoom: glide(t, sentAt / BEAT, sentAt / BEAT + 1, 1.6, 1.4), focus: 'stream', fallback: ['reply', 'column'], alignX: 'column', lag: 0.4 }
      : { zoom: glide(t, 0, 1.5, 1, 1.6), focus: 'composer' },
    badge: true,
    heading: {
      eyebrow: '交给 AI',
      main: '一句话让 Codex 改效果',
      sub: '效果文件夹里有写给 AI 的说明，它会自己改 user.css',
      delay: 0.3,
      at: [52, 48],
      target: { anchor: 'caret', side: 'right', dx: 12 },
    },
  });
}

function codexCut() {
  const scenes = [];
  const add = (start, end, host, build) => scenes.push({ start, end, host, build });
  const START = bar(1);
  const HOOK_TITLE = START + 0.45;
  // The cursor stops mid-line in the last paragraph (character 222 of 235).
  const STREAM_TITLE = bar(3) + 3.44;
  const stream = rain(2.5, bar(5) - BEAT, [HOOK_TITLE, STREAM_TITLE]);

  // Hook: a reply streams in rainbow text with its cursor, trail and sparks.
  add(0, bar(2), 'codex', (t) =>
    codex({
      ...stream(t),
      camera: { zoom: glide(t, START / BEAT, bar(2) / BEAT, 1, 1.06), focus: 'window' },
      heading: { eyebrow: 'WOODFISH 8.1', main: 'Codex 桌面版', sub: '回复、光标、侧栏都换上彩虹', delay: HOOK_TITLE, at: [56, 74] },
    })
  );

  // How to get it: one command in the VS Code extension, or woodfish.exe.
  add(bar(2), bar(3), 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: ENABLE_CODEX, typed: revealed(t - 0.2, 30), cursor: true, large: true, centered: true }],
    heading: {
      eyebrow: '一步启用',
      main: '为 Codex 启用 Woodfish',
      sub: 'VS Code 扩展里运行这条命令，或下载 woodfish.exe\n不改你原来的 Codex 快捷方式，Codex 重启后效果自己回来',
      delay: 0.35,
      at: [8, 26],
    },
  }));

  // The drop already happened; in on the line being written, which stops while the title is in.
  add(bar(3), bar(5), 'codex', (t) =>
    codex({
      ...stream(bar(3) + t),
      camera: { zoom: glide(t, 0, 1.5, 1.06, 1.85), focus: 'stream', fallback: 'reply', alignX: 'column', lag: 0.3 },
      badge: true,
      heading: {
        eyebrow: '回复',
        main: '彩虹回复字',
        sub: 'AI 一边写，彩虹光标一边领着字走',
        delay: STREAM_TITLE - bar(3),
        at: [52, 74],
        target: { anchor: 'stream', side: 'right', dx: 10 },
      },
    })
  );

  // The selected thread's ring, the camera close on the sidebar; the reply column fades out
  // under the title.
  add(bar(5), bar(6), 'codex', (t) =>
    codex({
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN),
      camera: { zoom: glide(t, 0.25, 1.25, 1, 2.5), focus: 'thread', lag: 0.3 },
      badge: true,
      heading: {
        eyebrow: '侧栏',
        main: '七色光环',
        sub: '选中的会话外圈一直在慢慢转',
        delay: 0.35,
        at: [59.5, 49],
        scrim: 'right',
        target: { anchor: 'thread', side: 'right', dx: 6 },
      },
    })
  );

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
      camera: { zoom: glide(t, 0.25, 1.5, 1.25, 1.45), focus: open ? 'menu' : 'composer', dy: open ? -70 : 0, lag: 0.3 },
      badge: true,
      heading: {
        eyebrow: '菜单',
        main: '毛玻璃浮层',
        sub: '菜单后面的字照样透出来',
        delay: 0.6,
        at: [11, 12],
        scrim: 'top',
        target: { anchor: 'menu', side: 'top', dx: -500 },
      },
    });
  });

  // The window background: off, 《彩云》 from half a beat, then another picture (彩云渐变).
  add(bar(7), bar(8), 'codex', (t) =>
    codex({
      background: t >= 0.5 * BEAT,
      backgroundImage: t >= 3 * BEAT ? 'gradient' : 'caiyun',
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      // The thread drifts over the still picture, so it reads as a background.
      messages: [...conversation(WEEKLY), ...conversation(RAIN)],
      scrollBack: glide(t, 0, 4, 300, 0),
      camera: { zoom: 1, focus: 'window' },
      badge: true,
      heading: { eyebrow: '背景', main: '窗口背景', sub: '默认是《彩云》，也能换成你自己的图', delay: 0.45, at: [4, 72], scrim: 'left' },
    })
  );

  // The composer: a few characters, the title while the caret rests, then the rest, Home / End.
  const draft = '帮我把第二段改得更口语一点，保留原来的意思。';
  const more = '再补一句结尾。';
  const COMPOSER_TITLE = 2.6;
  add(bar(8), bar(10), 'codex', (t) => {
    const typing = hold(t, COMPOSER_TITLE);
    let text = draft.slice(0, revealed(typing - 0.3, 7.5));
    let caret = null;
    if (t >= 6.95 && t < 7.5) {
      caret = 0;
    }
    if (t >= 7.6) {
      text = draft + more.slice(0, revealed(t - 7.6, 6));
    }
    return codex({
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN),
      composer: { focus: true, text, caret },
      camera: { zoom: glide(t, 0, 1.25, 1.25, 1.85), focus: 'composer', dy: -20 },
      badge: true,
      heading: {
        eyebrow: '输入框',
        main: '打字粒子 · 光标拖尾',
        sub: 'VS Code 同款彩虹光标，打字就迸出光点',
        delay: COMPOSER_TITLE,
        at: [61, 50],
        target: { anchor: 'caret', side: 'right', dx: 12 },
      },
    });
  });

  // Fifteen themes; four of them, one per beat.
  // The light one last, after the title has held.
  const themes = ['tokyonight', 'dracula', 'gruvbox-dark', 'catppuccin-latte'];
  add(bar(10), bar(11), 'codex', (t) =>
    codex({
      palette: themes[Math.min(themes.length - 1, Math.floor(t / BEAT))],
      threads: { items: THREADS, active: 2, running: CI_THREAD },
      title: REACT.title,
      messages: conversation(REACT),
      heading: { eyebrow: '主题', main: '15 套主题', sub: '整个 Codex 跟着换色', delay: 0.3, at: [4, 72], scrim: 'left' },
    })
  );

  // The settings page (a real screenshot): themes first, then the effect switches.
  add(bar(11), bar(12), 'codex', (t) =>
    codex({
      // The window stays underneath; the screenshot covers it.
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN),
      // The Woodfish section down to the effect list's header, about the screenshot's own size.
      picture: { src: SETTINGS_SCREENSHOT, viewBox: 'inset(80px 330px 250px 600px)', left: '30%' },
      camera: { zoom: glide(t, 0, 4, 1, 1.1), focus: 'window' },
      badge: true,
      heading: { eyebrow: '设置 → 外观', main: 'Woodfish 外观', sub: '换主题、开关效果、调参数', delay: 0.3, at: [4, 50], scrim: 'gutter' },
    })
  );

  add(bar(12), bar(12) + 10 * BEAT, 'codex', askCodex);

  // Saved: gold sparks, no restart; typing stops while the title is in.
  const tryText = '好看！金色的粒子，大了一号。再打几个字看看，就要这个颜色。';
  const GOLD_TITLE = 2.4;
  add(bar(12) + 10 * BEAT, bar(16), 'codex', (t) =>
    codex({
      userCss: GOLD_USER_CSS,
      threads: { items: THREADS_LATER, active: 0, running: null },
      title: PARTICLES.title,
      messages: conversation(PARTICLES),
      composer: { focus: true, text: tryText.slice(0, revealed(hold(t, GOLD_TITLE) - 0.35, 5.5)) },
      camera: { zoom: 2, focus: 'caret', fallback: 'composer', dy: -60, lag: 0.45 },
      badge: true,
      heading: {
        eyebrow: '保存即生效',
        main: '金色粒子',
        sub: 'Codex 改完就生效，不用重启',
        delay: GOLD_TITLE,
        at: [58, 36],
        target: { anchor: 'caret', side: 'right', dx: 12 },
      },
    })
  );

  add(bar(16), bar(18) + 1, 'vscode', endCard('Codex：在 VS Code 扩展里「为 Codex 启用 Woodfish」一键启用，或从 GitHub Release 下载 woodfish.exe'));

  return scenes;
}

function vscodeCut() {
  const scenes = [];
  const add = (start, end, host, build) => scenes.push({ start, end, host, build });

  // Hook (the last quiet bar): typing on 《彩云》 with the caret trail and sparks, already
  // under way when the video starts; it stops while the title is in.
  add(bar(24), bar(26), 'vscode', (t) => {
    const u = t - BAR;
    return {
      palette: 'dark',
      css: 'base',
      panes: [{ code: CODE.greet, typed: revealed(hold(u, 0.45) + 1.4, 14), cursor: true, large: true }],
      camera: { zoom: glide(u, 0, 4, 1, 1.25), focus: 'cursor', fallback: 'code', x: 430, lag: 0.45 },
      heading: {
        eyebrow: 'WOODFISH THEME 8.1',
        main: 'VS Code 新功能',
        sub: '10 套热门主题、窗口背景、光标拖尾、打字粒子、效果插件',
        delay: BAR + 0.45,
        at: [6, 78],
      },
    };
  });

  // Ten new themes, one per beat; the background stays, only the colors change. Each theme's
  // name shows in the corner once the title has left.
  add(bar(26), bar(26) + 10 * BEAT, 'vscode', (t) => {
    const index = Math.min(POPULAR.length - 1, Math.floor(t / BEAT));
    const [slug, label] = POPULAR[index];
    return {
      palette: slug,
      css: 'base',
      panes: [{ code: CODE.typescript, cursor: true }],
      camera: { zoom: glide(t, 0, 2, 1, 1.2), focus: 'code' },
      heading: { eyebrow: '主题', main: '10 套热门主题', sub: '原样收录上游配色，代码渐变自动生成', delay: 0.3, at: [56, 78] },
      caption: { main: label, sub: '', at: t - Math.floor(t / BEAT) * BEAT + 1 },
    };
  });

  // The window background: off for half a beat, then 《彩云》.
  add(bar(26) + 10 * BEAT, bar(29) + 2 * BEAT, 'vscode', (t) => ({
    palette: 'dark',
    css: t >= 0.5 * BEAT ? 'base' : 'plain',
    panes: [{ code: CODE.typescript, cursor: true }],
    camera: { zoom: 1, focus: 'window' },
    badge: true,
    heading: { eyebrow: '背景', main: '窗口背景', sub: '默认是《彩云》；运行「设置背景图片」换成你自己的图', delay: 0.45, at: [50, 78] },
  }));

  // The caret trail and typing sparks, followed by the camera; typing stops while the title is in.
  const CARET_TITLE = 3.2;
  add(bar(29) + 2 * BEAT, bar(31) + 2 * BEAT, 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: CODE.greet, typed: revealed(hold(t, CARET_TITLE) - 0.3, 15), cursor: true, large: true }],
    camera: { zoom: glide(t, 0, 1.5, 1, 1.7), focus: 'cursor', fallback: 'code', x: 350, lag: 0.45 },
    badge: true,
    heading: {
      eyebrow: '编辑器',
      main: '光标拖尾 · 打字粒子',
      sub: '拖尾颜色、长度，一行 CSS 就能改',
      delay: CARET_TITLE,
      at: [58, 64],
      target: { anchor: 'cursor', side: 'right', dx: 12 },
    },
  }));

  // The mouse trail: the pointer wanders over the code.
  add(bar(31) + 2 * BEAT, bar(32) + 2 * BEAT, 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: CODE.typescript }],
    pointer: { x: 480 + 300 * Math.sin(t * 1.9), y: 200 + 90 * Math.sin(t * 3.1 + 0.6) },
    camera: { zoom: 1, focus: 'window' },
    badge: true,
    heading: { eyebrow: '鼠标', main: '鼠标拖尾', sub: '指针身后一条带子；默认关闭，设置里打开', delay: 0.35, at: [6, 80] },
  }));

  // user.css: the title points at the empty line first, then the variable is typed and saved,
  // and the next keystrokes trail in red.
  const CSS_TITLE = 0.3;
  const prefix = USER_CSS.slice(0, 2).reduce((sum, line) => sum + line.reduce((s, [text]) => s + text.length, 0) + 1, 0);
  const typingFrom = CSS_TITLE + TITLE_STILL;
  const savedAt = typingFrom + (USER_CSS_SAVED_AT - prefix) / 22 + 0.25;
  add(bar(32) + 2 * BEAT, bar(34) + 2 * BEAT, 'vscode', (t) => {
    const saved = t >= savedAt;
    const typed = saved
      ? USER_CSS_SAVED_AT + revealed(t - savedAt - 0.2, 8)
      : Math.min(USER_CSS_SAVED_AT, prefix + revealed(t - typingFrom, 22));
    return {
      palette: 'dark',
      css: 'base',
      userCss: saved ? RED_TRAIL_CSS : '',
      panes: [{ code: USER_CSS, typed, cursor: true, large: true }],
      camera: { zoom: glide(t, 0, 1.5, 1, 1.45), focus: 'cursor', fallback: 'code', x: 400, lag: 0.45 },
      badge: true,
      heading: {
        eyebrow: '自定义',
        main: '一行 CSS 改样子',
        sub: '每个参数都是一个 CSS 变量，写进 user.css，保存就生效',
        delay: CSS_TITLE,
        at: [16, 72],
        target: { anchor: 'cursor', side: 'right', dx: 12 },
      },
    };
  });

  // AGENTS.md: the folder tells an AI how to change it.
  add(bar(34) + 2 * BEAT, bar(35) + 2 * BEAT, 'vscode', () => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: AGENTS_MD, compact: true }],
    camera: { zoom: 1.15, focus: 'code' },
    badge: true,
    heading: {
      eyebrow: '交给 AI',
      main: '让 AI 改效果',
      sub: '效果文件夹里有写给 AI 的说明\n对 Codex、Claude 说一句“把拖尾改成红色”就行',
      delay: 0.3,
      at: [50, 74],
    },
  }));

  // One folder for both editors.
  add(bar(35) + 2 * BEAT, bar(36) + 2 * BEAT, 'vscode', () => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: EFFECTS_FOLDER, compact: true }],
    camera: { zoom: 1.15, focus: 'code' },
    badge: true,
    heading: { eyebrow: '共用', main: '和 Codex 共用一套效果', sub: '同一个效果文件夹，改一次两边都变', delay: 0.3, at: [50, 74] },
  }));

  // How to get it, then the end card in the quiet outro.
  add(bar(36) + 2 * BEAT, bar(37) + 2 * BEAT, 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: INSTALL_VSCODE, typed: revealed(t - 0.2, 30), cursor: true, large: true, centered: true }],
    heading: { eyebrow: '安装', main: 'Woodfish Theme 8.1', sub: 'VS Code 扩展商店 / Open VSX 搜 Woodfish Theme', delay: 0.35, at: [8, 26] },
  }));

  add(bar(37) + 2 * BEAT, bar(39.5) + 1, 'vscode', endCard('VS Code 扩展商店 / Open VSX 搜 Woodfish Theme · ext install zhongjun.woodfish-theme'));

  return scenes;
}

const CUTS = {
  full: { scenes: full.storyboard, start: full.START, end: full.END, badge: '你可以让 Codex 随时调整此效果', out: 'woodfish-8.0-promo.mp4' },
  codex: { scenes: codexCut, start: bar(1), end: bar(18), badge: '你可以让 Codex 随时调整此效果', out: 'woodfish-8.1-codex.mp4' },
  vscode: { scenes: vscodeCut, start: bar(25), end: bar(39.5), badge: '你可以让 AI 随时调整此效果', out: 'woodfish-8.1-vscode.mp4' },
};

/** user.css contents a VS Code shot can switch to (the page carries one effects module each). */
const USER_CSS_VARIANTS = [RED_TRAIL_CSS];

module.exports = { CUTS, USER_CSS_VARIANTS };
