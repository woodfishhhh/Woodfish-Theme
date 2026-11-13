import {
  CODEX_PALETTE_SLUGS,
  CodexPaletteSlug,
  CodexSettings,
  CodexSettingsPatch,
  codexPaletteMode,
  findCodexPalette,
} from '../settings';
import {
  BackgroundSection,
  BackgroundPanelOptions,
  buildBackgroundSection,
} from './backgroundPanel';
import { EffectsCard, EffectsPanelOptions, buildEffectsCard } from './effectsPanel';
import { Look, element, labelBlock, readLook } from './panelDom';

/** Marks the Woodfish settings section, so styles, dispose and tests can find it. */
export const SETTINGS_PANEL_ATTRIBUTE = 'data-woodfish-codex-settings';

/**
 * The Appearance page's mode radios (system / light / dark). Their `name` comes from
 * Codex's code, not its translations, so it identifies the page in every language.
 */
const APPEARANCE_ANCHOR = 'input[type="radio"][name="appearance-theme"]';
const MOUNT_DELAY_MS = 120;

/** Codex's own default colors, shown on the "keep Codex's theme" tile. */
const CODEX_DEFAULT_TILE: Readonly<Record<'dark' | 'light', readonly string[]>> = {
  dark: ['#181818', '#f8a6c8', '#63a8f8', '#83d197', '#339cff'],
  light: ['#ffffff', '#ab4f7a', '#1f4e94', '#3a843f', '#339cff'],
};

export interface SettingsPanelOptions {
  settings: () => CodexSettings;
  /** Theme and picture changes (applied at once and saved). */
  change: (patch: CodexSettingsPatch) => void;
  effects: Omit<EffectsPanelOptions, 'location'> & { location: string };
  background: Pick<BackgroundPanelOptions, 'store'>;
  /** Where changes are kept, shown under the controls. */
  footnote: string;
  /** Extra attributes on the section (e.g. the Codex++ ownership marker). */
  nodeAttributes?: Readonly<Record<string, string>>;
}

export interface SettingsPanel {
  /** Re-reads the settings and effects into the controls. */
  refresh: () => void;
  /** A short message in the effects card (e.g. the result of a reload). */
  say: (text: string) => void;
  dispose: () => void;
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

/**
 * Adds a "Woodfish 外观" section to Codex's Settings → Appearance page, right after its own
 * visual style section, and keeps it there while the page is open: the themes, every
 * effect plugin with its parameters, the background picture, reload and reset.
 */
export function startSettingsPanel(options: SettingsPanelOptions): SettingsPanel {
  let root: HTMLElement | null = null;
  let effects: EffectsCard | null = null;
  let background: BackgroundSection | null = null;
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
    effects?.sync();
    background?.sync();
  }

  function onThemeClick(event: Event): void {
    const target = event.target instanceof Element ? event.target : null;
    const paletteButton = target?.closest<HTMLElement>('[data-woodfish-palette]');
    const group = paletteButton?.closest<HTMLElement>('[data-woodfish-mode]');
    if (paletteButton && group) {
      const mode = group.dataset.woodfishMode === 'light' ? 'light' : 'dark';
      const slug = paletteButton.dataset.woodfishPalette || null;
      options.change({ palette: { [mode]: slug } });
      sync();
    }
  }

  function build(anchorSection: Element): HTMLElement {
    const look = readLook(anchorSection);
    const cardAttributes: Record<string, string> = look.cardStyle ? { style: look.cardStyle } : {};
    const themes = element('div', look.card, cardAttributes, [
      galleryRow(look, 'dark'),
      galleryRow(look, 'light'),
    ]);
    themes.addEventListener('click', onThemeClick);
    effects = buildEffectsCard(look, options.effects);
    background = buildBackgroundSection(look, {
      store: options.background.store,
      image: () => options.settings().backgroundImage,
      choose: (image) => options.change({ backgroundImage: image }),
    });
    const backgroundCard = element(
      'div',
      `${look.card} woodfish-background-card`,
      cardAttributes,
      background.rows
    );
    return element(
      'section',
      look.section,
      {
        [SETTINGS_PANEL_ATTRIBUTE]: 'true',
        'aria-label': 'Woodfish 外观',
        ...options.nodeAttributes,
      },
      [
        element('div', look.header, {}, [element('div', look.title, {}, ['Woodfish 外观'])]),
        element('div', look.body, {}, [
          themes,
          effects.card,
          backgroundCard,
          element('div', 'woodfish-settings-footnote', {}, [options.footnote]),
        ]),
      ]
    );
  }

  /** Mounts the section after the visual style section, or drops it when the page closes. */
  function check(): void {
    timer = null;
    if (disposed) {
      return;
    }
    const anchorSection = document.querySelector(APPEARANCE_ANCHOR)?.closest('section') ?? null;
    if (!anchorSection) {
      unmount();
      return;
    }
    if (root && root.isConnected && root.previousElementSibling === anchorSection) {
      return;
    }
    unmount();
    root = build(anchorSection);
    anchorSection.after(root);
    sync();
  }

  function unmount(): void {
    background?.dispose();
    background = null;
    effects = null;
    root?.remove();
    root = null;
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
    say: (text: string): void => effects?.say(text),
    dispose: (): void => {
      disposed = true;
      observer.disconnect();
      if (timer !== null) {
        globalThis.clearTimeout(timer);
      }
      unmount();
    },
  };
}
