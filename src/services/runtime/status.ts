import { FeatureFlags, RuntimeStatusSnapshot } from '../../types/features';
import { isWoodfishTheme } from './themeRegistry';

type DeriveRuntimeStatusInput = {
  activeTheme: string;
  hasPayload: boolean;
  features: FeatureFlags;
  overlayEnabled: boolean;
};

function hasAnyVisibleEffect(features: FeatureFlags): boolean {
  return features.syntaxGradient || features.glow || features.cursor;
}

export function deriveRuntimeStatus({
  activeTheme,
  hasPayload,
  features,
  overlayEnabled,
}: DeriveRuntimeStatusInput): RuntimeStatusSnapshot {
  const isWoodfishThemeActive = isWoodfishTheme(activeTheme);
  const shouldBeActive = overlayEnabled && hasAnyVisibleEffect(features);

  if (shouldBeActive && hasPayload) {
    return {
      state: 'on',
      activeTheme,
      isWoodfishTheme: isWoodfishThemeActive,
      hasPayload,
    };
  }

  if (shouldBeActive) {
    return {
      state: 'paused',
      activeTheme,
      isWoodfishTheme: isWoodfishThemeActive,
      hasPayload,
    };
  }

  return {
    state: 'off',
    activeTheme,
    isWoodfishTheme: isWoodfishThemeActive,
    hasPayload,
  };
}
