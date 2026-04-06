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
  setRuntimeEnabled,
} from '../config/featureFlags';

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

    expect(settings.runtime.enabled).toBe(true);
    expect(settings.syntaxGradient.enabled).toBe(true);
    expect(settings.glow.enabled).toBe(true);
    expect(settings.cursor.enabled).toBe(true);
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

  it('updates feature flags through fully qualified Woodfish setting keys', async () => {
    const configuration = createConfiguration();
    getConfigurationMock.mockReturnValue(configuration);

    await setFeatureFlag('glow', false);
    await setRuntimeEnabled(false);

    expect(configuration.update).toHaveBeenNthCalledWith(
      1,
      'woodfishTheme.glow.enabled',
      false,
      vscode.ConfigurationTarget.Global
    );
    expect(configuration.update).toHaveBeenNthCalledWith(
      2,
      'woodfishTheme.runtime.enabled',
      false,
      vscode.ConfigurationTarget.Global
    );
  });
});
