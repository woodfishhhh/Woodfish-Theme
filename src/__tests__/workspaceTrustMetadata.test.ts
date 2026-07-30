import * as fs from 'fs';
import * as path from 'path';

type ConfigurationProperty = {
  maxItems?: number;
  minItems?: number;
  items?: {
    maxLength?: number;
    pattern?: string;
  };
};

type ExtensionManifest = {
  capabilities?: {
    untrustedWorkspaces?: {
      supported?: boolean | 'limited';
      restrictedConfigurations?: string[];
    };
  };
  contributes: {
    configuration: {
      properties: Record<string, ConfigurationProperty>;
    };
  };
};

describe('workspace trust and runtime setting metadata', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
  ) as ExtensionManifest;

  it('restricts workspace-provided CSS and gradient values in Restricted Mode', () => {
    expect(manifest.capabilities?.untrustedWorkspaces).toMatchObject({
      supported: 'limited',
      restrictedConfigurations: [
        'woodfishTheme.syntaxGradient.customRules',
        'woodfishTheme.glow.customRules',
        'woodfishTheme.cursor.gradientStops',
        'woodfishTheme.cursor.customRules',
      ],
    });
  });

  it('mirrors runtime bounds and unsafe CSS guards in the settings schema', () => {
    const properties = manifest.contributes.configuration.properties;
    for (const setting of [
      'woodfishTheme.syntaxGradient.customRules',
      'woodfishTheme.glow.customRules',
      'woodfishTheme.cursor.customRules',
    ]) {
      expect(properties[setting]).toMatchObject({
        maxItems: 32,
        items: {
          maxLength: 4096,
        },
      });
      expect(properties[setting]?.items?.pattern).toContain('[uU][rR][lL]');
    }

    expect(properties['woodfishTheme.cursor.gradientStops']).toMatchObject({
      minItems: 2,
      maxItems: 16,
      items: {
        maxLength: 64,
      },
    });
  });
});
