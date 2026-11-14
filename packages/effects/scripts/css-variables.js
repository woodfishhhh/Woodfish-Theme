/*
 * Writes the parameter variable list in builtin/README.md from every shipped effect.json
 * (between the two markers). Run `node packages/effects/scripts/css-variables.js` after
 * changing a parameter; a test fails while the list is out of date.
 */
const fs = require('fs');
const path = require('path');
const { BUILTIN_ROOT, readBuiltinEffectFiles } = require('./files.js');

const README = path.join(BUILTIN_ROOT, 'README.md');
const START = '<!-- 参数变量清单：scripts/css-variables.js 按各效果的 effect.json 生成，别手改 -->';
const END = '<!-- 参数变量清单结束 -->';
const HOSTS = { codex: 'Codex', vscode: 'VS Code' };

const kebab = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function cssValue(spec, value) {
  if (spec.type === 'boolean') return value ? '1' : '0';
  if (spec.type === 'number') return `${value}${spec.unit || ''}`;
  return String(value);
}

/** A value other than the default, to show the format. */
function example(spec) {
  if (spec.type === 'boolean') return !spec.default;
  if (spec.type === 'color') return spec.default.toLowerCase() === '#ff4d4f' ? 'gold' : '#ff4d4f';
  if (spec.type === 'select') {
    const other = spec.options.map((o) => (typeof o === 'string' ? o : o.value));
    return other.find((value) => value !== spec.default) || spec.default;
  }
  const span = spec.max - spec.min;
  let value = spec.default + span / 4 <= spec.max ? spec.default + span / 4 : spec.default - span / 4;
  const step = spec.step || (span <= 2 ? 0.05 : 1);
  value = Math.round(value / step) * step;
  return Number(Math.min(spec.max, Math.max(spec.min, value)).toFixed(3));
}

function purpose(spec) {
  const text = [spec.label, spec.description].filter(Boolean).join('：');
  if (spec.type === 'number') return `${text}。范围 ${spec.min}–${spec.max}${spec.unit || ''}`;
  if (spec.type === 'boolean') return `${text}。1 开，0 关`;
  if (spec.type === 'color') return `${text}。写 #rrggbb、颜色名、rgb() 或 hsl()`;
  const options = spec.options.map((o) =>
    typeof o === 'string' ? `\`${o}\`` : `\`${o.value}\` ${o.label}`
  );
  return `${text}。可选 ${options.join('、')}`;
}

/** The generated part of README.md, markers included. */
function variableSection(files = readBuiltinEffectFiles()) {
  const effects = Object.keys(files)
    .filter((file) => /^[a-z][a-z0-9-]*\/effect\.json$/.test(file))
    .map((file) => ({ id: file.split('/')[0], manifest: JSON.parse(files[file]) }))
    .sort(
      (a, b) =>
        (a.manifest.order ?? 100) - (b.manifest.order ?? 100) || a.id.localeCompare(b.id)
    );
  const parts = [START];
  for (const { id, manifest } of effects) {
    const hosts = (manifest.hosts || Object.keys(HOSTS)).map((host) => HOSTS[host]).join('、');
    const state = manifest.enabled === false ? '，默认关闭' : '';
    parts.push(
      '',
      `### ${manifest.name}（\`${id}\`，${hosts}${state}）`,
      '',
      '| 变量 | 作用 | 默认值 | 示例 |',
      '| --- | --- | --- | --- |'
    );
    for (const [key, spec] of Object.entries(manifest.params || {})) {
      const name = `--woodfish-${id}-${kebab(key)}`;
      parts.push(
        `| \`${name}\` | ${cell(purpose(spec))} | \`${cssValue(spec, spec.default)}\` | \`${name}: ${cssValue(spec, example(spec))};\` |`
      );
    }
  }
  parts.push('', END);
  return parts.join('\n');
}

/** README.md with the generated part replaced. */
function renderReadme(current, files) {
  const start = current.indexOf(START);
  const end = current.indexOf(END);
  if (start < 0 || end < start) {
    throw new Error(`README.md 里缺少标记 ${START} … ${END}`);
  }
  return `${current.slice(0, start)}${variableSection(files)}${current.slice(end + END.length)}`;
}

if (require.main === module) {
  const current = fs.readFileSync(README, 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(README, renderReadme(current));
  console.log(`已更新 ${README}`);
}

module.exports = { README, renderReadme, variableSection };
