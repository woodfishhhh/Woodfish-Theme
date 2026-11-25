const path = require('node:path');
const { buildSync } = require('esbuild');
const core = require('@woodfish/theme-core');

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
    neutralThreshold: core.NEUTRAL_CHROMA_THRESHOLD,
    anchorHue: core.DEFAULT_ANCHOR_HUE,
  };
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
    'woodfish/defaults.properties':
      Object.entries(values)
        .map(([k, v]) => k + '=' + v)
        .join('\n') + '\n',
  };
}
module.exports = { runtimeAssets };
