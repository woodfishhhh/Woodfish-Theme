import { CONFIG_SECTION, FEATURE_SETTING_KEYS, OVERLAY_SETTING_KEYS } from '../constants/config';
import { readSettingSections } from './support/settingsSchema';

type SettingSchema = {
  markdownDescription?: string;
  order?: number;
  enum?: string[];
  enumDescriptions?: string[];
};

const sections = readSettingSections<SettingSchema>();

function sectionKeys(title: string): string[] {
  const section = sections.find((candidate) => candidate.title === title);
  if (!section) {
    throw new Error(`missing settings section ${title}`);
  }
  return Object.entries(section.properties)
    .sort(([, left], [, right]) => (left.order ?? 0) - (right.order ?? 0))
    .map(([key]) => key);
}

describe('settings layout', () => {
  it('splits settings into ordered, Chinese-titled sections', () => {
    expect(sections.map((section) => section.title)).toEqual([
      '开关',
      '彩色字体',
      '发光字体',
      '彩色光标',
      '毛玻璃',
      '透明窗口（实验）',
      '高级',
    ]);
    for (const section of sections) {
      expect(section.id?.startsWith(CONFIG_SECTION)).toBe(true);
    }
  });

  it('puts the master switch and every effect switch together at the top', () => {
    expect(sectionKeys('开关')).toEqual([
      `${CONFIG_SECTION}.${OVERLAY_SETTING_KEYS.enabled}`,
      ...Object.values(FEATURE_SETTING_KEYS).map((key) => `${CONFIG_SECTION}.${key}`),
    ]);
  });

  it('keeps custom CSS and maintenance settings out of the everyday sections', () => {
    const advanced = sectionKeys('高级');
    for (const key of advanced) {
      expect(sections.filter((section) => key in section.properties)).toHaveLength(1);
    }
    expect(advanced).toEqual(
      expect.arrayContaining([
        'woodfishTheme.syntaxGradient.customRules',
        'woodfishTheme.glow.customRules',
        'woodfishTheme.cursor.customRules',
        'woodfishTheme.runtime.fixChecksums',
        'woodfishTheme.presets.custom',
      ])
    );
  });

  it('describes every setting briefly and explains every enum value', () => {
    for (const section of sections) {
      for (const [key, schema] of Object.entries(section.properties)) {
        expect(schema.markdownDescription?.length ?? 0).toBeGreaterThan(0);
        expect(schema.markdownDescription?.length ?? 0).toBeLessThanOrEqual(160);
        expect(schema.markdownDescription).not.toMatch(/效果：|原理：|为什么要有这个项|OKLCH/);
        if (schema.enum) {
          expect({ key, count: schema.enumDescriptions?.length }).toEqual({
            key,
            count: schema.enum.length,
          });
        }
      }
    }
  });
});
