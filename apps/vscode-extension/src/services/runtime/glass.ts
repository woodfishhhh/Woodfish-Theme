import { buildNoiseDataUri } from '@woodfish/renderer-runtime';
import { GlassSettings, GlassTargetKey } from '../../types/features';

/**
 * Frosted-glass layer for floating workbench widgets.
 *
 * VS Code 1.143+ ships its own frosted glass (`workbench.modernUIFrostedGlass`)
 * for the quick input, hovers, dialogs, notifications and the action widget: it
 * paints a `::before` layer with `backdrop-filter: blur(12px)` and turns the
 * widget's own theme background transparent. Woodfish cooperates with it:
 *
 * - surfaces VS Code already frosts keep the native layer; Woodfish only tunes
 *   its blur/saturation/grain and syncs `--modern-ui-glass-opacity`;
 * - when the native glass is off (or VS Code is older) Woodfish paints those
 *   surfaces itself;
 * - surfaces VS Code does not frost (menus, suggest, find, dropdowns, sticky
 *   scroll, …) are always handled by Woodfish.
 *
 * Like the native implementation it is skipped in high-contrast themes, behind
 * `@supports (backdrop-filter)` and when the OS asks for reduced transparency.
 * The tint is the active theme's own color via `color-mix`, so no
 * `workbench.colorCustomizations` edits are needed.
 */
type GlassTarget = {
  colorVariable: string;
  /** Elements Woodfish always paints. */
  selectors: string[];
  /** Elements VS Code's native frosted glass paints when `.modern-ui-frosted-glass` is on. */
  nativeSelectors?: string[];
  /** Descendants that paint their own opaque background over the glass. */
  transparentChildren?: string[];
  rounded?: string[];
};

export const NATIVE_GLASS_CLASS = 'modern-ui-frosted-glass';
const WORKBENCH = '.monaco-workbench:not(.hc-black):not(.hc-light)';

export const GLASS_TARGETS: Record<GlassTargetKey, GlassTarget> = {
  menu: {
    colorVariable: '--vscode-menu-background',
    selectors: [
      '.monaco-menu-container .monaco-scrollable-element',
      '.dropdownMenu',
      '.contextMenu',
    ],
    rounded: ['.monaco-menu-container', '.monaco-menu-container .monaco-scrollable-element'],
  },
  hover: {
    colorVariable: '--vscode-editorHoverWidget-background',
    selectors: ['.debug-hover-widget', '.monaco-editor-overlaymessage .message'],
    nativeSelectors: ['.monaco-hover'],
    transparentChildren: ['.monaco-resizable-hover', '.debug-hover-widget .monaco-list-rows'],
    rounded: ['.monaco-hover', '.debug-hover-widget'],
  },
  suggest: {
    colorVariable: '--vscode-editorSuggestWidget-background',
    selectors: ['.monaco-editor .suggest-widget', '.monaco-editor .suggest-details'],
    transparentChildren: [
      '.monaco-editor .suggest-widget .monaco-list-rows',
      '.monaco-editor .suggest-widget .monaco-list',
    ],
    rounded: ['.monaco-editor .suggest-widget', '.monaco-editor .suggest-details'],
  },
  quickInput: {
    colorVariable: '--vscode-quickInput-background',
    selectors: [],
    nativeSelectors: ['.quick-input-widget:not(.quick-input-widget-overlay)'],
    transparentChildren: [
      '.quick-input-widget .monaco-list-rows',
      '.quick-input-widget .quick-input-list .monaco-list',
    ],
    rounded: ['.quick-input-widget'],
  },
  notifications: {
    colorVariable: '--vscode-notifications-background',
    selectors: [],
    nativeSelectors: [
      '.notifications-center',
      '.notifications-toasts .notification-toast.notification-fade-in-done',
    ],
    transparentChildren: [
      '.notifications-list-container',
      '.notifications-center .monaco-list-rows',
    ],
    rounded: ['.notification-toast', '.notifications-center'],
  },
  editorWidget: {
    colorVariable: '--vscode-editorWidget-background',
    selectors: [
      '.monaco-editor .find-widget',
      '.monaco-editor .rename-box',
      '.simple-find-part',
      '.defineKeybindingWidget',
    ],
    nativeSelectors: ['.action-widget'],
    rounded: ['.monaco-editor .find-widget', '.action-widget', '.monaco-editor .rename-box'],
  },
  dropdown: {
    colorVariable: '--vscode-dropdown-background',
    selectors: ['.select-box-dropdown-list-container', '.select-box-details-pane'],
    transparentChildren: ['.select-box-dropdown-list-container .monaco-list-rows'],
  },
  breadcrumbPicker: {
    colorVariable: '--vscode-breadcrumbPicker-background',
    selectors: ['.monaco-breadcrumbs-picker > :not(.arrow)'],
    transparentChildren: ['.monaco-breadcrumbs-picker .monaco-list-rows'],
  },
  debugToolbar: {
    colorVariable: '--vscode-debugToolBar-background',
    selectors: ['.debug-toolbar'],
    rounded: ['.debug-toolbar'],
  },
  stickyScroll: {
    colorVariable: '--vscode-editorStickyScroll-background',
    selectors: ['.monaco-editor .sticky-widget', '.monaco-tree-sticky-container'],
    transparentChildren: ['.monaco-editor .sticky-widget > *', '.monaco-tree-sticky-container > *'],
  },
  paneHeader: {
    colorVariable: '--vscode-sideBarSectionHeader-background',
    selectors: ['.pane-header.expanded'],
  },
  dialog: {
    colorVariable: '--vscode-editorWidget-background',
    selectors: [],
    nativeSelectors: ['.monaco-dialog-box'],
    rounded: ['.monaco-dialog-box'],
  },
};

/**
 * Entrance animations for transient surfaces that VS Code does not animate
 * itself. The quick input (1.143+ `quick-input-widget-open`), the action widget
 * and notification toasts already have native motion, so they are left alone.
 * Timing reuses VS Code's own curve so everything moves the same way.
 */
const ANIMATED_WIDGETS: Array<{ selector: string; keyframes: string; duration: number }> = [
  { selector: '.monaco-menu-container', keyframes: 'woodfishGlassDrop', duration: 200 },
  { selector: '.monaco-hover', keyframes: 'woodfishGlassFade', duration: 150 },
  { selector: '.monaco-editor .suggest-widget', keyframes: 'woodfishGlassFade', duration: 150 },
  { selector: '.monaco-dialog-box', keyframes: 'woodfishGlassZoom', duration: 250 },
  {
    selector: '.select-box-dropdown-list-container',
    keyframes: 'woodfishGlassDrop',
    duration: 200,
  },
];

const MOTION_CURVE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** VS Code adds this class when `workbench.reduceMotion` is on (or follows the OS). */
export const REDUCED_MOTION_CLASS = '.monaco-workbench.monaco-reduce-motion';

const REVEAL_SELECTOR = '[data-woodfish-reveal="true"]';

function formatNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

export { buildNoiseDataUri };

function buildGlassVariables(settings: GlassSettings): string {
  const blurFilter =
    settings.mode === 'acrylic'
      ? `url(#woodfish-acrylic) saturate(${formatNumber(settings.saturate)}%)`
      : `blur(${formatNumber(settings.blur)}px) saturate(${formatNumber(settings.saturate)}%)`;

  return [
    ':root {',
    `  --woodfish-glass-filter: ${blurFilter};`,
    `  --woodfish-glass-blur: ${formatNumber(settings.blur)};`,
    `  --woodfish-glass-opacity: ${formatNumber(settings.opacity * 100)}%;`,
    `  --woodfish-glass-noise: ${settings.noise > 0 ? buildNoiseDataUri(settings.noise) : 'none'};`,
    `  --woodfish-glass-mode: ${settings.mode};`,
    `  --woodfish-reveal-enabled: ${settings.reveal ? 1 : 0};`,
    '  --woodfish-reveal-color: rgb(255 255 255 / 9%);',
    '  --woodfish-reveal-size: 120px;',
    '}',
    '.monaco-workbench.vs {',
    '  --woodfish-reveal-color: rgb(0 0 0 / 6%);',
    '}',
  ].join('\n');
}

function scoped(selectors: string[], scope = ''): string {
  return selectors.map((selector) => `${WORKBENCH}${scope} ${selector}`).join(',\n');
}

function paintRule(selectorList: string, colorVariable: string): string {
  return [
    `${selectorList} {`,
    `  background-color: var(${colorVariable}) !important;`,
    `  background-color: color-mix(in srgb, var(${colorVariable}) var(--woodfish-glass-opacity), transparent) !important;`,
    '  background-image: var(--woodfish-glass-noise) !important;',
    '  -webkit-backdrop-filter: var(--woodfish-glass-filter) !important;',
    '  backdrop-filter: var(--woodfish-glass-filter) !important;',
    '}',
  ].join('\n');
}

function buildTargetCss(target: GlassTarget, radius: number): string {
  const parts: string[] = [];
  if (target.selectors.length > 0) {
    parts.push(paintRule(scoped(target.selectors), target.colorVariable));
  }

  const native = target.nativeSelectors ?? [];
  if (native.length > 0) {
    // VS Code's own frosted glass is off or unavailable: paint these surfaces too.
    parts.push(paintRule(scoped(native, `:not(.${NATIVE_GLASS_CLASS})`), target.colorVariable));
    // VS Code's own frosted glass is on: keep its layer, only strengthen it.
    parts.push(
      [
        `${native.map((selector) => `${WORKBENCH}.${NATIVE_GLASS_CLASS} ${selector}::before`).join(',\n')} {`,
        '  background-image: var(--woodfish-glass-noise) !important;',
        '  -webkit-backdrop-filter: var(--woodfish-glass-filter) !important;',
        '  backdrop-filter: var(--woodfish-glass-filter) !important;',
        '}',
      ].join('\n')
    );
  }

  if (target.transparentChildren && target.transparentChildren.length > 0) {
    parts.push(
      [
        `${scoped(target.transparentChildren)} {`,
        '  background-color: transparent !important;',
        '}',
      ].join('\n')
    );
  }

  if (radius > 0 && target.rounded && target.rounded.length > 0) {
    parts.push(
      [
        `${scoped(target.rounded)} {`,
        `  border-radius: ${formatNumber(radius)}px !important;`,
        '}',
      ].join('\n')
    );
  }

  return parts.join('\n\n');
}

function buildAnimationCss(): string {
  const keyframes = [
    '@keyframes woodfishGlassDrop {',
    '  from { opacity: 0; transform: translateY(-6px) scale(0.985); }',
    '  to { opacity: 1; transform: none; }',
    '}',
    '@keyframes woodfishGlassFade {',
    '  from { opacity: 0; }',
    '  to { opacity: 1; }',
    '}',
    '@keyframes woodfishGlassZoom {',
    '  from { opacity: 0; transform: scale(0.97); }',
    '  to { opacity: 1; transform: none; }',
    '}',
    '@keyframes woodfishGlassDim {',
    '  from { background-color: transparent; }',
    '}',
  ].join('\n');

  const rules = ANIMATED_WIDGETS.map(
    ({ selector, keyframes: name, duration }) =>
      `${selector} {\n  animation: ${name} ${duration}ms ${MOTION_CURVE} backwards;\n}`
  );
  rules.push(
    '.monaco-workbench .dimmed {\n  animation: woodfishGlassDim 200ms linear backwards;\n}'
  );

  const animated = [
    ...ANIMATED_WIDGETS.map(({ selector }) => selector),
    '.monaco-workbench .dimmed',
  ];
  const reducedMotion = [
    `${animated.map((selector) => `${REDUCED_MOTION_CLASS} ${selector.replace(/^\.monaco-workbench /, '')}`).join(',\n')} {`,
    '  animation: none !important;',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    `  ${animated.join(',\n  ')} {`,
    '    animation: none !important;',
    '  }',
    '}',
  ].join('\n');

  return [keyframes, ...rules, reducedMotion].join('\n\n');
}

function buildRevealCss(): string {
  return [
    `${REVEAL_SELECTOR} {`,
    '  background-image: radial-gradient(',
    '    circle var(--woodfish-reveal-size) at var(--woodfish-reveal-x, 50%) var(--woodfish-reveal-y, 50%),',
    '    var(--woodfish-reveal-color),',
    '    transparent 100%',
    '  ) !important;',
    '}',
    `${REDUCED_MOTION_CLASS} ${REVEAL_SELECTOR} {`,
    '  background-image: none !important;',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    `  ${REVEAL_SELECTOR} {`,
    '    background-image: none !important;',
    '  }',
    '}',
  ].join('\n');
}

export function buildGlassCss(settings: GlassSettings): string {
  if (!settings.enabled) {
    return '';
  }

  const surfaces = [
    // Woodfish's opacity also drives VS Code's native glass so both look the same.
    `${WORKBENCH}.${NATIVE_GLASS_CLASS} {\n  --modern-ui-glass-opacity: var(--woodfish-glass-opacity) !important;\n}`,
    ...settings.targets.map((key) => buildTargetCss(GLASS_TARGETS[key], settings.borderRadius)),
  ].join('\n\n');
  const parts = [
    buildGlassVariables(settings),
    [
      '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {',
      '@media not (prefers-reduced-transparency: reduce) {',
      surfaces,
      '}',
      '}',
    ].join('\n'),
  ];
  if (settings.animations) {
    parts.push(buildAnimationCss());
  }
  if (settings.reveal) {
    parts.push(buildRevealCss());
  }

  return parts.join('\n\n');
}

type NativePart = { selectors: string[]; colorVariable: string };

const NATIVE_PARTS: NativePart[] = [
  {
    colorVariable: '--vscode-editor-background',
    selectors: [
      '.monaco-workbench .part.editor > .content',
      '.monaco-workbench .editor-group-container',
      '.monaco-editor',
      '.monaco-editor-background',
      '.monaco-editor .margin',
      '.monaco-workbench .part.editor > .content .editor-group-container > .editor-container',
    ],
  },
  {
    colorVariable: '--vscode-editorGroupHeader-tabsBackground',
    selectors: [
      '.monaco-workbench .part.editor > .content .editor-group-container > .title',
      '.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-and-actions-container',
    ],
  },
  {
    colorVariable: '--vscode-tab-inactiveBackground',
    selectors: ['.monaco-workbench .tabs-container > .tab:not(.active)'],
  },
  {
    colorVariable: '--vscode-tab-activeBackground',
    selectors: ['.monaco-workbench .tabs-container > .tab.active'],
  },
  {
    colorVariable: '--vscode-sideBar-background',
    selectors: ['.monaco-workbench .part.sidebar', '.monaco-workbench .part.auxiliarybar'],
  },
  {
    colorVariable: '--vscode-activityBar-background',
    selectors: ['.monaco-workbench .part.activitybar'],
  },
  {
    colorVariable: '--vscode-panel-background',
    selectors: ['.monaco-workbench .part.panel'],
  },
  {
    colorVariable: '--vscode-statusBar-background',
    selectors: ['.monaco-workbench .part.statusbar'],
  },
  {
    colorVariable: '--vscode-titleBar-activeBackground',
    selectors: ['.monaco-workbench .part.titlebar'],
  },
];

/**
 * When the experimental native window material is on, the Electron window is
 * transparent and the OS draws vibrancy/acrylic/mica behind it; the workbench
 * parts must then become translucent so the material can show through.
 */
export function isNativeWindowActive(
  settings: GlassSettings,
  platform: typeof process.platform = process.platform
): boolean {
  return (
    settings.enabled &&
    settings.nativeWindow.enabled &&
    (platform === 'darwin' || platform === 'win32')
  );
}

export function buildNativeWindowCss(
  settings: GlassSettings,
  platform: typeof process.platform = process.platform
): string {
  if (!isNativeWindowActive(settings, platform)) {
    return '';
  }

  const opacity = `${formatNumber(settings.nativeWindow.opacity * 100)}%`;
  const parts = [
    ['html,', 'body,', '.monaco-workbench {', '  background: transparent !important;', '}'].join(
      '\n'
    ),
  ];
  for (const part of NATIVE_PARTS) {
    parts.push(
      [
        `${part.selectors.join(',\n')} {`,
        `  background-color: color-mix(in srgb, var(${part.colorVariable}) ${opacity}, transparent) !important;`,
        '}',
      ].join('\n')
    );
  }
  parts.push(
    [
      '.monaco-editor .minimap canvas:not(.minimap-decorations-layer) {',
      `  opacity: ${formatNumber(Math.max(0.4, settings.nativeWindow.opacity))};`,
      '}',
    ].join('\n')
  );

  return ['@media not (prefers-reduced-transparency: reduce) {', parts.join('\n\n'), '}'].join(
    '\n'
  );
}
