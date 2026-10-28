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

function strip(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/`[^`]*`/g, '``');
}

describe('adapter-codex boundaries', () => {
  const sources = listSources(SOURCE_ROOT).map((file) => ({
    file: path.relative(SOURCE_ROOT, file).split(path.sep).join('/'),
    code: fs.readFileSync(file, 'utf-8'),
  }));

  it('depends only on Woodfish packages and its own modules', () => {
    for (const { file, code } of sources) {
      const external = [...code.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)]
        .map((match) => match[1])
        .filter((specifier) => !specifier.startsWith('.') && !specifier.startsWith('@woodfish/'));
      expect({ file, external }).toEqual({ file, external: [] });
    }
  });

  it('keeps the pure entry free of DOM access', () => {
    const forbidden =
      /\b(?:document|window|location|getComputedStyle|requestAnimationFrame|MutationObserver|HTMLElement|process|Buffer)\b/;
    for (const { file, code } of sources.filter((source) => !source.file.startsWith('renderer/'))) {
      expect({ file, match: forbidden.exec(strip(code))?.[0] ?? null }).toEqual({
        file,
        match: null,
      });
    }
  });

  it('never imports the renderer from the pure entry', () => {
    for (const { file, code } of sources.filter((source) => !source.file.startsWith('renderer/'))) {
      expect({ file, imports: /from\s+['"]\.\.?\/renderer/.test(code) }).toEqual({
        file,
        imports: false,
      });
    }
  });
});
