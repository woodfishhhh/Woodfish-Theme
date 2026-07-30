const mockReadRuntimeSettings = jest.fn();
const mockSetFeatureFlag = jest.fn().mockResolvedValue(undefined);
const mockToggleFeatureFlag = jest.fn().mockResolvedValue(true);
const mockOnThemeSettingsChanged = jest.fn(() => ({ dispose: jest.fn() }));

jest.mock('../config/featureFlags', () => ({
  onThemeSettingsChanged: mockOnThemeSettingsChanged,
  readRuntimeSettings: mockReadRuntimeSettings,
  setFeatureFlag: mockSetFeatureFlag,
  toggleFeatureFlag: mockToggleFeatureFlag,
}));

import { FeatureStateController } from '../config/featureState';
import { DEFAULT_RUNTIME_SETTINGS } from '../types/features';
import type { ThemeStatusBar } from '../ui/statusBar';

describe('FeatureStateController', () => {
  const statusBar = {
    update: jest.fn(),
  } as unknown as ThemeStatusBar;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadRuntimeSettings.mockReturnValue({
      syntaxGradient: {
        ...DEFAULT_RUNTIME_SETTINGS.syntaxGradient,
        customRules: [],
      },
      glow: {
        ...DEFAULT_RUNTIME_SETTINGS.glow,
        customRules: [],
      },
      cursor: {
        ...DEFAULT_RUNTIME_SETTINGS.cursor,
        gradientStops: [...DEFAULT_RUNTIME_SETTINGS.cursor.gradientStops],
        customRules: [],
      },
    });
  });

  it('derives feature flags from the settings snapshot without rereading configuration', () => {
    const controller = new FeatureStateController(statusBar);

    expect(mockReadRuntimeSettings).toHaveBeenCalledTimes(1);
    expect(controller.current()).toEqual({
      syntaxGradient: true,
      glow: true,
      cursor: true,
    });

    controller.refreshFromConfig();

    expect(mockReadRuntimeSettings).toHaveBeenCalledTimes(2);
  });
});
