# 终端工具：静态配色

[安装说明与下载](../../apps/terminal/README.md) · [生成器](../../apps/terminal/generate.js)

终端包不安装服务、注入脚本或修改用户配置。`pnpm terminal:generate` 从 `WOODFISH_PALETTES` 枚举主题，按显示名关联 VS Code 扩展实际注册的 JSON/JSONC。提交 `apps/terminal/dist/`；`pnpm terminal:check` 比较文件内容并检查多余文件，不写产物。

| 宿主 | 取色与边界 |
|---|---|
| Ghostty / Windows Terminal | 16 色按 theme-core 的 ANSI 顺序映射。优先使用主题给终端指定的前景、背景、光标与选区；没有终端光标时用编辑器光标，再退到前景。透明色在终端背景上合成，不直接截掉 alpha。 |
| bat / Yazi 代码预览 | 共用 TextMate plist，保留原始规则顺序及字体样式。对实测有差异的 Python、TypeScript、Go、Rust 角色，按 VS Code 的 scope 栈求前景色并补到 Sublime 的对应 scope。不修改源主题。 |
| Yazi 界面 | 使用界面底色、选区、强调色及状态色；文件类别、边框和选项卡取语义相同的颜色，不新增图标。 |
| Starship / lsd / zsh | Starship 提供命名颜色；lsd 以 RGB 三元组设置长列表栏目；zsh 将命令、引号、参数、错误等映射到语法角色。三者都不更改用户布局和 shell 行为。 |

## 第一版验收

- 使用隔离 HOME 和配置目录，全量检查 15 套。bat 0.24 重建缓存并高亮 Python；lsd 1.2 输出长列表；Starship 1.27 输出提示符；zsh 5.9 通过 zsh-syntax-highlighting 0.7.1 匹配输入行。
- Yazi 26.9.1 在伪终端中逐套打开同一文件。终端应答明暗配色查询后，核对实际打开的 `flavor.toml` 和 `tmtheme.xml`、界面输出的背景色和 Python 预览，再正常退出；仅运行 `yazi --debug` 不足以验证 flavor。
- bat 的 ANSI 经 aha 转成 HTML，由无头 Chromium 截图；与 VS Code 1.147 的同名纯色主题、同一 Python 文件并排。VS Code 比较使用 TextMate 高亮，关闭语义高亮。
- bat 0.24 的 Python 语法给形参 `self` 和 `other` 完全相同的 scope 栈，插值里的 `obj.name` 属性名与裸变量也是如此。主题文件不能按单词或前一个 token 选色；不对共有 scope 套用特殊色。Rust 形参也有这个限制。
- Windows Terminal 的对象用微软 [profiles.schema.json](https://github.com/microsoft/terminal/blob/main/doc/cascadia/profiles.schema.json) 的 `SchemeList` 校验，未替换用户的 Terminal 配置。Ghostty 按[官方配置参考](https://ghostty.org/docs/config/reference)静态检查键、RGB 格式及 ANSI 0–15 的顺序，未实机渲染。

Ghostty 的可选 GLSL 后处理能读取当前及上一次光标的位置、颜色与时间，可以沿两点连线画短拖尾，在光标附近叠加发光。持续衰减可能需要额外重绘；第二版应在真实 GPU 上验证帧耗、静止时的功耗和浅色主题的对比度。第一版不包含着色器。
