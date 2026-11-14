'use strict';
/*
 * The 8.0 promo storyboard. Times are seconds of the BGM ("no more fires" by Sleepy Fish,
 * see docs/promo.md): measured at 57.5 BPM with triplet hi-hats, one bar = 4.174 s starting
 * at 0. The track is quiet for bar 0–1, full from bar 2, drops to a breakdown at bar 22; the
 * video runs from bar 1 (START) to bar 25 (END). Every shot changes on a beat.
 *
 * Shots are either `host: 'codex'` (codex-stage.js: a Codex window running the real
 * Woodfish overlay and effect plugins) or VS Code (stage.js, the default).
 */

const { T } = require('../lib/scene-kit');

const SUB = 0.3478;
const BEAT = 3 * SUB;
const BAR = 4 * BEAT;
const bar = (n) => n * BAR;
const START = bar(1);
const END = bar(25);

/** Characters revealed after `seconds` at `perSecond`, in chunks of `chunk` (stream tokens). */
const revealed = (seconds, perSecond, chunk = 1) =>
  Math.max(0, Math.floor((seconds * perSecond) / chunk) * chunk);

const codeLength = (lines) => lines.reduce((sum, line) => sum + line.reduce((s, [text]) => s + text.length, 0) + 1, 0);
const blocksLength = (blocks) =>
  blocks.reduce((sum, block) => sum + (block[0] === 'code' ? codeLength(block[2]) : block[1].length), 0);

/* ---------- Codex conversations ---------- */

const H = (text, cls) => [text, cls];

const RAIN = {
  title: '写三段雨后小城的短文',
  user: '用 Markdown 写三段雨后小城的短文，每段加一个三级标题。',
  blocks: [
    ['h3', '雨后的街道'],
    ['p', '雨停以后，石板路还亮着一层水光。卖花的老人把木桶搬回屋檐下，几个孩子踩着水洼跑过巷口，笑声一路溅到河边，惊起两只躲雨的麻雀，扑棱棱飞上对岸的柳树。'],
    ['h3', '河边的灯'],
    ['p', '天色慢慢暗下来，沿河的灯一盏接一盏亮起。倒影被晚风揉碎，又一点点拼回原样，像有人在水面上轻轻翻书。小船靠在石阶旁，船夫收起竹篙，看对岸的人家陆续开饭。'],
    ['h3', '夜里的窗'],
    ['p', '巷子深处的窗还开着，收音机里放着老歌。有人把晾了一天的衣服收进屋，顺手关了灯，整座小城跟着安静下来。只剩檐角还在滴水，一声，一声，像在数明天的晴天。'],
  ],
};

const WEEKLY = {
  title: '整理本周的提交记录',
  user: '把这周的提交整理成一份周报，按功能分组。',
  blocks: [
    ['h3', '效果插件'],
    ['p', '每个效果都改成了一个文件夹：effect.json 写参数，params.json 存现在的值，effect.js 是实现。保存就自动刷新，不用重启。'],
    ['h3', 'Codex 桌面版'],
    ['p', '回复正文换成彩虹字，选中的会话外圈加了光谱环，AI 吐字时末尾跟着彩虹光标。长对话和流式输出的帧时间没有变化。'],
  ],
};

const REACT = {
  title: 'React 主题切换组件',
  user: '写一个 React 主题切换组件，主题列表从 props 传进来。',
  blocks: [
    ['p', '下面是一个最小的版本，点哪一项就切到哪套主题：'],
    [
      'code',
      'TypeScript',
      [
        [H('export', 'hljs-keyword'), H(' '), H('function', 'hljs-keyword'), H(' '), H('ThemePicker', 'hljs-title function_'), H('('), H('{ themes }: Props', 'hljs-params'), H(') {')],
        [H('  '), H('const', 'hljs-keyword'), H(' [active, setActive] = '), H('useState', 'hljs-title function_'), H('(themes['), H('0', 'hljs-number'), H(']);')],
        [H('  '), H('return', 'hljs-keyword'), H(' (')],
        [H('    '), H('<ul', 'hljs-tag'), H(' '), H('className', 'hljs-attr'), H('='), H('"theme-list"', 'hljs-string'), H('>', 'hljs-tag')],
        [H('      {themes.'), H('map', 'hljs-title function_'), H('(('), H('theme', 'hljs-params'), H(') => (')],
        [H('        '), H('<li', 'hljs-tag'), H(' '), H('key', 'hljs-attr'), H('={theme.id} '), H('onClick', 'hljs-attr'), H('={() => '), H('setActive', 'hljs-title function_'), H('(theme)}>')],
        [H('          {theme.label}')],
        [H('        '), H('</li>', 'hljs-tag')],
        [H('      ))}')],
        [H('    '), H('</ul>', 'hljs-tag')],
        [H('  );')],
        [H('}')],
      ],
    ],
    ['p', 'active 变了就把对应的 class 挂到根元素上，样式交给 CSS 变量。'],
  ],
};

const PARTICLES = {
  title: '把打字粒子改成金色',
  user: 'Woodfish 打字时迸出来的粒子，帮我改成金色，再大一点。',
  blocks: [
    ['p', '效果文件夹里的 AGENTS.md 说，颜色、大小这类样子先用 user.css 改。我在 user.css 里加了三行：'],
    [
      'code',
      'CSS',
      [
        [H(':root', 'hljs-selector-pseudo'), H(' {')],
        [H('  '), H('--woodfish-typing-particles-colors', 'hljs-attr'), H(': single;')],
        [H('  '), H('--woodfish-typing-particles-color', 'hljs-attr'), H(': '), H('#ffd700', 'hljs-number'), H(';')],
        [H('  '), H('--woodfish-typing-particles-size', 'hljs-attr'), H(': '), H('2.8px', 'hljs-number'), H(';')],
        [H('}')],
      ],
    ],
    ['p', '保存后一两秒自动生效，不用重启 Codex。你打几个字试试？'],
  ],
};

/** The same three lines, as the file Codex saved. */
const GOLD_USER_CSS = `:root {
  --woodfish-typing-particles-colors: single;
  --woodfish-typing-particles-color: #ffd700;
  --woodfish-typing-particles-size: 2.8px;
}`;

const OTHER_THREADS = ['排查 CI 偶发超时', '写一份 Go 并发笔记', '生成 README 截图', '调研 OKLCH 渐变', '清理旧的工作树', '翻译发布说明', '给博客加暗色模式', '比较 pnpm 和 npm'];
const THREADS = [RAIN.title, WEEKLY.title, REACT.title, ...OTHER_THREADS];
const THREADS_LATER = [PARTICLES.title, ...THREADS];
const CI_THREAD = THREADS.indexOf('排查 CI 偶发超时');

/** A finished conversation as stage messages. */
function conversation(chat, shown = Infinity, done = true) {
  return [
    { id: `${chat.title}-user`, role: 'user', text: chat.user },
    { id: `${chat.title}-reply`, role: 'assistant', blocks: chat.blocks, shown, actions: done },
  ];
}

/** A Codex shot with the defaults every Codex scene shares. */
function codex(shot) {
  return {
    palette: 'dark',
    background: true,
    userCss: '',
    composer: {},
    slash: null,
    ...shot,
  };
}

const RAIN_STREAM_START = 2.0;
const RAIN_LENGTH = blocksLength(RAIN.blocks);
/** The reply ends a beat before the ring shot. */
const RAIN_RATE = RAIN_LENGTH / (bar(4) - BEAT - RAIN_STREAM_START);
const RAIN_END = RAIN_STREAM_START + RAIN_LENGTH / RAIN_RATE;

/** The rain story streaming in, by BGM time (it runs across the first two shots). */
function rainStream(audioTime) {
  const shown = revealed(audioTime - RAIN_STREAM_START, RAIN_RATE);
  const streaming = audioTime < RAIN_END;
  return {
    threads: { items: THREADS, active: 0, running: streaming ? 0 : CI_THREAD },
    title: RAIN.title,
    messages: conversation(RAIN, shown, !streaming),
  };
}

/* ---------- VS Code code samples ---------- */

const CODE = {
  typescript: [
    [T('// 读取主题文件，失败时重试', 'comment')],
    [T('import', 'keyword'), T(' { ', 'punctuation'), T('readFile', 'variable'), T(' } ', 'punctuation'), T('from', 'keyword'), T(" 'node:fs/promises'", 'string'), T(';', 'punctuation')],
    [],
    [T('export', 'keyword'), T(' ', 'fg'), T('async', 'storage'), T(' ', 'fg'), T('function', 'storage'), T(' ', 'fg'), T('loadTheme', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(': ', 'punctuation'), T('string', 'type'), T(', ', 'punctuation'), T('retries', 'parameter'), T(' = ', 'operator'), T('3', 'number'), T('): ', 'punctuation'), T('Promise', 'type'), T('<', 'punctuation'), T('Theme', 'type'), T('> {', 'punctuation')],
    [T('  const', 'storage'), T(' ', 'fg'), T('pattern', 'variable'), T(' = ', 'operator'), T('/^#[0-9a-f]{6}$/i', 'regexp'), T(';', 'punctuation')],
    [T('  for', 'keyword'), T(' (', 'punctuation'), T('let', 'storage'), T(' ', 'fg'), T('i', 'variable'), T(' = ', 'operator'), T('0', 'number'), T('; ', 'punctuation'), T('i', 'variable'), T(' < ', 'operator'), T('retries', 'parameter'), T('; ', 'punctuation'), T('i', 'variable'), T(' += ', 'operator'), T('1', 'number'), T(') {', 'punctuation')],
    [T('    const', 'storage'), T(' ', 'fg'), T('text', 'variable'), T(' = ', 'operator'), T('await', 'keyword'), T(' ', 'fg'), T('readFile', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(', ', 'punctuation'), T("'utf8'", 'string'), T(');', 'punctuation')],
    [T('    if', 'keyword'), T(' (', 'punctuation'), T('this', 'self'), T('.', 'punctuation'), T('cache', 'property'), T('.', 'punctuation'), T('has', 'function'), T('(', 'punctuation'), T('text', 'variable'), T(')) ', 'punctuation'), T('return', 'keyword'), T(' { ', 'punctuation'), T('name', 'property'), T(': ', 'punctuation'), T('"woodfish"', 'string'), T(', ', 'punctuation'), T('size', 'property'), T(': ', 'punctuation'), T('42', 'number'), T(' };', 'punctuation')],
    [T('  }', 'punctuation')],
    [T('  throw', 'keyword'), T(' ', 'fg'), T('new', 'keyword'), T(' ', 'fg'), T('Error', 'type'), T('(', 'punctuation'), T('`missing ', 'string'), T('${', 'escape'), T('path', 'variable'), T('}', 'escape'), T('`', 'string'), T(');', 'punctuation')],
    [T('}', 'punctuation')],
  ],
  greet: [
    [T('// 打字迸出粒子，光标拖着一段尾巴', 'comment')],
    [T('export', 'keyword'), T(' ', 'fg'), T('function', 'storage'), T(' ', 'fg'), T('greet', 'function'), T('(', 'punctuation'), T('name', 'parameter'), T(': ', 'punctuation'), T('string', 'type'), T(') {', 'punctuation')],
    [T('  const', 'storage'), T(' ', 'fg'), T('hour', 'variable'), T(' = ', 'operator'), T('new', 'keyword'), T(' ', 'fg'), T('Date', 'type'), T('().', 'punctuation'), T('getHours', 'function'), T('();', 'punctuation')],
    [T('  const', 'storage'), T(' ', 'fg'), T('word', 'variable'), T(' = ', 'operator'), T('hour', 'variable'), T(' < ', 'operator'), T('12', 'number'), T(' ? ', 'operator'), T('"早上好"', 'string'), T(' : ', 'operator'), T('"晚上好"', 'string'), T(';', 'punctuation')],
    [T('  return', 'keyword'), T(' ', 'fg'), T('`', 'string'), T('${', 'escape'), T('word', 'variable'), T('}', 'escape'), T('，', 'string'), T('${', 'escape'), T('name', 'variable'), T('}', 'escape'), T('！`', 'string'), T(';', 'punctuation')],
    [T('}', 'punctuation')],
  ],
  repo: [[T('https://github.com/woodfishhhh/Woodfish-Theme', 'string')]],
  // The 8.0 routes: Quick Open installs from the Marketplace, the command palette enables Codex.
  install: [
    [T('ext install', 'keyword'), T(' ', 'fg'), T('zhongjun.woodfish-theme', 'string')],
    [T('>', 'operator'), T(' ', 'fg'), T('Woodfish Theme:', 'function'), T(' ', 'fg'), T('为 Codex 启用 Woodfish', 'string')],
  ],
};

const POPULAR = [
  ['onedark', 'One Dark Pro'],
  ['tokyonight', 'Tokyo Night'],
  ['catppuccin-mocha', 'Catppuccin Mocha'],
  ['catppuccin-latte', 'Catppuccin Latte'],
  ['nord', 'Nord'],
  ['github-dark', 'GitHub Dark'],
  ['github-light', 'GitHub Light'],
  ['nightowl', 'Night Owl'],
  ['ayu-mirage', 'Ayu Mirage'],
  ['gruvbox-dark', 'Gruvbox Dark'],
];

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
/** `from` until beat `b0` of the shot, `to` from beat `b1`, eased in between. */
const glide = (t, b0, b1, from, to) =>
  from + (to - from) * easeInOut(Math.min(1, Math.max(0, (t - b0 * BEAT) / ((b1 - b0) * BEAT))));

/**
 * Scene list: [start, end) in BGM seconds, a host, and a function from local time to a shot.
 * `camera` is what the frame shows: `zoom` 1 is the whole window, `focus` the anchor the
 * stage reports (stream, caret, composer, thread, menu, reply, code, cursor…) the camera
 * glides to. `badge` shows 「你可以让 Codex 随时调整此效果」 on effect shots.
 */
function storyboard() {
  const scenes = [];
  const add = (start, end, host, build) => scenes.push({ start, end, host, build });

  // Hook (bar 1, the quiet intro): the whole window while a reply streams in, then a slow
  // push toward it. The shot starts at 0 so the pre-roll before the first frame is part of it.
  add(0, bar(2), 'codex', (t) =>
    codex({
      ...rainStream(t),
      camera: { zoom: glide(t, START / BEAT, bar(2) / BEAT, 1, 1.06), focus: 'window' },
      caption: t > START + 0.5 ? { main: 'Woodfish 8.0', sub: 'Codex 桌面版也换上了 Woodfish', at: t - START - 0.5 } : null,
    })
  );

  // The drop: push in on the line being written — rainbow cursor, trail, fade-in.
  add(bar(2), bar(4), 'codex', (t) =>
    codex({
      ...rainStream(bar(2) + t),
      camera: { zoom: glide(t, 0, 1.5, 1.06, 1.85), focus: 'stream', fallback: 'reply', alignX: 'column', lag: 0.3 },
      badge: true,
      caption: { main: 'AI 吐字：彩虹光标领着字往外走', sub: '身后一段拖尾，新字轻轻淡入；你打字和 AI 吐字是同一套效果', at: t - BEAT },
    })
  );

  // The selected thread wears the spectrum ring: a beat of the whole window, then in on the
  // sidebar; the selection hops on the beat and the camera follows it.
  const ringOrder = [0, 0, 2, 2, 1, 1, 0, 0];
  const chats = [RAIN, WEEKLY, REACT];
  add(bar(4), bar(6), 'codex', (t) => {
    const active = ringOrder[Math.min(ringOrder.length - 1, Math.floor(t / BEAT))];
    return codex({
      threads: { items: THREADS, active, running: CI_THREAD },
      title: chats[active].title,
      messages: conversation(chats[active]),
      camera: { zoom: glide(t, 0.75, 2, 1, 2.5), focus: 'thread', lag: 0.35 },
      badge: true,
      caption: { main: '选中的会话：七色光环', sub: '光谱环慢慢转，外面一圈柔光；运行中的会话亮一圈弱光', at: t - 0.3 },
    });
  });

  // Frosted glass: the slash menu opens over the rainbow reply; the camera rises to it.
  add(bar(6), bar(7), 'codex', (t) => {
    const open = t >= 0.5 * BEAT;
    return codex({
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN),
      composer: { focus: true, text: open ? '/' : '' },
      slash: open ? Math.min(3, Math.floor((t - 0.5 * BEAT) / (0.75 * BEAT))) : null,
      camera: { zoom: glide(t, 0.25, 1.5, 1.3, 1.75), focus: open ? 'menu' : 'composer', dy: open ? 40 : 0, lag: 0.3 },
      badge: true,
      caption: { main: '毛玻璃浮层', sub: '菜单弹出来，后面的彩虹字透出来', at: t - 0.3 },
    });
  });

  // The window background is the whole window: off for two beats, 《彩云》 on the third.
  add(bar(7), bar(8), 'codex', (t) => {
    const on = t >= 2 * BEAT;
    return codex({
      background: on,
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN),
      camera: { zoom: glide(t, 2, 4, 1, 1.08), focus: 'window' },
      badge: true,
      caption: on
        ? { main: '窗口背景《彩云》', sub: '作者自己画的；侧栏和输入框是磨砂玻璃，也能换成你的图', at: t - 2 * BEAT }
        : { main: '关掉背景', sub: '', at: t },
    });
  });

  // The composer: the 6px rainbow caret, trail on Home / End, particles while typing.
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
      caption: { main: '输入框：和 VS Code 一样的彩虹光标', sub: '打字迸出粒子，光标一跳就拖出一段尾巴', at: t - 0.3, position: 'top' },
    });
  });

  // One sentence to Codex: it reads the effects folder's AGENTS.md and writes user.css.
  // In on the composer while typing, back out to follow the reply.
  const request = PARTICLES.user;
  const sentAt = 4 * BEAT;
  const replyStart = sentAt + 0.6;
  const replyEnd = 10 * BEAT - 0.3;
  const replyRate = blocksLength(PARTICLES.blocks) / (replyEnd - replyStart);
  add(bar(10), bar(10) + 10 * BEAT, 'codex', (t) => {
    const sent = t >= sentAt;
    const streaming = sent && t < replyEnd;
    const messages = sent ? conversation(PARTICLES, revealed(t - replyStart, replyRate), !streaming) : [];
    return codex({
      threads: { items: THREADS_LATER, active: 0, running: streaming ? 0 : null },
      title: PARTICLES.title,
      messages,
      composer: sent ? { focus: false, text: '' } : { focus: true, text: request.slice(0, revealed(t - 0.3, 9)) },
      camera: sent
        ? { zoom: glide(t, 4, 5, 1.6, 1.4), focus: 'stream', fallback: ['reply', 'column'], alignX: 'column', lag: 0.4 }
        : { zoom: glide(t, 0, 1.5, 1, 1.6), focus: 'composer' },
      badge: true,
      caption: { main: '对 Codex 说一句：把打字粒子改成金色', sub: '效果文件夹里有写给 AI 的 AGENTS.md，它照着改 user.css', at: t - 0.3, position: 'top' },
    });
  });

  // Saved: the next keystrokes burst in gold; the camera stays on the caret.
  const tryText = '好看！金色的粒子，大了一号。再打几个字看看，就要这个颜色。';
  add(bar(10) + 10 * BEAT, bar(14), 'codex', (t) =>
    codex({
      userCss: GOLD_USER_CSS,
      threads: { items: THREADS_LATER, active: 0, running: null },
      title: PARTICLES.title,
      messages: conversation(PARTICLES),
      composer: { focus: true, text: tryText.slice(0, revealed(t - 0.35, 5.5)) },
      camera: { zoom: 2.1, focus: 'caret', fallback: 'composer', dy: -25, lag: 0.45 },
      badge: true,
      caption: { main: '保存即生效', sub: 'user.css 里每个参数都是一个 CSS 变量，升级不会覆盖', at: t - 0.3, position: 'top' },
    })
  );

  // Ten popular themes in VS Code, one per beat (the first holds three); in on the code.
  add(bar(14), bar(17), 'vscode', (t) => {
    const index = Math.max(0, Math.min(POPULAR.length - 1, Math.floor(t / BEAT) - 2));
    const [slug, label] = POPULAR[index];
    return {
      palette: slug,
      css: 'base',
      panes: [{ code: CODE.typescript, cursor: true }],
      camera: { zoom: glide(t, 0, 2, 1, 1.2), focus: 'code' },
      caption: { main: label, sub: '新增 10 套热门主题，原样收录上游配色，渐变按各自配色自动生成', at: index === 0 ? t : 1 },
    };
  });

  // The same effects in VS Code: the camera follows the caret as the code is typed.
  add(bar(17), bar(20), 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: CODE.greet, typed: revealed(t - 0.3, 15), cursor: true, large: true }],
    // x stays where whole lines fit (the pane starts at 90 px); y follows the caret.
    camera: { zoom: glide(t, 0, 1.5, 1, 1.7), focus: 'cursor', fallback: 'code', x: 370, lag: 0.45 },
    badge: true,
    caption: { main: 'VS Code 里也有：光标拖尾、打字粒子', sub: '和 Codex 共用一个效果文件夹，改一次两边都变', at: t - 0.3 },
  }));

  // Codex wears every theme too: the whole window recolors.
  const codexThemes = [['tokyonight', 'Tokyo Night'], ['catppuccin-latte', 'Catppuccin Latte'], ['gruvbox-dark', 'Gruvbox Dark'], ['nord', 'Nord']];
  add(bar(20), bar(21), 'codex', (t) => {
    const index = Math.min(codexThemes.length - 1, Math.floor(t / BEAT));
    return codex({
      palette: codexThemes[index][0],
      threads: { items: THREADS, active: 2, running: CI_THREAD },
      title: REACT.title,
      messages: conversation(REACT),
      caption: { main: 'Codex 也能用全部 15 套主题', sub: codexThemes[index][1], at: index === 0 ? t : 1 },
    });
  });

  // Finale.
  add(bar(21), bar(22), 'codex', (t) =>
    codex({
      threads: { items: THREADS, active: 0, running: CI_THREAD },
      title: RAIN.title,
      messages: conversation(RAIN),
      caption: { main: 'Woodfish Theme 8.0', sub: 'VS Code 和 Codex 桌面版，共用一个效果文件夹', at: t - 0.3 },
    })
  );

  // How to get it.
  add(bar(22), bar(23), 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: CODE.install, typed: revealed(t - 0.3, 26), cursor: true, large: true }],
    caption: { main: 'Woodfish Theme 8.0', sub: 'VS Code 扩展商店 / Open VSX 搜 Woodfish Theme；Codex：扩展里「为 Codex 启用 Woodfish」一键启用，或从 GitHub Release 下载 woodfish.exe', at: t - 0.3 },
  }));

  // End card: the repository and a star, long enough to read and screenshot.
  add(bar(23), END + 1, 'vscode', (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: CODE.repo, typed: revealed(t - 0.2, 30), cursor: true, large: true, centered: true }],
    end: 'Woodfish Theme 8.0 · 扩展商店 / Open VSX 搜 Woodfish Theme · Codex 在扩展里一键启用，或下载 woodfish.exe',
  }));

  return scenes;
}

module.exports = { storyboard, BEAT, BAR, bar, START, END };
