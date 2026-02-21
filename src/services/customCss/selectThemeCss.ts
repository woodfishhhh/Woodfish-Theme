import { FeatureFlags } from '../../types/features';
import { ThemePaths } from '../themePaths';

export function selectThemeCssPath(paths: ThemePaths, features: FeatureFlags): string {
  if (features.glow && features.rainbow) {
    return paths.themeAllCss;
  }
  if (features.glow) {
    return paths.themeGlowCss;
  }
  if (features.rainbow) {
    return paths.themeRainbowCss;
  }
  return paths.themeBaseCss;
}

