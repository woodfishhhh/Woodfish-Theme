export type CssConfigKey = 'vscode_custom_css.imports' | 'custom_css_hot_reload.imports';

export type SupportedCssExtension =
  | {
      kind: 'custom-css';
      id: 'be5invis.vscode-custom-css';
      name: 'Custom CSS and JS Loader';
      configKey: 'vscode_custom_css.imports';
    }
  | {
      kind: 'hot-reload';
      id: 'bartag.custom-css-hot-reload';
      name: 'Custom CSS Hot Reload';
      configKey: 'custom_css_hot_reload.imports';
    };

