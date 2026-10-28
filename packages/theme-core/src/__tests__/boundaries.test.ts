import * as fs from 'fs';
import * as path from 'path';

const SOURCE_ROOT = path.resolve(__dirname, '..');

function listSources(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : listSources(fullPath);
    }
    return entry.name.endsWith('.ts') ? [fullPath] : [];
  });
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('theme-core host independence', () => {
  const sources = listSources(SOURCE_ROOT).map((file) => ({
    file: path.relative(SOURCE_ROOT, file),
    code: stripComments(fs.readFileSync(file, 'utf-8')),
  }));

  it('has source files to check', () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  it('imports only its own relative modules', () => {
    for (const { file, code } of sources) {
      const specifiers = [...code.matchAll(/(?:from|import|require\()\s*['"]([^'"]+)['"]/g)].map(
        (match) => match[1]
      );
      const external = specifiers.filter((specifier) => !specifier.startsWith('.'));
      expect({ file, external }).toEqual({ file, external: [] });
    }
  });

  it('does not touch DOM, Node or Electron globals', () => {
    const forbidden =
      /\b(?:document|window|navigator|getComputedStyle|requestAnimationFrame|MutationObserver|process|Buffer|__dirname|acquireVsCodeApi)\b/;
    for (const { file, code } of sources) {
      // String literals such as the 'window' vibrancy material are data, not global access.
      const withoutStrings = code.replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
      expect({ file, match: forbidden.exec(withoutStrings)?.[0] ?? null }).toEqual({
        file,
        match: null,
      });
    }
  });
});
