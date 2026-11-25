/*
 * dsh Web UI hooks, verified against the releases in TESTED_DSH_VERSIONS (see
 * docs/hosts/dsh-web.md). dsh styles its components with hashed CSS-module classes
 * (`uV2eYG_card`, `_block_7gxqk_4`); none are used here. Only data-* attributes, ARIA
 * roles and the class names of libraries (`pre.shiki`) appear. Colors and the frosted
 * menus are themed through dsh's own CSS variables, which need no selectors at all.
 */

export interface SelectorGroup {
  /** Selectors joined with `,`; any match counts. */
  readonly selectors: readonly string[];
  /**
   * Whether the group must match on every screen. Contextual groups (code blocks, the
   * composer) are legitimately absent until the user opens a conversation.
   */
  readonly alwaysPresent: boolean;
  readonly description: string;
}

const SESSION_ROW = '[role="tree"] [role="treeitem"][data-row-key^="session:"]';
const ASSISTANT_STEP = '[data-chat-flow-kind="assistant-step"]';

export const DSH_SELECTORS = {
  // Set by dsh's theme bootstrap before any plugin loads; it identifies a dsh page.
  page: {
    selectors: ['html[data-ds-theme-source]'],
    alwaysPresent: true,
    description: 'dsh 页面',
  },
  appRoot: {
    selectors: ['[data-slot="root"]'],
    alwaysPresent: true,
    description: '主界面',
  },
  // The window frame under the sidebar and the conversation (`[data-slot]` wrappers are
  // `display: contents`, so the painted element is the slot's child).
  frame: {
    selectors: ['[data-slot="root"] > *'],
    alwaysPresent: true,
    description: '窗口框架',
  },
  sidebar: {
    selectors: ['[data-slot="sidebar"] > *'],
    alwaysPresent: false,
    description: '侧栏',
  },
  // The column holding the sidebar paints the same color under it.
  sidebarColumn: {
    selectors: [':has(> [data-slot="sidebar"])'],
    alwaysPresent: false,
    description: '侧栏所在的列',
  },
  sessionRow: {
    selectors: [SESSION_ROW],
    alwaysPresent: false,
    description: '会话行',
  },
  activeSession: {
    selectors: [`${SESSION_ROW}[aria-selected="true"]`],
    alwaysPresent: false,
    description: '当前会话',
  },
  // A session that is generating shows a spinner with `data-state="ongoing"`.
  runningSession: {
    selectors: [`${SESSION_ROW}:has([data-state="ongoing"])`],
    alwaysPresent: false,
    description: '运行中的会话',
  },
  // 「对话 / 轨迹」 and the tabs of the right panel.
  activeTab: {
    selectors: [
      '[data-conversation-tabs] [role="tab"][aria-selected="true"]',
      '[data-dockkit-strip] [role="tab"][aria-selected="true"]',
    ],
    alwaysPresent: false,
    description: '当前标签',
  },
  timeline: {
    selectors: ['[data-chat-flow]'],
    alwaysPresent: false,
    description: '对话流',
  },
  // The sticky strip at the bottom of a conversation that holds the composer.
  composerSeat: {
    selectors: ['[data-composer-seat]'],
    alwaysPresent: false,
    description: '输入框底栏',
  },
  composer: {
    selectors: ['[data-composer-card]'],
    alwaysPresent: false,
    description: '输入框',
  },
  composerEditor: {
    selectors: ['[data-composer-input]'],
    alwaysPresent: false,
    description: '输入框编辑区',
  },
  // The send button is the composer's only aria-busy button without a popup menu (the
  // model picker has one).
  composerSendButton: {
    selectors: ['[data-composer-card] button[aria-busy]:not([aria-haspopup])'],
    alwaysPresent: false,
    description: '发送按钮',
  },
  // One assistant step of the conversation flow, while it streams and after.
  assistantStep: {
    selectors: [ASSISTANT_STEP],
    alwaysPresent: false,
    description: '助手回复',
  },
  // dsh marks the reply it is writing; the attribute goes away when the reply is done.
  streamingReply: {
    selectors: [`${ASSISTANT_STEP} [data-streaming="true"]`],
    alwaysPresent: false,
    description: '正在输出的回复',
  },
  userMessage: {
    selectors: ['[data-chat-flow-kind="user"] [data-message-bubble]'],
    alwaysPresent: false,
    description: '用户消息',
  },
  codeBlock: {
    selectors: ['[data-code-block-content]'],
    alwaysPresent: false,
    description: '代码块',
  },
  // Shiki with its `css-variables` theme: one span per token inside `span.line`.
  codeToken: {
    selectors: ['[data-code-block-content] pre.shiki .line > span'],
    alwaysPresent: false,
    description: '代码 token',
  },
  // Edit previews of tool calls: plain lines colored by dsh's diff variables.
  toolDiff: {
    selectors: ['[data-diff]'],
    alwaysPresent: false,
    description: 'diff 预览',
  },
  // Menus, popovers and dialogs. dsh draws their surface from `--dsw-specific-menu` and
  // `--dsw-menu-backdrop-filter`, so the glass itself needs no selector.
  floatingLayer: {
    selectors: ['[data-menu-material]', '[role="menu"]', '[role="listbox"]', '[role="dialog"]'],
    alwaysPresent: false,
    description: '浮层',
  },
  menuItem: {
    selectors: [
      '[role="menu"] [role="menuitem"]',
      '[role="menu"] [role="menuitemradio"]',
      '[role="menu"] [role="menuitemcheckbox"]',
      '[role="listbox"] [role="option"]',
    ],
    alwaysPresent: false,
    description: '菜单项',
  },
} as const satisfies Record<string, SelectorGroup>;

export type DshSelectorGroup = keyof typeof DSH_SELECTORS;

/** The comma-joined selector list of a group. */
export function selectorOf(group: DshSelectorGroup): string {
  return DSH_SELECTORS[group].selectors.join(', ');
}

/** Tokens painted by the code gradient engine. */
export const CODE_TOKEN_SELECTOR = selectorOf('codeToken');
/** Roots observed by the code gradient engine. */
export const CODE_ROOT_SELECTOR = selectorOf('codeBlock');
/**
 * Reply text the rainbow effect paints, while it streams and after. Tool calls are steps of
 * their own kind, so nothing outside the reply's Markdown matches.
 */
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
  .map((tag) => `${ASSISTANT_STEP} ${tag}`)
  .join(', ');

/** Body selectors for dsh's two appearance modes; dsh toggles the attribute on `<body>`. */
export const DARK_BODY = 'body[data-ds-dark-theme]';
export const LIGHT_BODY = 'body:not([data-ds-dark-theme])';

/**
 * Raises Woodfish rules above dsh's variable blocks. dsh declares its tokens on `body`,
 * `body[data-ds-dark-theme]` and `html[data-platform="darwin"] body…` (specificity up to
 * 0,2,2), and plugins may append their styles after ours, so order alone is not enough.
 * `:root:root` (0,2,0) lifts every Woodfish block above them without `!important`.
 */
export function modeScope(mode: 'dark' | 'light'): string {
  return `:root:root ${mode === 'dark' ? DARK_BODY : LIGHT_BODY}`;
}
