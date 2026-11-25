const path = require('node:path');
const { buildSync } = require('esbuild');
const core = require('@woodfish/theme-core');
const { settingsSchema } = require('./settingsSchema');

function tokenCharacterSets() {
  const punctuation = [],
    trim = [];
  for (let code = 0; code <= 0xffff; code++) {
    const ch = String.fromCharCode(code);
    if (core.isPunctuationOnly(ch)) punctuation.push(code);
    else if (core.isPunctuationOnly(ch + '!')) trim.push(code);
  }
  return { 'text.punctuation': punctuation.join(','), 'text.trim': trim.join(',') };
}

function runtimeAssets() {
  const js = buildSync({
    entryPoints: [path.join(__dirname, 'runtime/bridge.ts')],
    bundle: true,
    format: 'iife',
    target: 'es2016',
    minify: true,
    legalComments: 'none',
    write: false,
  }).outputFiles[0].text;
  const values = {
    ...tokenCharacterSets(),
    neutralThreshold: core.NEUTRAL_CHROMA_THRESHOLD,
    anchorHue: core.DEFAULT_ANCHOR_HUE,
  };
  for (const [key, limit] of Object.entries(core.BACKGROUND_IMAGE_LIMITS))
    values['image.' + key] = limit;
  for (const [key, radius] of Object.entries(core.GLOW_RADII)) values['radius.' + key] = radius;
  for (const [group, defaults, ranges] of [
    ['overlay', core.DEFAULT_TEXT_GRADIENT, core.TEXT_GRADIENT_RANGES],
    ['glow', core.DEFAULT_GLOW, core.GLOW_RANGES],
  ]) {
    for (const [key, value] of Object.entries(defaults)) {
      values[group + '.' + key] = value;
      values[group + '.' + key + '.min'] = ranges[key].minimum;
      values[group + '.' + key + '.max'] = ranges[key].maximum;
    }
  }
  return {
    'woodfish/theme-core.js': js,
    'woodfish/settings.properties': settingsSchema(),
    'woodfish/presets.json': JSON.stringify(core.BUILT_IN_PRESETS, null, 2) + '\n',
    'woodfish/defaults.properties':
      Object.entries(values)
        .map(([k, v]) => k + '=' + v)
        .join('\n') + '\n',
  };
}
module.exports = { runtimeAssets };
