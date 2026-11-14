# 吐字光标 `stream-cursor`

Codex 流式输出时，回复末尾跟着一根彩虹光标：随新字往右滑，换行时跳到下一行开头，生成结束就消失、不留任何元素。这是 `docs/playground/streaming-text.html` 里默认方案 #1 的光标部分；身后的单色拖尾是 `caret-trail`，新字淡入是 `text-reveal`，三者可以分开开关。

光标的长相和 VS Code 里 Woodfish 的光标一样（`themes/shared/cursor-core.css`）：一个 900% 高的渐变在光标里慢慢往上滑，颜色一直在变。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `width` | 6 px | 光标粗细（和输入框的彩虹光标一样） |
| `followTheme` | 关 | 关：Woodfish 彩虹；开：当前主题的光标色 |
| `flowSeconds` | 8 s | 彩虹流过一圈的时间 |
| `smooth` | 开 | 同一行里滑过去（80 ms，像 VS Code 的平滑光标），换行直接跳 |
| `radius` | 2 px | 圆角 |
| `gap` | 1 px | 和最后一个字的距离 |

## 想改哪里

- 块状光标：把 `width` 调到 8～10，或在 `restyle()` 里按 `caret.height` 算宽度。
- 闪烁：给 `[data-woodfish-stream-cursor]` 加一个 `animation`（例如 `steps(1)` 的透明度动画）。
- 发光：给 `[data-woodfish-stream-cursor]` 加 `box-shadow`。
