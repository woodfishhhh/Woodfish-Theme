import { buildSquircleCss, prepareCornerRadii } from '../squircle';

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
