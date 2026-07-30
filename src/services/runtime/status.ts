import { FeatureFlags, RuntimeStatusSnapshot } from '../../types/features';
import { isWoodfishTheme } from './themeRegistry';

type DeriveRuntimeStatusInput = {
  activeTheme: string;
  hasPayload: boolean;
  features: FeatureFlags;
};

function hasAnyVisibleEffect(features: FeatureFlags): boolean {
  return features.syntaxGradient || features.glow || features.cursor;
}

export function deriveRuntimeStatus({
  activeTheme,
  hasPayload,
  features,
}: DeriveRuntimeStatusInput): RuntimeStatusSnapshot {
  const isWoodfishThemeActive = isWoodfishTheme(activeTheme);

  if (isWoodfishThemeActive && hasPayload) {
    return {
      state: 'on',
      activeTheme,
      isWoodfishTheme: isWoodfishThemeActive,
      hasPayload,
    };
  }

  if (!isWoodfishThemeActive && hasAnyVisibleEffect(features)) {
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
