import { BACKGROUND_RANGES, DEFAULT_BACKGROUND } from '@woodfish/theme-core';
import {
  BackgroundImageError,
  buildBackgroundFillImage,
  resizeBackgroundImage,
} from '@woodfish/renderer-runtime';
import { CodexBackgroundEntry } from '../protocol';
import {
  CODEX_DEFAULT_BACKGROUND_ID,
  CODEX_GRADIENT_BACKGROUND_ID,
  CodexSettings,
  CodexSettingsPatch,
} from '../settings';
import { BackgroundStore } from './background';
import { Look, element, labelBlock } from './panelDom';

/** Draft image key of a picture picked but not saved yet. */
export const LOCAL_BACKGROUND = 'local';
const THUMB_EDGE = 240;
const NAME_LIMIT = 60;

/** What the panel previews before the user saves. */
export interface BackgroundDraft {
  image: string;
  /** The picked picture, already scaled and converted to WebP. */
  picture: Blob | null;
  opacity: number;
  blur: number;
  mask: number;
}

export interface BackgroundPanelOptions {
  settings: () => CodexSettings;
  change: (patch: CodexSettingsPatch) => void;
  store: BackgroundStore;
  /** Shows a draft on the window; `null` returns to the saved settings. */
  preview: (draft: BackgroundDraft | null) => void;
}

export interface BackgroundSection {
  rows: HTMLElement[];
  /** Re-reads the saved settings (after a save or a change from elsewhere). */
  sync: () => void;
  dispose: () => void;
}

type Slider = 'opacity' | 'blur' | 'mask';

const SLIDERS: ReadonlyArray<{
  key: Slider;
  label: string;
  description: string;
  scale: number;
  unit: string;
}> = [
  { key: 'opacity', label: '透明度', description: '背景图透出来的程度', scale: 100, unit: '%' },
  { key: 'blur', label: '模糊', description: '侧栏和输入框毛玻璃的模糊半径', scale: 1, unit: 'px' },
  {
    key: 'mask',
    label: '遮罩',
    description: '侧栏和输入框盖在背景上的主题色浓度',
    scale: 100,
    unit: '%',
  },
];

function savedDraft(settings: CodexSettings): BackgroundDraft {
  const { image, opacity, blur, mask } = settings.background;
  return { image, picture: null, opacity, blur, mask };
}

function sameDraft(left: BackgroundDraft, right: BackgroundDraft): boolean {
  return (
    left.image === right.image &&
    left.picture === right.picture &&
    left.opacity === right.opacity &&
    left.blur === right.blur &&
    left.mask === right.mask
  );
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
 * The background rows of the Woodfish settings section: on/off, a gallery (《彩云》, the
 * gradient, saved pictures, upload), three sliders and save / cancel / reset. Every change
 * previews live on the window; only "保存" (or the switch and reset) persists.
 */
export function buildBackgroundSection(
  look: Look,
  options: BackgroundPanelOptions
): BackgroundSection {
  const { store } = options;
  let draft = savedDraft(options.settings());
  let entries: CodexBackgroundEntry[] = [];
  let busy = false;
  let disposed = false;
  let pickedName = '背景图片';
  const thumbs = new Map<string, Promise<string>>();
  const localThumb: { picture: Blob | null; url: string | null } = { picture: null, url: null };

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
  const switchButton = element(
    'button',
    'woodfish-settings-switch',
    { type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': '窗口背景' },
    [
      element('span', 'woodfish-settings-switch-track', { 'aria-hidden': 'true' }, [
        element('span', 'woodfish-settings-switch-thumb'),
      ]),
    ]
  );
  const sliders = new Map<Slider, { range: HTMLInputElement; value: HTMLElement }>();
  const save = element(
    'button',
    'woodfish-background-button woodfish-background-primary',
    {
      type: 'button',
    },
    ['保存']
  );
  const cancel = element('button', 'woodfish-background-button', { type: 'button' }, ['取消']);
  const reset = element('button', 'woodfish-background-button', { type: 'button' }, ['恢复默认']);

  function say(text: string): void {
    status.textContent = text;
  }

  function dirty(): boolean {
    return !sameDraft(draft, savedDraft(options.settings()));
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
      preview.style.backgroundImage = buildBackgroundFillImage(options.settings().background.fill);
    } else if (id === LOCAL_BACKGROUND) {
      if (localThumb.url) {
        preview.style.backgroundImage = `url("${localThumb.url}")`;
      }
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
    if (draft.picture) {
      children.push(tile(LOCAL_BACKGROUND, '新图片（未保存）', false));
    }
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
              {
                'aria-hidden': 'true',
              },
              ['+']
            ),
            element('span', '', {}, ['上传图片…']),
          ]
        )
      );
    }
    tiles.replaceChildren(...children);
    syncControls();
  }

  function syncControls(): void {
    const settings = options.settings();
    switchButton.setAttribute('aria-checked', String(settings.background.enabled));
    for (const button of tiles.querySelectorAll<HTMLElement>('[data-woodfish-background]')) {
      button.setAttribute(
        'aria-checked',
        String(button.dataset.woodfishBackground === draft.image)
      );
    }
    for (const { key, scale, unit } of SLIDERS) {
      const slider = sliders.get(key);
      if (slider) {
        slider.range.value = String(Math.round(draft[key] * scale));
        slider.value.textContent = `${Math.round(draft[key] * scale)}${unit}`;
      }
    }
    const changed = dirty();
    save.disabled = busy || !changed;
    cancel.hidden = !changed;
    reset.disabled = busy;
  }

  function setDraft(next: BackgroundDraft): void {
    draft = next;
    options.preview(dirty() ? draft : null);
    syncControls();
  }

  async function pick(file: File): Promise<void> {
    if (busy) {
      return;
    }
    busy = true;
    say('正在处理图片……');
    syncControls();
    try {
      const picture = await resizeBackgroundImage(file);
      if (disposed) {
        return;
      }
      if (localThumb.url) {
        URL.revokeObjectURL(localThumb.url);
      }
      localThumb.picture = picture;
      localThumb.url = URL.createObjectURL(await resizeBackgroundImage(picture, THUMB_EDGE, 0.8));
      pickedName = file.name.slice(0, NAME_LIMIT) || '背景图片';
      busy = false;
      setDraft({ ...draft, image: LOCAL_BACKGROUND, picture });
      renderTiles();
      say(`已载入 ${file.name}，满意后点“保存”`);
    } catch (error) {
      say(error instanceof BackgroundImageError ? error.message : '无法读取这张图片');
    } finally {
      busy = false;
      syncControls();
    }
  }

  async function commit(): Promise<void> {
    if (busy || !dirty()) {
      return;
    }
    busy = true;
    say('正在保存……');
    syncControls();
    try {
      let image = draft.image;
      if (draft.picture) {
        image = await store.upload(pickedName, draft.picture);
        entries = await store.list().catch(() => entries);
      }
      options.change({
        background: {
          enabled: true,
          image,
          opacity: draft.opacity,
          blur: draft.blur,
          mask: draft.mask,
        },
      });
      draft = savedDraft(options.settings());
      options.preview(null);
      say('已保存');
      renderTiles();
    } catch (error) {
      say(`保存失败：${(error as Error).message}`);
    } finally {
      busy = false;
      syncControls();
    }
  }

  async function removeSaved(id: string): Promise<void> {
    if (busy) {
      return;
    }
    busy = true;
    syncControls();
    try {
      await store.remove(id);
      entries = entries.filter((entry) => entry.id !== id);
      if (options.settings().background.image === id) {
        options.change({ background: { image: CODEX_DEFAULT_BACKGROUND_ID } });
      }
      if (draft.image === id) {
        draft = { ...draft, image: options.settings().background.image };
        options.preview(dirty() ? draft : null);
      }
      say('已删除');
      renderTiles();
    } catch (error) {
      say(`删除失败：${(error as Error).message}`);
    } finally {
      busy = false;
      syncControls();
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
      const image = choice.dataset.woodfishBackground ?? CODEX_DEFAULT_BACKGROUND_ID;
      setDraft({
        ...draft,
        image,
        picture: image === LOCAL_BACKGROUND ? localThumb.picture : null,
      });
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
      void pick(file);
    }
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      void pick(file);
    }
  });
  switchButton.addEventListener('click', () => {
    options.change({ background: { enabled: !options.settings().background.enabled } });
    syncControls();
  });
  save.addEventListener('click', () => void commit());
  cancel.addEventListener('click', () => {
    setDraft(savedDraft(options.settings()));
    renderTiles();
    say('');
  });
  reset.addEventListener('click', () => {
    options.change({
      background: {
        enabled: true,
        image: CODEX_DEFAULT_BACKGROUND_ID,
        opacity: DEFAULT_BACKGROUND.opacity,
        blur: DEFAULT_BACKGROUND.blur,
        mask: DEFAULT_BACKGROUND.mask,
      },
    });
    draft = savedDraft(options.settings());
    options.preview(null);
    say('已恢复默认背景《彩云》');
    renderTiles();
  });
  tiles.addEventListener('click', onClick);
  if (store.canSave) {
    window.addEventListener('dragover', onDragOver, true);
    window.addEventListener('drop', onDrop, true);
  }

  const sliderRows = SLIDERS.map(({ key, label, description, scale }) => {
    const range = BACKGROUND_RANGES[key];
    const control = element('input', 'woodfish-background-range', {
      type: 'range',
      min: String(range.minimum * scale),
      max: String(range.maximum * scale),
      step: '1',
      'aria-label': label,
    });
    const value = element('span', 'woodfish-background-value');
    sliders.set(key, { range: control, value });
    control.addEventListener('input', () => {
      setDraft({ ...draft, [key]: Number(control.value) / scale });
    });
    return element('div', look.row, {}, [
      labelBlock(look, label, description),
      element('div', `${look.rowRight} woodfish-background-slider`, {}, [control, value]),
    ]);
  });

  const rows = [
    element('div', look.row, {}, [
      labelBlock(look, '窗口背景', '图片铺在窗口底下，侧栏和输入框用毛玻璃叠在上面'),
      element('div', look.rowRight, {}, [switchButton]),
    ]),
    element('div', `${look.row} woodfish-settings-gallery-row`, {}, [
      labelBlock(
        look,
        '背景图片',
        store.canSave
          ? '点选即可预览，满意后保存；也可以把图片拖进窗口。图片只存在本机的 Woodfish 数据目录'
          : 'Codex++ 用户脚本模式没有后台进程，只能使用默认背景和渐变'
      ),
      tiles,
      input,
    ]),
    ...sliderRows,
    element('div', `${look.row} woodfish-background-actions`, {}, [
      status,
      element('div', 'woodfish-background-buttons', {}, [reset, cancel, save]),
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
    sync: syncControls,
    dispose: (): void => {
      disposed = true;
      window.removeEventListener('dragover', onDragOver, true);
      window.removeEventListener('drop', onDrop, true);
      options.preview(null);
      for (const url of thumbs.values()) {
        void url.then((value) => URL.revokeObjectURL(value)).catch(() => undefined);
      }
      if (localThumb.url) {
        URL.revokeObjectURL(localThumb.url);
      }
    },
  };
}
