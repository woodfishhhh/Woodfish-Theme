# 打字粒子 `typing-particles`

插入文字时，从光标处迸出一簇光点，颜色取主题的渐变色。像作者开着的 Power Mode，但没有震动（可开）和连击计数。

它订阅宿主的统一“插入文字”事件（`ctx.onInsert`），谁打的字都一样：

- VS Code：你在编辑器里打字。
- Codex：你在输入框里打字，以及 AI 流式吐出的每一段新字。`sources` 可以只要其中一种。

AI 吐字很快，所以粒子按每秒 240 颗限流（`MAX_PER_SECOND`），长回复也不会越积越多。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `count` | 8 | 每插入一次迸出多少颗 |
| `size` | 2.2 px | 光点半径 |
| `speed` | 170 | 初速度（像素/秒） |
| `spread` | 150° | 以正上方为中心的扇形角度 |
| `gravity` | 450 | 向下的加速度（像素/秒²），负数往上飘 |
| `life` | 650 ms | 存活时间 |
| `colors` | `theme` | `theme` 主题渐变色，`rainbow` Woodfish 彩虹，`single` 单色 |
| `color` | `#ffffff` | 单色时的颜色 |
| `sources` | `all` | 谁触发：你、AI，或都触发 |
| `shake` | 关 | 打字时编辑区轻轻一抖 |

## 想改哪里

- 颜色：`palette()`。比如只要强调色：`return [ctx.theme().accent]`。
- 形状：`painter` 里的 `g.arc(…)`，换成 `g.fillRect(…)` 就是方块，画星形用路径。
- 轨迹：`painter` 里的速度、重力、`drag`（空气阻力，0.9 越小停得越快）。
- 迸出的位置：`ctx.onInsert` 里 `x: event.x, y: event.y + event.height * 0.6`。
