# 光标拖尾 `caret-trail`

文字光标移动时，身后拖一条单色的带子。和 VS Code 里 Animations 插件的 CursorAnimation 一样（照抄，MIT），作者 VS Code 里开着它、长度 12。

它订阅宿主的统一“光标”事件（`ctx.onCaret`）：

- VS Code：编辑器里的光标。VS Code 已经装了 Animations 插件的话，Woodfish 这一份默认关（`woodfishTheme.caretTrail.enabled`），免得画两条。
- Codex：输入框里你的光标，以及 AI 流式吐字时回复的末尾（AI 的“光标”）。`sources` 可以只跟其中一个。

AI 吐字换行时，拖尾直接从下一行开头重新开始（不往回扫过整行，免得一大块白色盖住刚出来的字）；你自己的光标换行或按 Home 时照插件原样扫过去。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `length` | 12 | 带子由多少个点连成（插件的 TrailLength） |
| `style` | `block` | `block` 实心带子，`line` 四条细线 |
| `width` | 6 px | 光标宽度（作者 VS Code 的 `editor.cursorWidth`）；宿主报告了宽度时用宿主的 |
| `color` | `#ffffff` | 单色，插件默认白色 |
| `followTheme` | 关 | 用当前主题的强调色 |
| `opacity` | 1 | 不透明度 |
| `sources` | `all` | 跟谁：你的光标、AI 吐字，或两个都跟 |

## 想改哪里

- 跟得更紧或更松：`step()` 里的 `0.42` / `0.35`。
- 带子形状、颜色：`draw()`。
- 只在打字时出现（光标用方向键移动时不出现）：把 `ctx.onCaret` 换成 `ctx.onInsert`（事件里也有 `x`、`y`、`height`）。
