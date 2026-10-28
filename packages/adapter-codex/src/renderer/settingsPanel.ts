import {
  CODEX_FEATURE_KEYS,
  CODEX_PALETTE_SLUGS,
  CodexFeatureKey,
  CodexPaletteSlug,
  CodexSettings,
  CodexSettingsPatch,
  codexPaletteMode,
  findCodexPalette,
} from '../settings';

/** Marks the Woodfish settings section, so styles, dispose and tests can find it. */
export const SETTINGS_PANEL_ATTRIBUTE = 'data-woodfish-codex-settings';

/**
 * The Appearance page's mode radios (system / light / dark). Their `name` comes from
 * Codex's code, not its translations, so it identifies the page in every language.
 */
const APPEARANCE_ANCHOR = 'input[type="radio"][name="appearance-theme"]';
const MOUNT_DELAY_MS = 120;

const FEATURE_TEXT: Readonly<Record<CodexFeatureKey, { label: string; description: string }>> = {
  codeGradient: { label: '代码渐变', description: '代码块中的每个 token 按 OKLCH 渐变着色' },
  codeGlow: { label: '代码发光', description: '代码文字带一层柔和的光晕' },
  glass: { label: '毛玻璃浮层', description: '菜单、弹窗和浮层使用磨砂玻璃效果' },
  accent: { label: '强调色点缀', description: '输入框聚焦光晕、发送按钮渐变与当前会话标记' },
  caret: { label: '彩色光标', description: '输入框里的光标循环变换颜色' },
  bodyText: { label: '回复正文渐变', description: '助手回复的正文也使用渐变，比较醒目' },
};

/** Codex's own default colors, shown on the "keep Codex's theme" tile. */
const CODEX_DEFAULT_TILE: Readonly<Record<'dark' | 'light', readonly string[]>> = {
  dark: ['#181818', '#f8a6c8', '#63a8f8', '#83d197', '#339cff'],
  light: ['#ffffff', '#ab4f7a', '#1f4e94', '#3a843f', '#339cff'],
};

export interface SettingsPanelOptions {
  settings: () => CodexSettings;
  change: (patch: CodexSettingsPatch) => void;
  /** Where changes are kept, shown under the controls. */
  footnote: string;
  /** Extra attributes on the section (e.g. the Codex++ ownership marker). */
  nodeAttributes?: Readonly<Record<string, string>>;
}

export interface SettingsPanel {
  /** Re-reads the settings into the controls. */
  refresh: () => void;
  dispose: () => void;
}

/** Class names copied from Codex's own settings section, or Woodfish fallbacks. */
interface Look {
  section: string;
  header: string;
  title: string;
  body: string;
  card: string;
  cardStyle: string;
  row: string;
  rowLeft: string;
  labelWrap: string;
  label: string;
  description: string;
  rowRight: string;
}

function classOf(element: Element | null | undefined, fallback: string): string {
  const value = element?.getAttribute('class');
  return value && value.trim() ? value : fallback;
}

/**
 * Reads the layout classes of the Appearance page so the Woodfish section looks native,
 * even after Codex restyles its settings. Anything missing falls back to Woodfish CSS.
 */
function readLook(anchorSection: Element): Look {
  const header = anchorSection.children[0];
  const body = anchorSection.children[1];
  const card = body?.querySelector('[class*="rounded-2xl"]') ?? body?.firstElementChild;
  const rows = [...document.querySelectorAll('[class*="settings-row"]')].filter(
    (row) => row.children.length === 2 && row.querySelector('[class*="font-medium"]')
  );
  const row = rows[rows.length - 1];
  const left = row?.children[0];
  const labelWrap = left?.firstElementChild;
  return {
    section: classOf(anchorSection, 'woodfish-settings-fallback-section'),
    header: classOf(header, ''),
    title: classOf(
      header?.querySelector('[class*="font-medium"]'),
      'woodfish-settings-fallback-title'
    ),
    body: classOf(body, 'woodfish-settings-fallback-section'),
    card: classOf(card, 'woodfish-settings-fallback-card'),
    cardStyle: card?.getAttribute('style') ?? '',
    row: classOf(row, 'woodfish-settings-fallback-row'),
    rowLeft: classOf(left, ''),
    labelWrap: classOf(labelWrap, ''),
    label: classOf(labelWrap?.firstElementChild, 'woodfish-settings-label'),
    description: 'woodfish-settings-description',
    rowRight: classOf(row?.children[1], ''),
  };
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  attributes: Record<string, string> = {},
  children: Array<Node | string> = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

function labelBlock(look: Look, label: string, description: string): HTMLElement {
  return element('div', look.rowLeft, {}, [
    element('div', look.labelWrap, {}, [
      element('div', look.label, {}, [label]),
      element('div', look.description, {}, [description]),
    ]),
  ]);
}

/** A small preview: the theme's background with a few lines in its syntax colors. */
function tile(slug: CodexPaletteSlug | null, mode: 'dark' | 'light'): HTMLButtonElement {
  const palette = slug ? findCodexPalette(slug) : null;
  const [background, ...lines] = palette
    ? [
        palette.ui.bg,
        palette.tokens.keyword,
        palette.tokens.function,
        palette.tokens.string,
        palette.ui.accent,
      ]
    : CODEX_DEFAULT_TILE[mode];
  const widths = ['34%', '58%', '44%', '26%'];
  const preview = element(
    'span',
    'woodfish-settings-preview',
    { 'aria-hidden': 'true', style: `--woodfish-tile-bg: ${background}` },
    lines.map((color, index) =>
      element('span', '', {
        style: `width: ${widths[index]}; background-color: ${color};${index >= 2 ? ' margin-left: 10%;' : ''}`,
      })
    )
  );
  const name = palette ? palette.label.replace(/^Woodfish /, '') : 'Codex 默认';
  return element(
    'button',
    'woodfish-settings-tile',
    {
      type: 'button',
      role: 'radio',
      'aria-checked': 'false',
      'aria-label': palette ? palette.label : 'Codex 默认配色',
      'data-woodfish-palette': slug ?? '',
    },
    [preview, element('span', '', {}, [name])]
  );
}

function galleryRow(look: Look, mode: 'dark' | 'light'): HTMLElement {
  const label = mode === 'dark' ? '深色主题' : '浅色主题';
  const description = mode === 'dark' ? 'Codex 使用深色外观时的配色' : 'Codex 使用浅色外观时的配色';
  const slugs = CODEX_PALETTE_SLUGS.filter((slug) => codexPaletteMode(slug) === mode);
  const tiles = element('div', 'woodfish-settings-tiles', {
    role: 'radiogroup',
    'aria-label': label,
    'data-woodfish-mode': mode,
  });
  tiles.append(tile(null, mode), ...slugs.map((slug) => tile(slug, mode)));
  return element('div', `${look.row} woodfish-settings-gallery-row`, {}, [
    labelBlock(look, label, description),
    tiles,
  ]);
}

function switchRow(look: Look, key: CodexFeatureKey): HTMLElement {
  const text = FEATURE_TEXT[key];
  const control = element(
    'button',
    'woodfish-settings-switch',
    {
      type: 'button',
      role: 'switch',
      'aria-checked': 'false',
      'aria-label': text.label,
      'data-woodfish-feature': key,
    },
    [
      element('span', 'woodfish-settings-switch-track', { 'aria-hidden': 'true' }, [
        element('span', 'woodfish-settings-switch-thumb'),
      ]),
    ]
  );
  return element('div', look.row, {}, [
    labelBlock(look, text.label, text.description),
    element('div', look.rowRight, {}, [control]),
  ]);
}

/**
 * Adds a "Woodfish" section to Codex's Settings → Appearance page, right after its own
 * visual style section, and keeps it there while the page is open.
 */
export function startSettingsPanel(options: SettingsPanelOptions): SettingsPanel {
  let root: HTMLElement | null = null;
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let disposed = false;

  function sync(): void {
    if (!root) {
      return;
    }
    const settings = options.settings();
    for (const group of root.querySelectorAll<HTMLElement>('[data-woodfish-mode]')) {
      const mode = group.dataset.woodfishMode === 'light' ? 'light' : 'dark';
      for (const button of group.querySelectorAll<HTMLElement>('[data-woodfish-palette]')) {
        const slug = button.dataset.woodfishPalette || null;
        button.setAttribute('aria-checked', String(settings.palette[mode] === slug));
      }
    }
    for (const button of root.querySelectorAll<HTMLElement>('[data-woodfish-feature]')) {
      const key = button.dataset.woodfishFeature as CodexFeatureKey;
      button.setAttribute('aria-checked', String(Boolean(settings[key]?.enabled)));
    }
  }

  function onClick(event: Event): void {
    const target = event.target instanceof Element ? event.target : null;
    const paletteButton = target?.closest<HTMLElement>('[data-woodfish-palette]');
    const group = paletteButton?.closest<HTMLElement>('[data-woodfish-mode]');
    if (paletteButton && group) {
      const mode = group.dataset.woodfishMode === 'light' ? 'light' : 'dark';
      const slug = (paletteButton.dataset.woodfishPalette || null) as CodexPaletteSlug | null;
      options.change({ palette: { [mode]: slug } });
      return;
    }
    const featureButton = target?.closest<HTMLElement>('[data-woodfish-feature]');
    if (featureButton) {
      const key = featureButton.dataset.woodfishFeature as CodexFeatureKey;
      const enabled = featureButton.getAttribute('aria-checked') !== 'true';
      options.change({ [key]: { enabled } });
    }
  }

  function build(anchorSection: Element): HTMLElement {
    const look = readLook(anchorSection);
    const card = element('div', look.card, look.cardStyle ? { style: look.cardStyle } : {}, [
      galleryRow(look, 'dark'),
      galleryRow(look, 'light'),
      ...CODEX_FEATURE_KEYS.map((key) => switchRow(look, key)),
    ]);
    const section = element(
      'section',
      look.section,
      { [SETTINGS_PANEL_ATTRIBUTE]: 'true', 'aria-label': 'Woodfish', ...options.nodeAttributes },
      [
        element('div', look.header, {}, [element('div', look.title, {}, ['Woodfish'])]),
        element('div', look.body, {}, [
          card,
          element('div', 'woodfish-settings-footnote', {}, [options.footnote]),
        ]),
      ]
    );
    section.addEventListener('click', onClick);
    return section;
  }

  /** Mounts the section after the visual style section, or drops it when the page closes. */
  function check(): void {
    timer = null;
    if (disposed) {
      return;
    }
    const anchorSection = document.querySelector(APPEARANCE_ANCHOR)?.closest('section') ?? null;
    if (!anchorSection) {
      root?.remove();
      root = null;
      return;
    }
    if (root && root.isConnected && root.previousElementSibling === anchorSection) {
      return;
    }
    root?.remove();
    root = build(anchorSection);
    anchorSection.after(root);
    sync();
  }

  function schedule(): void {
    if (timer === null && !disposed) {
      timer = globalThis.setTimeout(check, MOUNT_DELAY_MS);
    }
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  check();

  return {
    refresh: sync,
    dispose: (): void => {
      disposed = true;
      observer.disconnect();
      if (timer !== null) {
        globalThis.clearTimeout(timer);
      }
      root?.remove();
      root = null;
    },
  };
}
