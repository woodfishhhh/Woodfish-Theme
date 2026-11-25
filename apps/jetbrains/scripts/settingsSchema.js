const { contributes } = require('../../vscode-extension/package.json');

// Keep the same setting IDs as VS Code. Only settings with a native consumer belong here.
const keys = [
  'overlay.style',
  'cursor.enabled',
  'cursor.gradientStops',
  'cursor.animationDuration',
  'cursor.borderRadius',
  'cursor.glow',
  'cursor.glowOpacity',
  'cursor.glowBlur',
  'effects.enabled',
  'caretTrail.enabled',
  'caretTrail.length',
  'caretTrail.style',
  'caretTrail.width',
  'caretTrail.color',
  'caretTrail.followTheme',
  'caretTrail.opacity',
  'caretTrail.sources',
  'typingParticles.enabled',
  'typingParticles.count',
  'typingParticles.size',
  'typingParticles.speed',
  'typingParticles.spread',
  'typingParticles.gravity',
  'typingParticles.life',
  'typingParticles.colors',
  'typingParticles.color',
  'typingParticles.sources',
  'typingParticles.shake',
  'background.enabled',
  'background.image',
  'background.opacity',
  'background.blur',
  'background.mask',
  'glass.enabled',
  'glass.targets',
  'glass.opacity',
  'glass.borderRadius',
  'squircleCorners.enabled',
];

function settingsSchema() {
  const properties = Object.assign(
    {},
    ...[contributes.configuration].flat().map((s) => s.properties)
  );
  const lines = [
    'keys=' + keys.join(','),
    'presetKeys=' + require('@woodfish/theme-core').PRESET_KEYS.join(','),
  ];
  for (const key of keys) {
    const setting = properties['woodfishTheme.' + key];
    if (!setting) throw Error('Missing VS Code setting ' + key);
    const value = [setting.default].flat().join(',');
    lines.push(key + '=' + value, key + '.type=' + setting.type);
    if (setting.minimum != null)
      lines.push(key + '.min=' + setting.minimum, key + '.max=' + setting.maximum);
    if (setting.enum) lines.push(key + '.enum=' + setting.enum.join(','));
  }
  const platformKeys = [
    'glass.blur',
    'glass.mode',
    'glass.saturate',
    'glass.noise',
    'glass.animations',
    'glass.reveal',
    'glass.nativeWindow.enabled',
    'glass.nativeWindow.windowsMaterial',
    'glass.nativeWindow.macVibrancy',
    'glass.nativeWindow.opacity',
    'syntaxGradient.customRules',
    'glow.customRules',
    'cursor.customRules',
    'runtime.fixChecksums',
  ];
  lines.push('platformKeys=' + platformKeys.join(','));
  for (const key of platformKeys)
    lines.push(key + '=' + JSON.stringify(properties['woodfishTheme.' + key].default));
  for (const palette of require('@woodfish/theme-core').WOODFISH_PALETTES) {
    for (const [key, value] of Object.entries(palette.meta?.runtime?.cursorDefaults ?? {})) {
      lines.push(
        'theme.' +
          palette.label.replaceAll(' ', '_') +
          '.cursor.' +
          key +
          '=' +
          [value].flat().join(',')
      );
    }
  }
  return lines.join('\n') + '\n';
}
module.exports = { settingsSchema };
