import * as fs from 'fs';
import * as path from 'path';

type ConfigurationSection<T> = {
  id?: string;
  title: string;
  properties: Record<string, T>;
};

type ManifestWithSettings<T> = {
  contributes: { configuration: ConfigurationSection<T>[] };
};

export function readSettingSections<T = Record<string, unknown>>(): ConfigurationSection<T>[] {
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf-8')
  ) as ManifestWithSettings<T>;
  return manifest.contributes.configuration;
}

// The settings UI groups settings into sections; tests usually only care about the merged map.
export function readSettingSchemas<T = Record<string, unknown>>(): Record<string, T> {
  return Object.assign({}, ...readSettingSections<T>().map((section) => section.properties));
}
