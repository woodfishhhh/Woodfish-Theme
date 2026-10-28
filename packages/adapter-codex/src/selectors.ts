/*
 * Codex renderer hooks, verified against the Store build listed in TESTED_CODEX_VERSIONS
 * (see docs/hosts/codex.md). Only stable data-* attributes, roles and custom element
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

export const CODEX_SELECTORS = {
  appShell: {
    selectors: ['[data-app-shell-main-surface]'],
    alwaysPresent: true,
    description: '主界面',
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
  composer: {
    selectors: ['[data-codex-composer-root]'],
    alwaysPresent: true,
    description: '输入框',
  },
  composerSurface: {
    selectors: ['[data-codex-composer-root] [data-composer-body]'],
    alwaysPresent: false,
    description: '输入框外框',
  },
  composerEditor: {
    selectors: ['[data-codex-composer-root] [contenteditable="true"]'],
    alwaysPresent: true,
    description: '输入框编辑区',
  },
  timeline: {
    selectors: ['[data-app-action-timeline-scroll]'],
    alwaysPresent: false,
    description: '对话内容',
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
  floatingLayer: {
    selectors: [
      '[data-radix-popper-content-wrapper] > *',
      '[data-slot="popover-content"]',
      '[role="menu"]',
      '[role="listbox"]',
      '[role="dialog"]',
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
export const BODY_TEXT_SELECTOR = ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote']
  .map((tag) => `[data-markdown-text-style="assistant-message"] ${tag}`)
  .join(', ');
/** Roots observed by the body gradient engine. */
export const BODY_ROOT_SELECTOR = selectorOf('assistantMarkdown');
