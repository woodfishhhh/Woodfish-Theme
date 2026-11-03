'use strict';
/*
 * The promo storyboard. Times are seconds on the BGM's beat grid (79.5 BPM, first beat at
 * 0.75 s); section changes sit where the track's loudness jumps.
 */

const { T } = require('../lib/scene-kit');

const BEAT = 60 / 79.5;
const beat = (k) => 0.75 + k * BEAT;

/** Code samples as lines of tokens; roles are palette token roles, `fg` is plain text. */
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
  react: [
    [T('import', 'keyword'), T(' { ', 'punctuation'), T('useState', 'variable'), T(' } ', 'punctuation'), T('from', 'keyword'), T(" 'react'", 'string'), T(';', 'punctuation')],
    [],
    [T('export', 'keyword'), T(' ', 'fg'), T('function', 'storage'), T(' ', 'fg'), T('ThemePicker', 'function'), T('({ ', 'punctuation'), T('themes', 'parameter'), T(' }: ', 'punctuation'), T('Props', 'type'), T(') {', 'punctuation')],
    [T('  const', 'storage'), T(' [', 'punctuation'), T('active', 'variable'), T(', ', 'punctuation'), T('setActive', 'function'), T('] = ', 'operator'), T('useState', 'function'), T('(', 'punctuation'), T('themes', 'parameter'), T('[', 'punctuation'), T('0', 'number'), T(']);', 'punctuation')],
    [T('  return', 'keyword'), T(' (', 'punctuation')],
    [T('    <', 'punctuation'), T('ul', 'tag'), T(' ', 'fg'), T('className', 'attribute'), T('=', 'operator'), T('"theme-list"', 'string'), T('>', 'punctuation')],
    [T('      {', 'punctuation'), T('themes', 'parameter'), T('.', 'punctuation'), T('map', 'function'), T('((', 'punctuation'), T('theme', 'parameter'), T(') => (', 'punctuation')],
    [T('        <', 'punctuation'), T('li', 'tag'), T(' ', 'fg'), T('key', 'attribute'), T('={', 'punctuation'), T('theme', 'variable'), T('.', 'punctuation'), T('id', 'property'), T('} ', 'punctuation'), T('onClick', 'attribute'), T('={() => ', 'punctuation'), T('setActive', 'function'), T('(', 'punctuation'), T('theme', 'variable'), T(')}>', 'punctuation')],
    [T('          {', 'punctuation'), T('theme', 'variable'), T('.', 'punctuation'), T('label', 'property'), T('}', 'punctuation')],
    [T('        </', 'punctuation'), T('li', 'tag'), T('>', 'punctuation')],
    [T('      ))}', 'punctuation')],
    [T('    </', 'punctuation'), T('ul', 'tag'), T('>', 'punctuation')],
    [T('  );', 'punctuation')],
    [T('}', 'punctuation')],
  ],
  cursor: [
    [T('function', 'storage'), T(' ', 'fg'), T('glow', 'function'), T('(', 'punctuation'), T('token', 'parameter'), T(': ', 'punctuation'), T('Token', 'type'), T(', ', 'punctuation'), T('intensity', 'parameter'), T(' = ', 'operator'), T('1.2', 'number'), T(') {', 'punctuation')],
    [T('  const', 'storage'), T(' ', 'fg'), T('color', 'variable'), T(' = ', 'operator'), T('token', 'parameter'), T('.', 'punctuation'), T('color', 'property'), T(';', 'punctuation')],
    [T('  return', 'keyword'), T(' ', 'fg'), T('`0 0 ', 'string'), T('${', 'escape'), T('4', 'number'), T(' * ', 'operator'), T('intensity', 'parameter'), T('}', 'escape'), T('px ', 'string'), T('${', 'escape'), T('color', 'variable'), T('}', 'escape'), T('`', 'string'), T(';', 'punctuation')],
    [T('}', 'punctuation')],
  ],
  glassBefore: [
    [T('export', 'keyword'), T(' ', 'fg'), T('async', 'storage'), T(' ', 'fg'), T('function', 'storage'), T(' ', 'fg'), T('loadTheme', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(': ', 'punctuation'), T('string', 'type'), T(') {', 'punctuation')],
    [T('  const', 'storage'), T(' ', 'fg'), T('pattern', 'variable'), T(' = ', 'operator'), T('/^#[0-9a-f]{6}$/i', 'regexp'), T(';', 'punctuation')],
  ],
  glassTyping: [T('  const', 'storage'), T(' ', 'fg'), T('text', 'variable'), T(' = ', 'operator'), T('await', 'keyword'), T(' ', 'fg'), T('fs', 'namespace'), T('.', 'punctuation'), T('rea', 'variable')],
  glassDone: [T('  const', 'storage'), T(' ', 'fg'), T('text', 'variable'), T(' = ', 'operator'), T('await', 'keyword'), T(' ', 'fg'), T('fs', 'namespace'), T('.', 'punctuation'), T('readFile', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(');', 'punctuation')],
  glassAfter: [
    [T('  if', 'keyword'), T(' (', 'punctuation'), T('this', 'self'), T('.', 'punctuation'), T('cache', 'property'), T('.', 'punctuation'), T('has', 'function'), T('(', 'punctuation'), T('text', 'variable'), T(')) ', 'punctuation'), T('return', 'keyword'), T(' { ', 'punctuation'), T('name', 'property'), T(': ', 'punctuation'), T('"woodfish"', 'string'), T(', ', 'punctuation'), T('size', 'property'), T(': ', 'punctuation'), T('42', 'number'), T(' };', 'punctuation')],
    [T('  throw', 'keyword'), T(' ', 'fg'), T('new', 'keyword'), T(' ', 'fg'), T('Error', 'type'), T('(', 'punctuation'), T('`missing ', 'string'), T('${', 'escape'), T('path', 'variable'), T('}', 'escape'), T('`', 'string'), T(');', 'punctuation'), T('  // 补全列表后面的代码会透出来', 'comment')],
    [T('  return', 'keyword'), T(' ', 'fg'), T('parse', 'function'), T('(', 'punctuation'), T('text', 'variable'), T(', ', 'punctuation'), T('{ ', 'punctuation'), T('strict', 'property'), T(': ', 'punctuation'), T('true', 'self'), T(', ', 'punctuation'), T('retries', 'property'), T(': ', 'punctuation'), T('3', 'number'), T(' });', 'punctuation')],
    [T('}', 'punctuation')],
  ],
  // 100 characters: Monaco shows it as two 50-character spans.
  paragraph: [[T('Woodfish keeps the colors you already use and paints every single word with one hand-tuned gradient.', 'fg')]],
  python: [
    [T('from', 'keyword'), T(' ', 'fg'), T('dataclasses', 'namespace'), T(' ', 'fg'), T('import', 'keyword'), T(' ', 'fg'), T('dataclass', 'decorator')],
    [T('from', 'keyword'), T(' ', 'fg'), T('pathlib', 'namespace'), T(' ', 'fg'), T('import', 'keyword'), T(' ', 'fg'), T('Path', 'type')],
    [],
    [T('@dataclass', 'decorator')],
    [T('class', 'storage'), T(' ', 'fg'), T('Theme', 'type'), T(':', 'punctuation')],
    [T('    name', 'property'), T(': ', 'punctuation'), T('str', 'type')],
    [T('    size', 'property'), T(': ', 'punctuation'), T('int', 'type'), T(' = ', 'operator'), T('42', 'number')],
    [],
    [T('def', 'storage'), T(' ', 'fg'), T('load_theme', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(': ', 'punctuation'), T('Path', 'type'), T(', ', 'punctuation'), T('retries', 'parameter'), T(': ', 'punctuation'), T('int', 'type'), T(' = ', 'operator'), T('3', 'number'), T(') -> ', 'punctuation'), T('Theme', 'type'), T(':', 'punctuation')],
    [T('    for', 'keyword'), T(' ', 'fg'), T('_', 'variable'), T(' ', 'fg'), T('in', 'keyword'), T(' ', 'fg'), T('range', 'function'), T('(', 'punctuation'), T('retries', 'parameter'), T('):', 'punctuation')],
    [T('        text', 'variable'), T(' = ', 'operator'), T('path', 'parameter'), T('.', 'punctuation'), T('read_text', 'function'), T('(', 'punctuation'), T('"utf-8"', 'string'), T(')', 'punctuation')],
    [T('        if', 'keyword'), T(' ', 'fg'), T('text', 'variable'), T('.', 'punctuation'), T('startswith', 'function'), T('(', 'punctuation'), T('"#"', 'string'), T('):', 'punctuation')],
    [T('            return', 'keyword'), T(' ', 'fg'), T('Theme', 'type'), T('(', 'punctuation'), T('name', 'parameter'), T('=', 'operator'), T('"woodfish"', 'string'), T(')', 'punctuation')],
    [T('    raise', 'keyword'), T(' ', 'fg'), T('ValueError', 'type'), T('(', 'punctuation'), T('f"missing ', 'string'), T('{', 'escape'), T('path', 'variable'), T('}', 'escape'), T('"', 'string'), T(')', 'punctuation')],
  ],
  go: [
    [T('package', 'keyword'), T(' ', 'fg'), T('theme', 'namespace')],
    [],
    [T('type', 'storage'), T(' ', 'fg'), T('Theme', 'type'), T(' ', 'fg'), T('struct', 'storage'), T(' {', 'punctuation')],
    [T('\tName', 'property'), T(' ', 'fg'), T('string', 'type')],
    [T('\tSize', 'property'), T(' ', 'fg'), T('int', 'type')],
    [T('}', 'punctuation')],
    [],
    [T('func', 'storage'), T(' ', 'fg'), T('Load', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(' ', 'fg'), T('string', 'type'), T(', ', 'punctuation'), T('retries', 'parameter'), T(' ', 'fg'), T('int', 'type'), T(') (*', 'punctuation'), T('Theme', 'type'), T(', ', 'punctuation'), T('error', 'type'), T(') {', 'punctuation')],
    [T('\tfor', 'keyword'), T(' ', 'fg'), T('i', 'variable'), T(' := ', 'operator'), T('0', 'number'), T('; ', 'punctuation'), T('i', 'variable'), T(' < ', 'operator'), T('retries', 'parameter'), T('; ', 'punctuation'), T('i', 'variable'), T('++', 'operator'), T(' {', 'punctuation')],
    [T('\t\tif', 'keyword'), T(' ', 'fg'), T('ok', 'variable'), T(' := ', 'operator'), T('exists', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T('); ', 'punctuation'), T('ok', 'variable'), T(' {', 'punctuation')],
    [T('\t\t\treturn', 'keyword'), T(' &', 'operator'), T('Theme', 'type'), T('{', 'punctuation'), T('Name', 'property'), T(': ', 'punctuation'), T('"woodfish"', 'string'), T(', ', 'punctuation'), T('Size', 'property'), T(': ', 'punctuation'), T('42', 'number'), T('}, ', 'punctuation'), T('nil', 'self')],
    [T('\t\t}', 'punctuation')],
    [T('\t}', 'punctuation')],
    [T('\treturn', 'keyword'), T(' ', 'fg'), T('nil', 'self'), T(', ', 'punctuation'), T('fmt', 'namespace'), T('.', 'punctuation'), T('Errorf', 'function'), T('(', 'punctuation'), T('"missing %s"', 'string'), T(', ', 'punctuation'), T('path', 'parameter'), T(')', 'punctuation')],
    [T('}', 'punctuation')],
  ],
  rust: [
    [T('use', 'keyword'), T(' ', 'fg'), T('std', 'namespace'), T('::', 'punctuation'), T('fs', 'namespace'), T(';', 'punctuation')],
    [],
    [T('#[derive(Debug, Clone)]', 'macro')],
    [T('pub', 'keyword'), T(' ', 'fg'), T('struct', 'storage'), T(' ', 'fg'), T('Theme', 'type'), T(' { ', 'punctuation'), T('name', 'property'), T(': ', 'punctuation'), T('String', 'type'), T(', ', 'punctuation'), T('size', 'property'), T(': ', 'punctuation'), T('u32', 'type'), T(' }', 'punctuation')],
    [],
    [T('pub', 'keyword'), T(' ', 'fg'), T('fn', 'storage'), T(' ', 'fg'), T('load_theme', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(': &', 'punctuation'), T('str', 'type'), T(') -> ', 'punctuation'), T('Result', 'type'), T('<', 'punctuation'), T('Theme', 'type'), T(', ', 'punctuation'), T('String', 'type'), T('> {', 'punctuation')],
    [T('    let', 'storage'), T(' ', 'fg'), T('text', 'variable'), T(' = ', 'operator'), T('fs', 'namespace'), T('::', 'punctuation'), T('read_to_string', 'function'), T('(', 'punctuation'), T('path', 'parameter'), T(').', 'punctuation'), T('map_err', 'function'), T('(|', 'punctuation'), T('e', 'parameter'), T('| ', 'punctuation'), T('e', 'parameter'), T('.', 'punctuation'), T('to_string', 'function'), T('())?;', 'punctuation')],
    [T('    match', 'keyword'), T(' ', 'fg'), T('text', 'variable'), T('.', 'punctuation'), T('trim', 'function'), T('() {', 'punctuation')],
    [T('        ""', 'string'), T(' => ', 'operator'), T('Err', 'type'), T('(', 'punctuation'), T('format!', 'macro'), T('(', 'punctuation'), T('"empty {path}"', 'string'), T(')),', 'punctuation')],
    [T('        name', 'variable'), T(' => ', 'operator'), T('Ok', 'type'), T('(', 'punctuation'), T('Theme', 'type'), T(' { ', 'punctuation'), T('name', 'property'), T(': ', 'punctuation'), T('name', 'variable'), T('.', 'punctuation'), T('into', 'function'), T('(), ', 'punctuation'), T('size', 'property'), T(': ', 'punctuation'), T('42', 'number'), T(' }),', 'punctuation')],
    [T('    }', 'punctuation')],
    [T('}', 'punctuation')],
  ],
  css: [
    [T(':root', 'tag'), T(' {', 'punctuation')],
    [T('  --accent', 'property'), T(': ', 'punctuation'), T('#eacd61', 'number'), T(';', 'punctuation')],
    [T('  --radius', 'property'), T(': ', 'punctuation'), T('12px', 'number'), T(';', 'punctuation')],
    [T('}', 'punctuation')],
    [],
    [T('.card', 'tag'), T(':hover', 'attribute'), T(' > ', 'operator'), T('.title', 'tag'), T('::after', 'attribute'), T(' {', 'punctuation')],
    [T('  content', 'property'), T(': ', 'punctuation'), T('"woodfish"', 'string'), T(';', 'punctuation')],
    [T('  background', 'property'), T(': ', 'punctuation'), T('linear-gradient', 'function'), T('(', 'punctuation'), T('45deg', 'number'), T(', ', 'punctuation'), T('var', 'function'), T('(', 'punctuation'), T('--accent', 'variable'), T('), ', 'punctuation'), T('#ea618e', 'number'), T(');', 'punctuation')],
    [T('  border-radius', 'property'), T(': ', 'punctuation'), T('calc', 'function'), T('(', 'punctuation'), T('var', 'function'), T('(', 'punctuation'), T('--radius', 'variable'), T(') * ', 'punctuation'), T('2', 'number'), T(');', 'punctuation')],
    [T('}', 'punctuation')],
    [],
    [T('@media', 'keyword'), T(' (', 'punctuation'), T('prefers-reduced-motion', 'property'), T(': ', 'punctuation'), T('reduce', 'self'), T(') {', 'punctuation')],
    [T('  .card', 'tag'), T(' { ', 'punctuation'), T('transition', 'property'), T(': ', 'punctuation'), T('none', 'self'), T(' ', 'fg'), T('!important', 'keyword'), T('; }', 'punctuation')],
    [T('}', 'punctuation')],
  ],
  markdown: [
    [T('# ', 'punctuation'), T('Woodfish Theme', 'keyword')],
    [],
    [T('Woodfish 给代码文字加上渐变和发光，再加上彩虹光标和毛玻璃。', 'fg')],
    [],
    [T('## ', 'punctuation'), T('安装', 'keyword')],
    [],
    [T('- ', 'operator'), T('VS Code：在扩展商店搜索 ', 'fg'), T('**Woodfish Theme**', 'type')],
    [T('- ', 'operator'), T('Cursor、Kiro、Trae：在扩展面板里搜索同名扩展', 'fg')],
    [T('- ', 'operator'), T('手动安装：', 'fg'), T('`code --install-extension woodfish-theme.vsix`', 'string')],
    [],
    [T('> ', 'comment'), T('长段落以前每五十个字就断一次颜色，现在是一整条渐变。', 'comment')],
  ],
  json: [
    [T('{', 'punctuation')],
    [T('  "workbench.colorTheme"', 'property'), T(': ', 'punctuation'), T('"Default Dark Modern"', 'string'), T(',', 'punctuation')],
    [T('  "woodfishTheme.overlay.hueShift"', 'property'), T(': ', 'punctuation'), T('32', 'number'), T(',', 'punctuation')],
    [T('  "woodfishTheme.glow.intensity"', 'property'), T(': ', 'punctuation'), T('1', 'number'), T(',', 'punctuation')],
    [T('  "woodfishTheme.cursor.enabled"', 'property'), T(': ', 'punctuation'), T('true', 'self'), T(',', 'punctuation')],
    [T('  "woodfishTheme.glass.enabled"', 'property'), T(': ', 'punctuation'), T('true', 'self')],
    [T('}', 'punctuation')],
  ],
  install: [[T('code', 'function'), T(' ', 'fg'), T('--install-extension', 'parameter'), T(' ', 'fg'), T('zhongjun.woodfish-theme', 'string')]],
};

const THEMES = ['dark', 'dracula', 'black', 'neon', 'light'];
const LABELS = {
  dark: 'Woodfish Dark',
  dracula: 'Woodfish Dracula',
  black: 'Woodfish Black',
  neon: 'Woodfish Neon',
  light: 'Woodfish Light',
  'dark-modern': 'VS Code Dark Modern',
};

/** Characters revealed after `seconds` of typing at `perSecond`. */
const typed = (seconds, perSecond) => Math.max(0, Math.floor(seconds * perSecond));

/** Scene list: [start, end) in seconds, and a function from local time to a frame state. */
function storyboard() {
  const scenes = [];
  const add = (start, end, build) => scenes.push({ start, end, build });

  // Intro: the code is typed in Woodfish Dark, the rainbow cursor in front.
  add(0, beat(13), (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: CODE.typescript, typed: typed(t - 0.5, 48), cursor: true }],
    caption: t > 7.6 ? { main: 'Woodfish Theme 7.2', sub: '给代码加上渐变和发光', at: t - 7.6 } : null,
  }));

  // Five built-in themes, two beats each.
  add(beat(13), beat(23), (t) => {
    const index = Math.min(THEMES.length - 1, Math.floor(t / (2 * BEAT)));
    return {
      palette: THEMES[index],
      css: 'base',
      panes: [{ code: CODE.typescript }],
      caption: { main: LABELS[THEMES[index]], sub: '内置主题，每套都有手调的渐变', at: t },
    };
  });

  // VS Code's Dark Modern as it ships, then with Woodfish on the lift at beat 30.
  add(beat(23), beat(37), (t) => {
    const on = t >= beat(30) - beat(23);
    return {
      palette: 'dark-modern',
      css: 'base',
      panes: [{ code: CODE.react, woodfish: on }],
      caption: on
        ? { main: '开启 Woodfish', sub: '其他主题的渐变按同样的规律自动算出来', at: t - (beat(30) - beat(23)) }
        : { main: 'VS Code Dark Modern', sub: '原样', at: t },
    };
  });

  // Glow from off up to strong, then back to the default.
  add(beat(37), beat(47), (t) => {
    const ramp = [
      [0, 0],
      [1.2, 0],
      [4.6, 1.8],
      [6.2, 1],
    ];
    let intensity = 1;
    for (let index = 1; index < ramp.length; index += 1) {
      const [t0, v0] = ramp[index - 1];
      const [t1, v1] = ramp[index];
      if (t <= t1) {
        intensity = v0 + (v1 - v0) * Math.max(0, (t - t0) / (t1 - t0));
        break;
      }
    }
    const step = Math.round(intensity * 20) / 20;
    return {
      palette: 'dark',
      css: step === 0 ? 'glow-off' : `glow-${step.toFixed(2)}`,
      panes: [{ code: CODE.typescript }],
      caption: {
        main: step === 0 ? '发光：关' : '发光',
        sub: `woodfishTheme.glow.intensity: ${step === 0 ? '关' : step.toFixed(2)}`,
        at: t,
      },
    };
  });

  // The rainbow cursor while typing, in Woodfish Neon.
  add(beat(47), beat(57), (t) => ({
    palette: 'neon',
    css: 'base',
    panes: [{ code: CODE.cursor, typed: typed(t - 0.4, 16), cursor: true, large: true }],
    caption: { main: '彩虹光标', sub: '颜色一直在循环', at: t },
  }));

  // Frosted glass: the suggest list opens over colorful code and the code shows through.
  add(beat(57), beat(67), (t) => {
    const typingStart = 0.4;
    const prefix = CODE.glassTyping.reduce((sum, [text]) => sum + text.length, 0);
    const typedNow = typed(t - typingStart, 14);
    const open = typedNow >= prefix && t < 6.4;
    const accepted = t >= 6.4;
    const steps = [0, 1, 2, 1, 0];
    const selected = steps[Math.min(steps.length - 1, Math.max(0, Math.floor((t - 3.2) / 0.55)))];
    const line = accepted ? CODE.glassDone : CODE.glassTyping;
    const before = CODE.glassBefore;
    const code = [...before, line, ...CODE.glassAfter];
    const offset = before.reduce((sum, row) => sum + row.reduce((s, [text]) => s + text.length, 0) + 1, 0);
    return {
      palette: 'dark',
      css: 'glass',
      panes: [
        {
          code,
          typed: accepted ? Infinity : offset + Math.min(prefix, typedNow),
          revealRest: true,
          cursor: true,
          suggest: open ? { selected } : null,
        },
      ],
      caption: { main: '毛玻璃', sub: '补全列表、菜单、悬浮提示，透出后面的代码', at: t },
    };
  });

  // Long text: 7.1 restarted the rainbow every 50 characters, 7.2 runs it through.
  add(beat(67), beat(76), (t) => {
    const count = typed(t - 0.3, 30);
    return {
      palette: 'dark',
      css: 'base',
      panes: [
        { code: CODE.paragraph, typed: count, splitRuns: true, label: '7.1', cursor: true, compact: true },
        { code: CODE.paragraph, typed: count, label: '7.2', cursor: true, compact: true },
      ],
      caption: { main: '长段落不再断色', sub: '以前每 50 个字渐变就从头开始', at: t },
    };
  });

  // Any language: six samples, six beats each (the last one seven).
  const languages = [
    ['python', 'dracula', 'Python'],
    ['go', 'neon', 'Go'],
    ['rust', 'dark', 'Rust'],
    ['css', 'black', 'CSS'],
    ['markdown', 'light', 'Markdown'],
    ['json', 'dark-modern', 'JSON'],
  ];
  languages.forEach(([sample, palette, name], index) => {
    const start = beat(76 + index * 6);
    const end = index === languages.length - 1 ? beat(113) : beat(82 + index * 6);
    add(start, end, (t) => ({
      palette,
      css: 'base',
      panes: [{ code: CODE[sample], typed: typed(t, 160) }],
      caption: { main: name, sub: LABELS[palette], at: t },
    }));
  });

  // Finale: the themes once more, one bar each.
  add(beat(113), beat(133), (t) => {
    const index = Math.min(THEMES.length - 1, Math.floor(t / (4 * BEAT)));
    return {
      palette: THEMES[index],
      css: 'base',
      panes: [{ code: CODE.typescript, cursor: true }],
      caption: { main: LABELS[THEMES[index]], sub: '', at: t - index * 4 * BEAT },
    };
  });

  // Outro: how to install.
  add(beat(133), 108.45, (t) => ({
    palette: 'dark',
    css: 'base',
    panes: [{ code: CODE.install, typed: typed(t - 0.4, 22), cursor: true, large: true }],
    caption: { main: 'Woodfish Theme 7.2', sub: 'VS Code Marketplace · Open VSX 搜索 Woodfish Theme', at: t - 2.2 },
  }));

  return scenes;
}

module.exports = { storyboard, BEAT, beat };
