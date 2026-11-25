const { runInNewContext } = require('node:vm');
const core = require('@woodfish/theme-core');
const { runtimeAssets } = require('./runtimeAssets');

test('bundled JVM functions run the theme-core conversions on dark, light and chromatic inputs', () => {
  const assets = runtimeAssets();
  const scope = {};
  runInNewContext(assets['woodfish/theme-core.js'], scope);
  for (const color of ['#191c24', '#f8f8f2', '#d566ff', '#73ea4b']) {
    const rgb = core.requireCssColor(color);
    const { l, c, h } = core.rgbToOklch(rgb);
    expect(scope.WoodfishCore.oklch(rgb.r, rgb.g, rgb.b)).toEqual([l, c, h]);
    const back = core.gamutMapOklch({ l, c, h });
    expect(scope.WoodfishCore.rgb(l, c, h, true)).toEqual([back.r, back.g, back.b]);
  }
});
