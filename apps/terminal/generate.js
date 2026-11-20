const fs = require('node:fs');
const path = require('node:path');
const { WOODFISH_PALETTES, requireCssColor } = require('@woodfish/theme-core');
const { parseJsonc } = require('../vscode-extension/scripts/lib/jsonc');
const { contributes } = require('../vscode-extension/package.json');

const vscode = path.resolve(__dirname, '../vscode-extension');
const dist = path.join(__dirname, 'dist');
const ansiNames = ['black', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'white'];

function opaque(color, background) {
  const ink = requireCssColor(color);
  const paper = requireCssColor(background);
  return (
    '#' +
    ['r', 'g', 'b']
      .map((key) =>
        Math.round(ink[key] * ink.alpha + paper[key] * (1 - ink.alpha))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function text(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function plistDict(values) {
  return (
    '<dict>' +
    Object.entries(values)
      .map(([key, value]) => `<key>${key}</key><string>${text(value)}</string>`)
      .join('') +
    '</dict>'
  );
}

function tmTheme(label, theme, defaults) {
  const scopes = [];
  for (const { scope, settings } of theme.tokenColors) {
    const colors = Object.fromEntries(
      Object.entries(settings).filter(([key]) =>
        ['foreground', 'background', 'fontStyle'].includes(key)
      )
    );
    if (!scope) Object.assign(defaults, colors);
    else if (Object.keys(colors).length)
      scopes.push(
        `<dict><key>scope</key><string>${text([scope].flat().join(', '))}</string><key>settings</key>${plistDict(colors)}</dict>`
      );
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<plist version="1.0"><dict><key>name</key><string>${text(label)}</string><key>settings</key><array>`,
    `<dict><key>settings</key>${plistDict(defaults)}</dict>`,
    ...scopes,
    '</array></dict></plist>',
    '',
  ].join('\n');
}

function flavor({ ui: u }) {
  return `[app]
overall = { fg = "${u.fg}", bg = "${u.bg}" }

[mgr]
cwd = { fg = "${u.accent}" }
border_style = { fg = "${u.border}" }
find_keyword = { fg = "${u.warning}" }
marker_copied = { fg = "${u.success}", bg = "${u.success}" }
marker_cut = { fg = "${u.error}", bg = "${u.error}" }
marker_selected = { fg = "${u.accent}", bg = "${u.accent}" }

[tabs]
active = { fg = "${u.accentFg}", bg = "${u.accent}" }
inactive = { fg = "${u.fgMuted}", bg = "${u.bgAlt}" }

[indicator]
current = { fg = "${u.fg}", bg = "${opaque(u.selection, u.bg)}" }

[mode]
normal_main = { fg = "${u.accentFg}", bg = "${u.accent}" }
normal_alt = { fg = "${u.accent}", bg = "${u.bgAlt}" }

[filetype]
rules = [
  { url = "*", is = "orphan", fg = "${u.error}" },
  { url = "*", is = "exec", fg = "${u.success}" },
  { url = "*/", fg = "${u.info}" },
]
`;
}

function lsd({ ui: u, tokens: t }) {
  const rgb = (hex) => {
    const { r, g, b } = requireCssColor(hex);
    return `[${r}, ${g}, ${b}]`;
  };
  return `user: ${rgb(t.variable)}
group: ${rgb(t.type)}
permission:
  read: ${rgb(u.success)}
  write: ${rgb(u.warning)}
  exec: ${rgb(u.error)}
  no-access: ${rgb(u.fgSubtle)}
date:
  hour-old: ${rgb(u.success)}
  day-old: ${rgb(u.info)}
  older: ${rgb(u.fgMuted)}
size:
  none: ${rgb(u.fgSubtle)}
  small: ${rgb(t.number)}
  medium: ${rgb(u.warning)}
  large: ${rgb(u.error)}
tree-edge: ${rgb(u.fgSubtle)}
`;
}

function zsh({ ui: u, tokens: t }) {
  const groups = [
    ['default', u.fg],
    ['unknown-token', u.error],
    ['reserved-word', t.keyword],
    ['command builtin alias function precommand', t.function],
    ['path', t.type],
    ['single-quoted-argument double-quoted-argument dollar-quoted-argument', t.string],
    ['dollar-double-quoted-argument assign', t.variable],
    ['comment', t.comment],
    ['single-hyphen-option double-hyphen-option', t.attribute],
    ['commandseparator redirection', t.operator],
    ['back-double-quoted-argument', t.escape],
  ];
  return groups
    .flatMap(([keys, color]) =>
      keys.split(' ').map((key) => `ZSH_HIGHLIGHT_STYLES[${key}]='fg=${color}'\n`)
    )
    .join('');
}

function render(p, theme) {
  const c = theme.colors;
  const name = `woodfish-${p.slug}`;
  const background = opaque(c['terminal.background'] ?? p.ui.bg, p.ui.bg);
  const foreground = opaque(c['terminal.foreground'] ?? p.ui.fg, background);
  const cursorColor = opaque(
    c['terminalCursor.foreground'] ?? c['editorCursor.foreground'] ?? foreground,
    background
  );
  const selectionBackground = opaque(
    c['terminal.selectionBackground'] ?? p.ui.selection,
    background
  );
  const syntax = tmTheme(p.label, theme, {
    foreground: c['editor.foreground'] ?? p.ui.fg,
    background: c['editor.background'] ?? p.ui.bg,
  });
  const palette = Object.fromEntries(
    p.ansi.map((color, i) => {
      const key = ansiNames[i % 8];
      return [i < 8 ? key : 'bright' + key[0].toUpperCase() + key.slice(1), color];
    })
  );
  const scheme = {
    name: p.label,
    background,
    foreground,
    cursorColor,
    selectionBackground,
    ...palette,
  };
  const starship = {
    ...palette,
    bg: background,
    fg: foreground,
    accent: p.ui.accent,
    muted: p.ui.fgMuted,
  };
  return {
    [`ghostty/${name}`]: [
      `background = ${background}`,
      `foreground = ${foreground}`,
      `cursor-color = ${cursorColor}`,
      `selection-background = ${selectionBackground}`,
      `selection-foreground = ${foreground}`,
      ...p.ansi.map((color, i) => `palette = ${i}=${color}`),
      '',
    ].join('\n'),
    [`windows-terminal/${name}.json`]: JSON.stringify(scheme, null, 2) + '\n',
    [`bat/${p.label}.tmTheme`]: syntax,
    [`yazi/${name}.yazi/flavor.toml`]: flavor(p),
    [`yazi/${name}.yazi/tmtheme.xml`]: syntax,
    [`starship/${name}.toml`]:
      `[palettes.${name}]\n` +
      Object.entries(starship)
        .map(([key, color]) => `${key} = "${color}"\n`)
        .join(''),
    [`lsd/${name}/colors.yaml`]: lsd(p),
    [`zsh/${name}.zsh`]: zsh(p),
  };
}

function outputs() {
  const files = {};
  for (const p of WOODFISH_PALETTES) {
    const { path: themePath } = contributes.themes.find(({ label }) => label === p.label);
    const file = path.join(vscode, themePath);
    Object.assign(files, render(p, parseJsonc(fs.readFileSync(file, 'utf8'))));
    const license = path.join(path.dirname(file), 'LICENSE.txt');
    files[`licenses/${p.slug}.txt`] = fs
      .readFileSync(fs.existsSync(license) ? license : path.join(vscode, '../../LICENSE'), 'utf8')
      .replace(/\r\n/g, '\n');
  }
  return files;
}

function main(check) {
  const files = outputs();
  const stale = [];
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(dist, name);
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== body)
        stale.push(name);
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, body);
    }
  }
  if (check && fs.existsSync(dist)) {
    for (const entry of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const name = path
        .relative(dist, path.join(entry.parentPath, entry.name))
        .split(path.sep)
        .join('/');
      if (!Object.hasOwn(files, name)) stale.push(name);
    }
  }
  if (stale.length)
    throw Error(
      `终端配色产物缺失、过期或多余，请运行 pnpm terminal:generate 并检查遗留文件：\n${stale.join('\n')}`
    );
  console.log(
    `${check ? '已核对' : '已生成'} ${WOODFISH_PALETTES.length} 套终端配色，${Object.keys(files).length} 个文件。`
  );
}

if (require.main === module) main(process.argv.includes('--check'));
module.exports = { opaque, render, tmTheme };
