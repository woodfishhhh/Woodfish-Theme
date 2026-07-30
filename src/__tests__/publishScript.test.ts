import * as fs from 'fs';
import * as path from 'path';

const publishScript = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'scripts', 'publish.js'),
  'utf8'
);

describe('publish script safety', () => {
  it('does not delete workspace files before verification', () => {
    expect(publishScript).not.toMatch(/\b(?:unlink|rm|rmdir)Sync\s*\(/);
  });

  it('keeps an explicit Marketplace publish confirmation', () => {
    expect(publishScript).toContain("readline.question('是否继续发布到市场？(y/N): '");
  });

  it('provides a virtual display for integration tests on headless Linux', () => {
    expect(publishScript).toContain("process.platform === 'linux' && !process.env.DISPLAY");
    expect(publishScript).toContain('xvfb-run -a npm run test:integration');
  });
});
