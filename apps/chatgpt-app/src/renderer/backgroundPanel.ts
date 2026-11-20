import { DEFAULT_BACKGROUND } from '@woodfish/theme-core';
import {
  BackgroundImageError,
  buildBackgroundFillImage,
  resizeBackgroundImage,
} from '@woodfish/renderer-runtime';
import { CodexBackgroundEntry } from '../protocol';
import {
  CODEX_DEFAULT_BACKGROUND_ID,
  CODEX_GRADIENT_BACKGROUND_ID,
  CodexBackgroundId,
} from '../settings';
import { BackgroundStore } from './background';
import { Look, element, labelBlock } from './panelDom';

const THUMB_EDGE = 240;
const NAME_LIMIT = 60;

export interface BackgroundPanelOptions {
  /** The picture in use. */
  image: () => CodexBackgroundId;
  /** Uses a picture (saved at once; the window follows). */
  choose: (image: CodexBackgroundId) => void;
  store: BackgroundStore;
}

export interface BackgroundSection {
  rows: HTMLElement[];
  /** Re-reads the picture in use (after a change from elsewhere). */
  sync: () => void;
  dispose: () => void;
}

function imageFile(transfer: DataTransfer | null): File | null {
  return [...(transfer?.files ?? [])].find((file) => file.type.startsWith('image/')) ?? null;
}

function carriesImage(transfer: DataTransfer | null): boolean {
  return [...(transfer?.items ?? [])].some(
    (item) => item.kind === 'file' && item.type.startsWith('image/')
  );
}

/**
 * The picture rows of the Woodfish settings section: 《彩云》, the gradient, saved pictures
 * and upload. Picking applies and saves at once; the background's switch and sliders are
 * the `background` effect's controls in the effects card.
 */
export function buildBackgroundSection(
  look: Look,
  options: BackgroundPanelOptions
): BackgroundSection {
  const { store } = options;
  let entries: CodexBackgroundEntry[] = [];
  let busy = false;
  let disposed = false;
  const thumbs = new Map<string, Promise<string>>();

  const status = element('div', 'woodfish-background-status', { role: 'status' });
  const tiles = element('div', 'woodfish-settings-tiles woodfish-background-tiles', {
    role: 'radiogroup',
    'aria-label': '背景图片',
  });
  const input = element('input', '', {
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp',
    hidden: '',
  });

  function say(text: string): void {
    status.textContent = text;
  }

  function thumbnail(id: string): Promise<string> {
    let url = thumbs.get(id);
    if (!url) {
      url = store
        .get(id)
        .then((blob) => resizeBackgroundImage(blob, THUMB_EDGE, 0.8))
        .then((thumb) => URL.createObjectURL(thumb));
      thumbs.set(id, url);
    }
    return url;
  }

  function tile(id: string, name: string, removable: boolean): HTMLElement {
    const preview = element('span', 'woodfish-settings-preview woodfish-background-thumb', {
      'aria-hidden': 'true',
    });
    if (id === CODEX_GRADIENT_BACKGROUND_ID) {
      preview.style.backgroundImage = buildBackgroundFillImage(DEFAULT_BACKGROUND.fill);
    } else {
      void thumbnail(id)
        .then((url) => {
          preview.style.backgroundImage = `url("${url}")`;
        })
        .catch(() => undefined);
    }
    const button = element(
      'button',
      'woodfish-settings-tile',
      { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-woodfish-background': id },
      [preview, element('span', '', {}, [name])]
    );
    if (!removable) {
      return button;
    }
    const remove = element(
      'button',
      'woodfish-background-remove',
      { type: 'button', 'aria-label': `删除 ${name}`, 'data-woodfish-background-remove': id },
      ['×']
    );
    return element('div', 'woodfish-background-tile-wrap', {}, [button, remove]);
  }

  function renderTiles(): void {
    const children: HTMLElement[] = [
      tile(CODEX_DEFAULT_BACKGROUND_ID, '彩云', false),
      tile(CODEX_GRADIENT_BACKGROUND_ID, '彩云渐变', false),
      ...entries.map((entry) => tile(entry.id, entry.name, true)),
    ];
    if (store.canSave) {
      children.push(
        element(
          'button',
          'woodfish-settings-tile woodfish-background-upload',
          { type: 'button', 'data-woodfish-background-upload': '' },
          [
            element(
              'span',
              'woodfish-settings-preview woodfish-background-plus',
              { 'aria-hidden': 'true' },
              ['+']
            ),
            element('span', '', {}, ['上传图片…']),
          ]
        )
      );
    }
    tiles.replaceChildren(...children);
    sync();
  }

  function sync(): void {
    const image = options.image();
    for (const button of tiles.querySelectorAll<HTMLElement>('[data-woodfish-background]')) {
      button.setAttribute('aria-checked', String(button.dataset.woodfishBackground === image));
    }
  }

  async function upload(file: File): Promise<void> {
    if (busy) {
      return;
    }
    busy = true;
    say('正在处理图片……');
    try {
      const picture = await resizeBackgroundImage(file);
      const id = await store.upload(file.name.slice(0, NAME_LIMIT) || '背景图片', picture);
      if (disposed) {
        return;
      }
      entries = await store.list().catch(() => entries);
      options.choose(id);
      say(`已使用 ${file.name}`);
      renderTiles();
    } catch (error) {
      say(
        error instanceof BackgroundImageError
          ? error.message
          : `上传失败：${(error as Error).message}`
      );
    } finally {
      busy = false;
    }
  }

  async function removeSaved(id: string): Promise<void> {
    if (busy) {
      return;
    }
    busy = true;
    try {
      await store.remove(id);
      entries = entries.filter((entry) => entry.id !== id);
      if (options.image() === id) {
        options.choose(CODEX_DEFAULT_BACKGROUND_ID);
      }
      say('已删除');
      renderTiles();
    } catch (error) {
      say(`删除失败：${(error as Error).message}`);
    } finally {
      busy = false;
    }
  }

  function onClick(event: Event): void {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }
    const removeButton = target.closest<HTMLElement>('[data-woodfish-background-remove]');
    if (removeButton) {
      void removeSaved(removeButton.dataset.woodfishBackgroundRemove ?? '');
      return;
    }
    if (target.closest('[data-woodfish-background-upload]')) {
      input.click();
      return;
    }
    const choice = target.closest<HTMLElement>('[data-woodfish-background]');
    if (choice) {
      options.choose(choice.dataset.woodfishBackground ?? CODEX_DEFAULT_BACKGROUND_ID);
      say('');
      sync();
    }
  }

  function onDragOver(event: DragEvent): void {
    if (carriesImage(event.dataTransfer)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    }
  }

  function onDrop(event: DragEvent): void {
    const file = imageFile(event.dataTransfer);
    if (file && store.canSave) {
      event.preventDefault();
      event.stopPropagation();
      void upload(file);
    }
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      void upload(file);
    }
  });
  tiles.addEventListener('click', onClick);
  if (store.canSave) {
    // Only while the Appearance page is open, and only image files: dropping pictures into
    // the composer as attachments keeps working everywhere else.
    window.addEventListener('dragover', onDragOver, true);
    window.addEventListener('drop', onDrop, true);
  }

  const rows = [
    element('div', `${look.row} woodfish-settings-gallery-row`, {}, [
      labelBlock(
        look,
        '背景图片',
        store.canSave
          ? '点选立即换上；也可以上传或把图片拖进窗口。图片只存在本机的 Woodfish 数据目录。开关、透明度和模糊在上面「窗口背景」效果里'
          : 'Codex++ 用户脚本模式没有后台进程，只能使用默认背景和渐变'
      ),
      tiles,
      input,
      status,
    ]),
  ];

  renderTiles();
  void store
    .list()
    .then((list) => {
      if (!disposed) {
        entries = list;
        renderTiles();
      }
    })
    .catch(() => undefined);

  return {
    rows,
    sync,
    dispose: (): void => {
      disposed = true;
      window.removeEventListener('dragover', onDragOver, true);
      window.removeEventListener('drop', onDrop, true);
      for (const url of thumbs.values()) {
        void url.then((value) => URL.revokeObjectURL(value)).catch(() => undefined);
      }
    },
  };
}
