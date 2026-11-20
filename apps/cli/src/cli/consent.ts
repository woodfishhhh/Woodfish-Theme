import { sha256 } from '../store';

/**
 * Shown before Codex is ever started with a debugging port. The hash of this text is what
 * consent is recorded against, so changing the wording asks the user again.
 */
export const RISK_TEXT = [
  '开启 Woodfish 注入效果前，请先了解：',
  '',
  '1. Woodfish 会以“远程调试端口”重新启动 Codex，用来把渐变、发光、毛玻璃等效果注入界面。',
  '2. 端口只监听本机（127.0.0.1），每次随机，并限制连接来源；但在 Codex 下次正常重启之前，',
  '   本机上的任何程序（包括这台电脑上的其他用户）都可以通过这个端口在 Codex 里执行代码，',
  '   能读取你的对话、操作你已登录的会话。',
  '3. Woodfish 不修改 Codex 的安装文件，只在页面中加入样式；随时可用',
  '   `woodfish codex stop-inject` 撤下效果，用 `woodfish codex relaunch --normal` 关闭端口。',
  '4. 这属于对客户端界面的非官方修改，Codex 更新后部分效果可能失效。',
  '',
  '只想换配色、不需要注入的话，可以改用 `woodfish codex theme apply`，它不会打开任何端口。',
].join('\n');

export const RISK_TEXT_SHA256 = sha256(RISK_TEXT);
