# 输入框光标 `caret`

把 Codex 输入框的光标换成和 VS Code 里 Woodfish 光标一样的一套。默认值对应这些 VS Code 设置：

| VS Code 设置 | 值 | 这里的参数 |
| --- | --- | --- |
| `editor.cursorWidth` | 6 | `width` |
| `editor.cursorBlinking` | `solid` | `blinking` |
| `editor.cursorSmoothCaretAnimation` | `on` | `smoothCaretAnimation` |
| `woodfishTheme.cursor.enabled` | 开 | 这个效果的开关 |
| `woodfishTheme.cursor.animationDuration` / `borderRadius` | 8 s / 2 px（默认） | `flowSeconds` / `radius` |
| `woodfishTheme.glow.enabled` | 关 | `glow` 默认 0 |

光标的长相和 VS Code 里 Woodfish 的光标一样（`themes/shared/cursor-core.css`）：一个 900% 高的渐变在光标里慢慢往上滑。颜色“跟 VS Code 一样”：主题自带光标色（Dracula、Neon 等）就用主题的，没有的（Woodfish Dark）用 Woodfish 彩虹。

原生光标没法画渐变，所以这里把输入框的 `caret-color` 设成透明，在宿主报告的光标位置（`ctx.onCaret`，来源 `user`）画一根 div。关掉这个效果，原生光标立刻回来。

## 想改哪里

- 光标形状：`restyle()` 里的 `[data-woodfish-caret]`（宽高、圆角）。
- 闪烁节奏：`BLINK` 里的关键帧和 `1.06s`。
- 平滑移动的时长：`transition: transform 80ms`。
- 光标身后的拖尾是另一个效果：`caret-trail`。
