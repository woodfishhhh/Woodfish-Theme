import { describeWriteFailure, isPermissionError } from '../services/runtime/errors';

function fsError(code: string): NodeJS.ErrnoException {
  const error = new Error(`${code}: operation not permitted`) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

describe('write failure guidance', () => {
  it('keeps non-permission errors as-is', () => {
    expect(describeWriteFailure(new Error('boom'), { platform: 'win32', targetPath: 'C:/x' })).toBe(
      'boom'
    );
    expect(isPermissionError(fsError('ENOENT'))).toBe(false);
  });

  it.each([
    ['linux', '/snap/code/123/usr/share/code/resources/app/out/x.html', 'Snap'],
    ['linux', '/usr/share/code/resources/app/out/x.html', 'chown'],
    [
      'darwin',
      '/private/var/folders/AppTranslocation/abc/Visual Studio Code.app/x',
      '/Applications',
    ],
    ['darwin', '/Applications/Visual Studio Code.app/x', 'App 管理'],
    ['darwin', '/Applications/Cursor.app/x', '程序坞'],
    ['win32', 'C:\\Program Files\\Microsoft VS Code\\x', '管理员'],
    ['win32', 'D:\\Application\\cursor\\resources\\app\\x', '杀毒软件'],
  ] as const)('explains %s permission failures (%s)', (platform, targetPath, hint) => {
    const message = describeWriteFailure(fsError('EPERM'), {
      platform,
      targetPath,
      appName: 'Cursor',
    });
    expect(message).toContain('没有权限写入');
    expect(message).toContain(hint);
  });
});
