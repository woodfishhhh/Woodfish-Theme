import {
  WOODFISH_MARKER_END,
  WOODFISH_MARKER_START,
  hasWoodfishPayload,
  injectWorkbenchPayload,
  removeWorkbenchPayload,
} from '../services/runtime/workbenchPatcher';

describe('workbench patcher', () => {
  const html = '<html><head><title>VS Code</title></head><body><div id="app"></div></body></html>';

  it('injects the payload before the closing html tag', () => {
    const patched = injectWorkbenchPayload(html, '<style>.woodfish { color: red; }</style>');

    expect(patched).toContain(WOODFISH_MARKER_START);
    expect(patched).toContain(WOODFISH_MARKER_END);
    expect(patched).toContain('<style>.woodfish { color: red; }</style>');
    expect(patched.indexOf(WOODFISH_MARKER_START)).toBeLessThan(patched.indexOf('</html>'));
    expect(hasWoodfishPayload(patched)).toBe(true);
  });

  it('replaces an existing payload instead of duplicating it', () => {
    const first = injectWorkbenchPayload(html, '<style>.one { color: red; }</style>');
    const second = injectWorkbenchPayload(first, '<style>.two { color: blue; }</style>');

    expect(second.match(/WOODFISH_THEME_START/g)).toHaveLength(1);
    expect(second).toContain('.two { color: blue; }');
    expect(second).not.toContain('.one { color: red; }');
  });

  it('removes the payload cleanly', () => {
    const patched = injectWorkbenchPayload(html, '<style>.woodfish { color: red; }</style>');
    const restored = removeWorkbenchPayload(patched);

    expect(restored).toBe(html);
    expect(hasWoodfishPayload(restored)).toBe(false);
  });
});
