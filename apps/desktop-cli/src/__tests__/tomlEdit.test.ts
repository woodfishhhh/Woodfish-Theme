import { TomlEditError, editToml, parseToml, readTomlValue } from '../codex/tomlEdit';

const DARK = ['desktop', 'appearanceDarkChromeTheme'];
const DARK_SEMANTIC = [...DARK, 'semanticColors'];
const DARK_FONTS = [...DARK, 'fonts'];

/** Same shape as a real Codex config: theme tables far apart, sub-tables split. */
const FIXTURE = [
  'model = "gpt-6"',
  '# keep this comment',
  '',
  "[projects.'c:\\users\\me\\desktop']",
  'trust_level = "trusted"',
  '',
  '[desktop]',
  'appearanceTheme = "system"',
  'notes = """',
  '[desktop.appearanceDarkChromeTheme]',
  'accent = "#000000"',
  '"""',
  '',
  '[desktop.appearanceLightChromeTheme]',
  'accent = "#007acc"',
  'contrast = 45',
  '',
  '[mcp_servers.demo]',
  'command = "npx"',
  '',
  '[desktop.appearanceDarkChromeTheme]',
  'accent = "#339cff"   # my accent',
  'contrast = 60',
  'ink = "#ffffff"',
  'opaqueWindows = false',
  'surface = "#181818"',
  '',
  '[desktop.appearanceDarkChromeTheme.fonts]',
  '',
  '[desktop.appearanceDarkChromeTheme.semanticColors]',
  'diffAdded = "#40c977"',
  'diffRemoved = "#fa423e"',
  'skill = "#ad7bf9"',
  '',
].join('\n');

function changedLines(before: string, after: string): string[] {
  const left = before.split('\n');
  const right = after.split('\n');
  return right.filter((line, index) => line !== left[index]);
}

describe('editToml', () => {
  it('replaces values in place and keeps comments, spacing and other tables', () => {
    const { text, createdTables } = editToml(FIXTURE, {
      sets: [
        { table: DARK, key: 'accent', value: '#ff2e97' },
        { table: DARK, key: 'contrast', value: 70 },
        { table: DARK, key: 'opaqueWindows', value: true },
        { table: DARK_SEMANTIC, key: 'skill', value: '#b967ff' },
      ],
    });
    expect(createdTables).toEqual([]);
    expect(changedLines(FIXTURE, text)).toEqual([
      'accent = "#ff2e97"   # my accent',
      'contrast = 70',
      'opaqueWindows = true',
      'skill = "#b967ff"',
    ]);
    // The look-alike header inside the multi-line string is untouched.
    expect(text).toContain('[desktop.appearanceDarkChromeTheme]\naccent = "#000000"\n"""');
    const parsed = parseToml(text);
    expect(readTomlValue(parsed, ['desktop'], 'notes')).toContain('accent = "#000000"');
    expect(readTomlValue(parsed, DARK, 'accent')).toBe('#ff2e97');
    expect(readTomlValue(parsed, ['mcp_servers', 'demo'], 'command')).toBe('npx');
  });

  it('inserts missing keys after the last key of their section', () => {
    const { text } = editToml(FIXTURE, {
      sets: [{ table: ['desktop', 'appearanceLightChromeTheme'], key: 'ink', value: '#24292f' }],
    });
    expect(text).toContain(
      'accent = "#007acc"\ncontrast = 45\nink = "#24292f"\n\n[mcp_servers.demo]'
    );
  });

  it('creates missing tables at the end, including required empty sub-tables', () => {
    const minimal = 'model = "gpt-6"\n';
    const { text, createdTables } = editToml(minimal, {
      ensureTables: [DARK, DARK_FONTS, DARK_SEMANTIC],
      sets: [
        { table: DARK, key: 'accent', value: '#ff2e97' },
        { table: DARK_SEMANTIC, key: 'skill', value: '#b967ff' },
      ],
    });
    expect(text).toBe(
      [
        'model = "gpt-6"',
        '',
        '[desktop.appearanceDarkChromeTheme]',
        'accent = "#ff2e97"',
        '',
        '[desktop.appearanceDarkChromeTheme.fonts]',
        '',
        '[desktop.appearanceDarkChromeTheme.semanticColors]',
        'skill = "#b967ff"',
        '',
      ].join('\n')
    );
    expect(createdTables).toEqual([DARK, DARK_FONTS, DARK_SEMANTIC]);
  });

  it('preserves CRLF line endings, a BOM and a missing final newline', () => {
    const crlf = '\uFEFF[desktop.appearanceDarkChromeTheme]\r\naccent = "#339cff"\r\ncontrast = 60';
    const { text } = editToml(crlf, {
      sets: [
        { table: DARK, key: 'accent', value: '#ff2e97' },
        { table: DARK, key: 'ink', value: '#ffffff' },
      ],
    });
    expect(text).toBe(
      '\uFEFF[desktop.appearanceDarkChromeTheme]\r\naccent = "#ff2e97"\r\ncontrast = 60\r\nink = "#ffffff"'
    );
  });

  it('removes keys and empty tables it created', () => {
    const created = editToml('model = "x"\n', {
      ensureTables: [DARK, DARK_SEMANTIC],
      sets: [
        { table: DARK, key: 'accent', value: '#ff2e97' },
        { table: DARK_SEMANTIC, key: 'skill', value: '#b967ff' },
      ],
    }).text;
    const restored = editToml(created, {
      removes: [
        { table: DARK, key: 'accent' },
        { table: DARK_SEMANTIC, key: 'skill' },
      ],
      removeTablesIfEmpty: [DARK_SEMANTIC, DARK],
    }).text;
    expect(parseToml(restored)).toEqual({ model: 'x' });
  });

  it('refuses inline tables, dotted keys, duplicates and complex values', () => {
    const cases: Array<[string, string]> = [
      ['[desktop]\nappearanceDarkChromeTheme = { accent = "#000000" }\n', '内联表'],
      ['[desktop.appearanceDarkChromeTheme]\nsemanticColors.skill = "#000000"\n', '点号键'],
      ['[desktop.appearanceDarkChromeTheme]\naccent = """\n#000000"""\n', '不是简单值'],
    ];
    for (const [text, reason] of cases) {
      expect(() =>
        editToml(text, {
          sets: [
            { table: DARK, key: 'accent', value: '#ff2e97' },
            { table: DARK_SEMANTIC, key: 'skill', value: '#ff2e97' },
          ],
        })
      ).toThrow(reason);
    }
  });

  it('refuses unparseable files and unsafe strings without guessing', () => {
    expect(() => editToml('a = = 1', { sets: [] })).toThrow(TomlEditError);
    expect(() =>
      editToml(FIXTURE, { sets: [{ table: DARK, key: 'accent', value: 'x"\ny' }] })
    ).toThrow('不支持的字符');
  });

  it('handles quoted table headers and keys', () => {
    const text = '["desktop".\'appearanceDarkChromeTheme\']\n"accent" = "#339cff"\n';
    const result = editToml(text, { sets: [{ table: DARK, key: 'accent', value: '#ff2e97' }] });
    expect(result.text).toBe('["desktop".\'appearanceDarkChromeTheme\']\n"accent" = "#ff2e97"\n');
  });
});
