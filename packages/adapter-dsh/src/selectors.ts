/*
 * dsh Web UI hooks, verified against the releases in TESTED_DSH_VERSIONS (see
 * docs/hosts/dsh.md). dsh styles its components with hashed CSS-module classes
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
  activeSession: {
    selectors: ['[role="tree"] [role="treeitem"][aria-selected="true"]'],
    alwaysPresent: false,
    description: '当前会话',
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
  assistantMarkdown: {
    selectors: [
      '[data-chat-flow-kind="assistant-step"] [data-text-interaction-source]:not([data-message-bubble])',
    ],
    alwaysPresent: false,
    description: '助手回复',
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
/** Assistant text blocks painted when the optional body gradient is on. */
export const BODY_TEXT_SELECTOR = ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote']
  .map((tag) => `${selectorOf('assistantMarkdown')} ${tag}`)
  .join(', ');
/** Roots observed by the body gradient engine. */
export const BODY_ROOT_SELECTOR = selectorOf('assistantMarkdown');

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
