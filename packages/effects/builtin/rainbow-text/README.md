# 回复正文彩虹 `rainbow-text`

Codex 助手回复的段落、标题、列表和表格文字用渐变色。纯 CSS（`background-clip: text`）：流式输出时新字一出来就带颜色，长对话也不需要脚本逐段处理。链接、代码和公式保留原色。

颜色“主题渐变”时：Woodfish 的 5 套内置主题用手调的正文彩虹（`packages/theme-core/src/palettes/gradientPresets.ts`，宿主通过 `ctx.theme().reply` 给出），其他主题用主题光标色向正文色收拢（`strength`%）。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `colors` | `theme` | `theme` 主题渐变，`rainbow` Woodfish 彩虹 |
| `strength` | 42% | 彩虹里颜色占多少，其余是正文色（越大越鲜艳、越难读） |
| `angle` | 135° | Woodfish 彩虹的方向 |

## 想改哪里

- 哪些文字上色：宿主的 `ctx.selectors.bodyText`（段落、标题、列表项、表格单元格）。
- 不上色的部分：`:is(a, code, pre, .katex, [data-code-block])`。
