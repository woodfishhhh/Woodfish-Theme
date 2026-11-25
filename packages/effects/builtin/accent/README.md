# 强调色点缀 `accent`

Codex 和 dsh 里三处强调色的小点缀，都是纯 CSS：

- 输入框聚焦时外圈一层强调色光晕（`composerGlow`）；
- 发送按钮用两种强调色的渐变（`sendButton`）；
- 当前标签下面一条慢慢流动的渐变短条（Codex 的右侧面板；dsh 的「对话 / 轨迹」和右侧面板），用的是 VS Code 标签栏那条渐变（`tabBar`）。

颜色取宿主的强调色变量（Codex 的 `--app-color-text-accent`，dsh 的 `--dsw-alias-state-business-primary`；选了 Woodfish 主题时会换成主题强调色），第二强调色取主题的 `--woodfish-codex-accent-2` / `--woodfish-dsh-accent-2`，没有就在 OKLCH 里转 60°。

侧栏选中会话的光谱环是另一个效果：`thread-ring`。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `composerGlow` | 开 | 输入框光晕 |
| `sendButton` | 开 | 渐变发送按钮 |
| `tabBar` | 开 | 标签下划线 |
| `glow` | 1 | 光晕和阴影的强弱 |
