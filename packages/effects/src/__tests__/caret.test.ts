/** @jest-environment jsdom */

import * as vm from 'vm';
import { builtinEffectFiles } from '../index';

interface TestElement {
  hidden: boolean;
  setAttribute(name: string, value: string): void;
  append(...nodes: TestElement[]): void;
  querySelector(selector: string): TestElement | null;
}

interface TestDocument {
  body: TestElement;
  documentElement: {
    dataset: Record<string, string | undefined>;
    removeAttribute(name: string): void;
  };
  createElement(tag: string): TestElement;
}

const doc = (globalThis as unknown as { document: TestDocument }).document;

type CaretCallback = (event: {
  source: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  clip?: { left: number; top: number; right: number; bottom: number };
}) => void;

test('restores the native caret whenever the custom caret is not drawable', () => {
  const module: { exports: unknown } = { exports: {} };
  vm.runInNewContext(builtinEffectFiles()['caret/effect.js'], {
    module,
    exports: module.exports,
    document: doc,
    performance,
    setTimeout,
    clearTimeout,
  });
  const factory = module.exports as (ctx: Record<string, unknown>) => { dispose: () => void };
  let caret: CaretCallback | undefined;
  const styles: string[] = [];
  const layer = doc.createElement('div');
  doc.body.append(layer);
  const instance = factory({
    params: {
      width: 6,
      blinking: 'solid',
      smoothCaretAnimation: 'on',
      colors: 'rainbow',
      flowSeconds: 8,
      radius: 2,
      glow: 0,
    },
    selectors: { composerEditor: '[contenteditable="true"]' },
    lib: {
      placeCaretLayer: (clip: TestElement, event: { x: number; y: number }) => {
        layer.append(clip);
        return event;
      },
    },
    rainbow: ['#ff0000', '#00ff00'],
    theme: () => ({ cursor: null, stops: ['#fff'], accent: '#fff' }),
    style: (css: string) => styles.push(css),
    onCaret: (callback: CaretCallback) => {
      caret = callback;
    },
    onInsert: () => undefined,
    onTheme: () => undefined,
    later: () => () => undefined,
    simplified: () => false,
  });

  expect(styles[0]).toContain(':root[data-woodfish-caret-visible="true"]');
  caret?.({ source: 'user', visible: true, x: 10, y: 20, width: 0, height: 18 });
  expect(doc.documentElement.dataset.woodfishCaretVisible).toBe('true');
  expect(layer.querySelector('[data-woodfish-caret]')?.hidden).toBe(false);

  caret?.({ source: 'user', visible: false, x: 0, y: 0, width: 0, height: 0 });
  expect(doc.documentElement.dataset.woodfishCaretVisible).toBeUndefined();
  expect(layer.querySelector('[data-woodfish-caret]')?.hidden).toBe(true);

  instance.dispose();
});
