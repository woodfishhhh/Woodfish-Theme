import * as fs from 'fs';
import * as path from 'path';

const SOURCE_ROOT = path.resolve(__dirname, '..');

function listSources(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : listSources(fullPath);
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [fullPath] : [];
  });
}

function strip(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/`[^`]*`/g, '``');
}

describe('dsh-web boundaries', () => {
  const sources = listSources(SOURCE_ROOT).map((file) => ({
    file: path.relative(SOURCE_ROOT, file).split(path.sep).join('/'),
    code: fs.readFileSync(file, 'utf-8'),
  }));

  const isPure = (file: string): boolean =>
    !file.startsWith('renderer/') && !file.startsWith('client/') && !file.startsWith('host/');

  it('keeps external imports constrained per runtime boundary', () => {
    const allowedByLayer = (file: string): ReadonlySet<string> => {
      if (file.startsWith('host/')) {
        return new Set([
          'crypto',
          'fs',
          'os',
          'path',
          'node:http',
          'node:stream',
          '@deepseek-ai/schemastery',
        ]);
      }
      if (file.startsWith('client/')) {
        return new Set(['react']);
      }
      return new Set();
    };
    for (const { file, code } of sources) {
      const allowed = allowedByLayer(file);
      const unexpected = [...code.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)]
        .map((match) => match[1])
        .filter(
          (specifier) =>
            !specifier.startsWith('.') &&
            !specifier.startsWith('@woodfish/') &&
            !allowed.has(specifier)
        );
      expect({ file, unexpected }).toEqual({ file, unexpected: [] });
    }
  });

  it('keeps the pure entry free of DOM and Node globals', () => {
    const forbidden =
      /\b(?:document|window|location|getComputedStyle|requestAnimationFrame|MutationObserver|HTMLElement|process|Buffer)\b/;
    for (const { file, code } of sources.filter((source) => isPure(source.file))) {
      expect({ file, match: forbidden.exec(strip(code))?.[0] ?? null }).toEqual({
        file,
        match: null,
      });
    }
  });

  it('never imports renderer, client or host from the pure entry', () => {
    for (const { file, code } of sources.filter((source) => isPure(source.file))) {
      expect({
        file,
        imports: /from\s+['"]\.\.?\/(?:renderer|client|host)/.test(code),
      }).toEqual({
        file,
        imports: false,
      });
    }
  });
});
