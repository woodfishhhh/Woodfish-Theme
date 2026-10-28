import { Disposer } from './disposers';

export interface RevealOptions {
  /** Interactive elements that get the pointer-following light. */
  targets: readonly string[];
}

/**
 * Reveal highlight (Fluent): marks the hovered target with `data-woodfish-reveal` and
 * writes the pointer position into `--woodfish-reveal-x/y` for CSS radial gradients.
 */
export function startReveal(options: RevealOptions): Disposer {
  const targetSelector = options.targets.join(',');
  let current: HTMLElement | null = null;
  let pending: { target: EventTarget | null; x: number; y: number } | null = null;
  let frame = 0;

  function clear(): void {
    if (current) {
      current.removeAttribute('data-woodfish-reveal');
      current.style.removeProperty('--woodfish-reveal-x');
      current.style.removeProperty('--woodfish-reveal-y');
      current = null;
    }
  }

  function paint(): void {
    frame = 0;
    if (!pending) {
      return;
    }
    const { target, x, y } = pending;
    pending = null;
    const element = target instanceof Element ? target.closest<HTMLElement>(targetSelector) : null;
    if (element !== current) {
      clear();
      current = element;
      if (current) {
        current.setAttribute('data-woodfish-reveal', 'true');
      }
    }
    if (current) {
      const bounds = current.getBoundingClientRect();
      current.style.setProperty('--woodfish-reveal-x', `${Math.round(x - bounds.left)}px`);
      current.style.setProperty('--woodfish-reveal-y', `${Math.round(y - bounds.top)}px`);
    }
  }

  function onPointerMove(event: PointerEvent): void {
    pending = { target: event.target, x: event.clientX, y: event.clientY };
    if (frame === 0) {
      frame = requestAnimationFrame(paint);
    }
  }

  function onPointerLeave(): void {
    pending = null;
    clear();
  }

  document.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave, { passive: true });
  return () => {
    document.removeEventListener('pointermove', onPointerMove, { capture: true });
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }
    clear();
  };
}
