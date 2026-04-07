import { WOODFISH_THEME_NAME } from '../../constants/config';
import { FeatureFlags, RuntimeStatusSnapshot } from '../../types/features';

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
  const isWoodfishTheme = activeTheme === WOODFISH_THEME_NAME;

  if (isWoodfishTheme && hasPayload) {
    return {
      state: 'on',
      activeTheme,
      isWoodfishTheme,
      hasPayload,
    };
  }

  if (!isWoodfishTheme && hasAnyVisibleEffect(features)) {
    return {
      state: 'paused',
      activeTheme,
      isWoodfishTheme,
      hasPayload,
    };
  }

  return {
    state: 'off',
    activeTheme,
    isWoodfishTheme,
    hasPayload,
  };
}
