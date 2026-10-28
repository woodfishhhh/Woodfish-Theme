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

describe('renderer-runtime host independence', () => {
  const sources = listSources(SOURCE_ROOT).map((file) => ({
    file: path.relative(SOURCE_ROOT, file),
    code: fs
      .readFileSync(file, 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, ''),
  }));

  it('imports only theme-core and its own modules', () => {
    for (const { file, code } of sources) {
      const specifiers = [...code.matchAll(/(?:from|import|require\()\s*['"]([^'"]+)['"]/g)].map(
        (match) => match[1]
      );
      const external = specifiers.filter(
        (specifier) => !specifier.startsWith('.') && specifier !== '@woodfish/theme-core'
      );
      expect({ file, external }).toEqual({ file, external: [] });
    }
  });

  it('does not use Node, Electron or VS Code APIs', () => {
    const forbidden = /\b(?:process|Buffer|__dirname|require|acquireVsCodeApi|monaco)\b/;
    for (const { file, code } of sources) {
      const withoutStrings = code.replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/`[^`]*`/g, '``');
      expect({ file, match: forbidden.exec(withoutStrings)?.[0] ?? null }).toEqual({
        file,
        match: null,
      });
    }
  });
});
