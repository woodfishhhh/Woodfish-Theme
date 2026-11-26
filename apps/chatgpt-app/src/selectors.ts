/*
 * Codex renderer hooks, verified against the Store build listed in TESTED_CODEX_VERSIONS
 * (see docs/hosts/chatgpt-app.md). Only stable data-* attributes, roles and custom element
 * names are used; hashed CSS-module classes are deliberately avoided.
 */

export interface SelectorGroup {
  /** Selectors joined with `,`; any match counts. */
  readonly selectors: readonly string[];
  /**
   * Whether the group must match on every screen. Contextual groups (code blocks,
   * menus) are legitimately absent until the user opens them.
   */
  readonly alwaysPresent: boolean;
  readonly description: string;
}

/*
 * Codex paints and rounds the composer on one element, and which one depends on the page: in
 * a thread it is the layout root (`[data-composer-surface-variant]`, carrying the radius, the
 * background and, for long drafts, `overflow: auto`); on the new-chat page the root has no
 * surface at all and the inner `[data-composer-body]` carries them. Anything Woodfish draws
 * on the composer's shape (window background, focus glow) goes on that element, so Codex's
 * own radius variables round it and nothing clips it.
 */
const COMPOSER_ROOT = '[data-codex-composer-root]';
const NEW_CHAT = '[data-composer-utility-bar-variant="home"]';
const composerSurfaceOf = (variant: string): readonly string[] => [
  `${COMPOSER_ROOT} ${variant}:not(${NEW_CHAT})`,
  `${COMPOSER_ROOT} ${variant}${NEW_CHAT} [data-composer-body]`,
];

const floatingSurfaces = [
  '[popover] > [data-anchor-positioning="native"]',
  '[popover][data-anchor-positioning="native"]',
  '[data-radix-popper-content-wrapper] > *',
  'div[role="tooltip"][id]',
  '[data-slot="popover-content"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="dialog"]',
  '[data-sonner-toast]',
  '[data-composer-overlay-floating-ui="true"] > *',
].join(', ');

export const CODEX_SELECTORS = {
  appShell: {
    selectors: ['[data-app-shell-main-surface]'],
    alwaysPresent: true,
    description: '主界面',
  },
  backgroundSurface: {
    selectors: [
      '[data-app-shell-surface-backing]',
      '.messaging-root.messaging-embedded',
      '.messaging-root.messaging-embedded .thread-pane',
    ],
    alwaysPresent: false,
    description: '聊天壳层底板',
  },
  page: {
    // Pages other than the thread (Settings, plugins) paint the surface on this container.
    selectors: ['[data-codex-history-swipe-page] > .electron\\:bg-surface'],
    alwaysPresent: false,
    description: '设置等页面',
  },
  sidebar: {
    selectors: ['[data-sidebar-navigation-root]'],
    alwaysPresent: false,
    description: '侧栏',
  },
  sidebarThreadRow: {
    selectors: ['[data-app-action-sidebar-thread-row]'],
    alwaysPresent: false,
    description: '侧栏会话',
  },
  sidebarActiveThread: {
    selectors: ['[data-app-action-sidebar-thread-active="true"]'],
    alwaysPresent: false,
    description: '当前会话',
  },
  sidebarRunningThread: {
    // Codex shows a spinner (Tailwind `motion-safe:animate-spin`) while a thread runs.
    selectors: ['[data-app-action-sidebar-thread-row]:has(.motion-safe\\:animate-spin)'],
    alwaysPresent: false,
    description: '运行中的会话',
  },
  // The composer is absent on settings, plugin and other non-chat pages.
  composer: {
    selectors: ['[data-codex-composer-root]'],
    alwaysPresent: false,
    description: '输入框',
  },
  composerSurface: {
    selectors: [
      `${COMPOSER_ROOT} [data-composer-surface-variant]:not(${NEW_CHAT})`,
      `${COMPOSER_ROOT} ${NEW_CHAT} [data-composer-body]`,
    ],
    alwaysPresent: false,
    description: '输入框外框（Codex 画背景和圆角的那一层）',
  },
  circularControls: {
    selectors: [
      '.rounded-full',
      '[role="switch"]',
      '[role="radio"]',
      '[data-slot="avatar"]',
      '[data-slot="badge"]',
      '[data-slot="switch-thumb"]',
      '[data-avatar]',
      '[data-codex-composer-root] [data-composer-utility-bar-variant="home"] [data-composer-body][data-composer-layout="single-line"]',
      'input[type="radio"]',
    ],
    alwaysPresent: false,
    description: '保留圆弧的头像、徽标、开关和胶囊',
  },
  roundedComposer: {
    // The default single-line layout uses --radius-full; keep its circular ends.
    selectors: [
      `${COMPOSER_ROOT} [data-composer-surface-variant]:not(${NEW_CHAT}):is([data-composer-layout="multiline"], [data-composer-radius-variant="compact"], [data-composer-radius-variant="large"])`,
      `${COMPOSER_ROOT} ${NEW_CHAT} [data-composer-body][data-composer-layout="multiline"]`,
    ],
    alwaysPresent: false,
    description: '非胶囊形的输入框表面',
  },
  composerEditor: {
    selectors: ['[data-codex-composer-root] [contenteditable="true"]'],
    alwaysPresent: false,
    description: '输入框编辑区',
  },
  composerPrimaryButton: {
    // Tailwind utility generated from the theme variable, not a hashed module class.
    selectors: ['[data-codex-composer-root] .bg-composer-primary'],
    alwaysPresent: false,
    description: '发送按钮',
  },
  timeline: {
    selectors: ['[data-app-action-timeline-scroll]'],
    alwaysPresent: false,
    description: '对话内容',
  },
  userMessage: {
    selectors: ['[data-user-message-bubble]'],
    alwaysPresent: false,
    description: '用户消息',
  },
  assistantMarkdown: {
    selectors: ['[data-markdown-text-style="assistant-message"]'],
    alwaysPresent: false,
    description: '助手回复',
  },
  codeBlockSource: {
    selectors: ['[data-code-block-source="true"]'],
    alwaysPresent: false,
    description: '代码块',
  },
  codeToken: {
    selectors: ['[data-code-block-source="true"] code span'],
    alwaysPresent: false,
    description: '代码 token',
  },
  diff: {
    selectors: ['diffs-container'],
    alwaysPresent: false,
    description: 'diff 视图',
  },
  activeTab: {
    // Tabs of the right-hand panel (Changes, files, browser).
    selectors: ['[data-app-shell-tab-controller] [role="tab"][aria-selected="true"]'],
    alwaysPresent: false,
    description: '当前标签页',
  },
  revealTarget: {
    selectors: [
      '[data-app-action-sidebar-thread-row]',
      '[data-app-action-sidebar-project-row]',
      'nav[data-app-navigation-rail] button',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="tab"]',
    ],
    alwaysPresent: false,
    description: '跟随指针柔光的列表项与按钮',
  },
  composerMenuHeader: {
    // Section headers of the / and @ menu: opaque strips inside the floating panel.
    selectors: [
      '[data-composer-overlay-floating-ui="true"] [data-mention-section-id] > :not([data-mention-section-items])',
    ],
    alwaysPresent: false,
    description: '输入框菜单分组标题',
  },
  // Codex's own fades and the strip behind the composer, which the window background
  // turns into blur-only bands (content scrolls under them).
  mainTopFade: {
    selectors: ['[data-app-shell-main-content-top-fade] > [aria-hidden="true"]'],
    alwaysPresent: false,
    description: '主区顶部渐隐',
  },
  threadFooter: {
    selectors: ['[data-thread-scroll-footer] > .bg-surface.pointer-events-none'],
    alwaysPresent: false,
    description: '输入框后方的底条',
  },
  composerLayout: {
    selectors: [
      `${COMPOSER_ROOT} [data-composer-surface-variant="default"]`,
      `${COMPOSER_ROOT} [data-composer-surface-variant="opaque"]`,
    ],
    alwaysPresent: false,
    description: '输入框底板（Codex 的颜色变量所在的层）',
  },
  composerFill: {
    selectors: [
      ...composerSurfaceOf('[data-composer-surface-variant="default"]'),
      ...composerSurfaceOf('[data-composer-surface-variant="opaque"]'),
    ],
    alwaysPresent: false,
    description: '输入框底板上的窗口背景',
  },
  floatingLayer: {
    // Positioning wrappers can also carry a dialog role or popover slot.
    selectors: [
      `:is(${floatingSurfaces}):not([popover]:has(> [data-anchor-positioning="native"]), [data-radix-popper-content-wrapper], [data-composer-overlay-floating-ui="true"])`,
    ],
    alwaysPresent: false,
    description: '菜单与浮层',
  },
} as const satisfies Record<string, SelectorGroup>;

export type CodexSelectorGroup = keyof typeof CODEX_SELECTORS;

/** The comma-joined selector list of a group. */
export function selectorOf(group: CodexSelectorGroup): string {
  return CODEX_SELECTORS[group].selectors.join(', ');
}

/** Tokens painted by the code gradient engine. */
export const CODE_TOKEN_SELECTOR = selectorOf('codeToken');
/** Roots observed by the code gradient engine. */
export const CODE_ROOT_SELECTOR = selectorOf('codeBlockSource');
/** Assistant text blocks painted when the optional body gradient is on. */
export const BODY_TEXT_SELECTOR = [
  'p',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'td',
  'th',
]
  .map((tag) => `[data-markdown-text-style="assistant-message"] ${tag}`)
  .join(', ');
/** Roots observed by the body gradient engine. */
export const BODY_ROOT_SELECTOR = selectorOf('assistantMarkdown');
