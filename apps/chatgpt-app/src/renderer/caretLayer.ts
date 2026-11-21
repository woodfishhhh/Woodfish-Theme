import type { CaretEvent } from '@woodfish/renderer-runtime';

const owners = new WeakMap<HTMLElement, Element>();

/** A zero-size sibling: no layout space, editable content, or change to host positioning. */
export function placeCaretLayer(layer: HTMLElement, caret: CaretEvent): { x: number; y: number } {
  const owner = caret.owner;
  if (owner && (owners.get(layer) !== owner || layer.parentNode !== owner.parentNode)) {
    // Codex may insert a positioned review card immediately after the Markdown root.
    if (caret.source === 'ai') {
      owner.before(layer);
    } else {
      owner.after(layer);
    }
    owners.set(layer, owner);
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('inert', '');
    layer.style.cssText =
      'position:absolute;inset:auto;width:0;height:0;pointer-events:none;user-select:none;';
  }
  const { left, top } = layer.getBoundingClientRect();
  const r = caret.clip;
  layer.style.clipPath = r
    ? `polygon(${r.left - left}px ${r.top - top}px,${r.right - left}px ${r.top - top}px,${r.right - left}px ${r.bottom - top}px,${r.left - left}px ${r.bottom - top}px)`
    : '';
  return { x: caret.x - left, y: caret.y - top };
}
