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

test('uses the VS Code squircleCorners setting and its declared default', () => {
  const { contributes } = require('../../vscode-extension/package.json');
  const key = 'squircleCorners.enabled';
  const setting = [contributes.configuration]
    .flat()
    .map(({ properties }) => properties['woodfishTheme.' + key])
    .find(Boolean);
  expect(setting).toMatchObject({ type: 'boolean', default: true });
  const lines = runtimeAssets()['woodfish/settings.properties'].split('\n');
  expect(lines[0].slice('keys='.length).split(',')).toContain(key);
  expect(lines).toContain(key + '=' + setting.default);
  expect(lines).toContain(key + '.type=' + setting.type);
});

test('every VS Code setting is either editable with its source default or documented as platform-specific', () => {
  const { contributes } = require('../../vscode-extension/package.json');
  const props = Object.assign(
    {},
    ...[contributes.configuration].flat().map((section) => section.properties)
  );
  const properties = runtimeAssets()['woodfish/settings.properties'];
  const schema = Object.fromEntries(
    properties
      .trim()
      .split('\n')
      .map((line) => line.split('='))
  );
  const native = schema.keys.split(',');
  const described = schema.platformKeys.split(',');
  const separate = [
    'overlay.enabled',
    'syntaxGradient.enabled',
    'glow.enabled',
    'overlay.hueShift',
    'overlay.lightnessDelta',
    'overlay.neutralChroma',
    'overlay.angle',
    'glow.intensity',
    'presets.custom',
  ];
  expect([...native, ...described, ...separate].sort()).toEqual(
    Object.keys(props)
      .map((key) => key.slice('woodfishTheme.'.length))
      .sort()
  );
  for (const key of native)
    expect(schema[key]).toBe([props['woodfishTheme.' + key].default].flat().join(','));
  for (const key of described)
    expect(JSON.parse(schema[key])).toEqual(props['woodfishTheme.' + key].default);
  const fs = require('node:fs');
  const path = require('node:path');
  const keys = (suffix) =>
    fs
      .readFileSync(
        path.join(
          __dirname,
          '../src/main/resources/messages/WoodfishBundle' + suffix + '.properties'
        ),
        'utf8'
      )
      .trim()
      .split('\n')
      .map((line) => line.split('=')[0])
      .sort();
  expect(keys('_zh')).toEqual(keys(''));
  expect(keys('')).toEqual(expect.arrayContaining(native));
});
