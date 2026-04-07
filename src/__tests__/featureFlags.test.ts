jest.mock(
  'vscode',
  () => ({
    workspace: {
      getConfiguration: jest.fn(),
    },
    ConfigurationTarget: {
      Global: 'global',
    },
  }),
  { virtual: true }
);

import * as vscode from 'vscode';
import {
  readRuntimeSettings,
  setFeatureFlag,
} from '../config/featureFlags';
import { CONFIG_SECTION } from '../constants/config';

type MockConfiguration = {
  get: jest.Mock;
  update: jest.Mock;
};

function createConfiguration(values: Record<string, unknown> = {}): MockConfiguration {
  return {
    get: jest.fn((key: string, fallback: unknown) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback
    ),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

describe('featureFlags config access', () => {
  const getConfigurationMock = vscode.workspace.getConfiguration as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads defaults through fully qualified Woodfish setting keys', () => {
    const configuration = createConfiguration();
    getConfigurationMock.mockReturnValue(configuration);

    const settings = readRuntimeSettings();

    expect(settings.syntaxGradient.enabled).toBe(true);
    expect((settings.syntaxGradient as Record<string, unknown>).preset).toBeUndefined();
    expect(settings.glow.enabled).toBe(true);
    expect(settings.cursor.enabled).toBe(true);
    expect((settings as Record<string, unknown>).runtime).toBeUndefined();
    expect(getConfigurationMock).toHaveBeenCalledWith();
    expect(configuration.get).toHaveBeenCalledWith('woodfishTheme.glow.enabled', true);
    expect(configuration.get).not.toHaveBeenCalledWith('glow.enabled', true);
  });

  it('prefers explicit fully qualified user values when present', () => {
    const configuration = createConfiguration({
      'woodfishTheme.glow.enabled': false,
      'woodfishTheme.cursor.enabled': false,
    });
    getConfigurationMock.mockReturnValue(configuration);

    const settings = readRuntimeSettings();

    expect(settings.glow.enabled).toBe(false);
    expect(settings.cursor.enabled).toBe(false);
  });

  it('updates only retained feature flags through the woodfishTheme section keys', async () => {
    const configuration = createConfiguration();
    getConfigurationMock.mockImplementation((section?: string) =>
      section === CONFIG_SECTION ? configuration : createConfiguration()
    );

    await setFeatureFlag('glow', false);

    expect(configuration.update).toHaveBeenCalledTimes(1);
    expect(configuration.update).toHaveBeenCalledWith(
      'glow.enabled',
      false,
      vscode.ConfigurationTarget.Global
    );
  });

  it('writes retained setting updates through the woodfishTheme section', async () => {
    const rootConfiguration = createConfiguration();
    const themeConfiguration = createConfiguration();

    getConfigurationMock.mockImplementation((section?: string) =>
      section === CONFIG_SECTION ? themeConfiguration : rootConfiguration
    );

    await setFeatureFlag('glow', false);

    expect(getConfigurationMock).toHaveBeenCalledWith(CONFIG_SECTION);
    expect(themeConfiguration.update).toHaveBeenCalledTimes(1);
    expect(themeConfiguration.update).toHaveBeenCalledWith(
      'glow.enabled',
      false,
      vscode.ConfigurationTarget.Global
    );
    expect(rootConfiguration.update).not.toHaveBeenCalled();
  });
});
