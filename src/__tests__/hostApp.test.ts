jest.mock('vscode', () => ({ env: { appName: 'Cursor' } }), { virtual: true });

import { formatHostName, hostName } from '../ui/hostApp';

describe('formatHostName', () => {
  it('shortens Microsoft builds and keeps fork names', () => {
    expect(formatHostName('Visual Studio Code')).toBe('VS Code');
    expect(formatHostName('Visual Studio Code - Insiders')).toBe('VS Code Insiders');
    expect(formatHostName('Cursor')).toBe('Cursor');
    expect(formatHostName('Kiro')).toBe('Kiro');
    expect(formatHostName('Trae CN')).toBe('Trae CN');
  });

  it('reads the running editor from vscode.env', () => {
    expect(hostName()).toBe('Cursor');
  });

  it('falls back to VS Code when the host reports nothing', () => {
    expect(formatHostName(undefined)).toBe('VS Code');
    expect(formatHostName('  ')).toBe('VS Code');
  });
});
