import { nativeCorner, startNativeCorners } from '../nativeCorners';
import { buildHostCornerCss, buildSquircleCss, prepareCornerRadii } from '../squircle';

it('scales rectangles only on supporting engines and preserves pills, circles and inherited corners', () => {
  const css = buildSquircleCss(
    prepareCornerRadii(
      '.a { border-radius: 8px; } .pill { border-radius: 999px; } .circle { border-radius: 50%; } .child { border-radius: inherit; }'
    )
  );
  expect(css).toContain('@supports (corner-shape: squircle)');
  expect(css).toContain('--squircle-k: 1.78');
  expect(css).toContain('calc(8px * var(--squircle-k, 1))');
  expect(css).toContain('999px; corner-shape: round');
  expect(css).toContain('50%; corner-shape: round');
  expect(css).toContain('inherit; corner-shape: inherit');
});

it.each([
  '0',
  '0.5px',
  '2px',
  '4.99px',
  '100px',
  '999px',
  '50%',
  '100%',
  'calc(infinity * 1px)',
  'var(--radius-full)',
  'var(--vscode-cornerRadius-circle)',
])('keeps the original circular geometry of %s', (radius) => {
  expect(nativeCorner(radius)).toEqual({ radius, shape: 'round' });
});
it('scales a 5px native radius once and leaves token geometry to the theme', () => {
  expect(nativeCorner('5px').radius).toContain('5px * var(--squircle-k, 1)');
  expect(nativeCorner('var(--radius-lg)').radius).toContain(
    'var(--woodfish-original--radius-lg, var(--radius-lg))'
  );
  const css = buildHostCornerCss(':root', ['--radius-lg'], '.rounded-full');
  expect(css).toContain('--woodfish-original--radius-lg: var(--radius-lg)');
  expect(css).toContain('.rounded-full,');
  expect(css).toContain('--woodfish-native-shape: round');
});

it('adds and removes only companion sheets, including a menu stylesheet loaded after startup', async () => {
  const native = document.createElement('style');
  native.textContent = '.card { border-radius: 8px; } .badge { border-radius: 50%; }';
  document.head.append(native);
  // jsdom omits the ownerNode that the browser exposes for a style element.
  Object.defineProperty(native.sheet!, 'ownerNode', { value: native });
  const sourceRule = native.sheet!.cssRules[0];
  const cssDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  const ruleDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'CSSStyleRule');
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { supports: () => true } });
  Object.defineProperty(globalThis, 'CSSStyleRule', {
    configurable: true,
    value: sourceRule.constructor,
  });
  const menu = document.createElement('style');
  const stop = startNativeCorners();
  try {
    menu.textContent = '.menu {border-radius: 4px;}';
    document.head.append(menu);
    await Promise.resolve();
    expect(menu.nextElementSibling?.textContent).toContain('corner-shape:round');
    expect(native.nextElementSibling?.textContent).toContain('8px * var(--squircle-k, 1)');
    stop();
    expect(document.querySelector('[data-woodfish-native-corners]')).toBeNull();
    expect(native.sheet!.cssRules[0]).toBe(sourceRule);
    expect(native.textContent).toBe('.card { border-radius: 8px; } .badge { border-radius: 50%; }');
  } finally {
    stop();
    native.remove();
    menu.remove();
    if (cssDescriptor) Object.defineProperty(globalThis, 'CSS', cssDescriptor);
    else Reflect.deleteProperty(globalThis, 'CSS');
    if (ruleDescriptor) Object.defineProperty(globalThis, 'CSSStyleRule', ruleDescriptor);
    else Reflect.deleteProperty(globalThis, 'CSSStyleRule');
  }
});
