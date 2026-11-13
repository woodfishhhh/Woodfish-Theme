# 新字淡入 `text-reveal`

Codex 流式输出时，刚出现的字有一个很短的出场，写完就什么都不留。三种出场方式对应 playground（`docs/playground/streaming-text.html`）里的方案：

| `style` | 做法 | playground |
| --- | --- | --- |
| `fade`（默认） | 给正在写的段落加遮罩，最后一行里最近几段新字按出现时间从淡到实 | #1、#2 |
| `blur` | 新字上盖一小块背景模糊，随后淡掉 | #3 |
| `glow` | CSS Highlight API 给新字加一圈退去的微光 | #8 |

都不拆字、不包 span、不改回复的 DOM，所以长回复、高速输出也不卡。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `style` | `fade` | 出场方式 |
| `duration` | 120 ms | 新字从出现到完全正常的时间（`blur` 是 1.4 倍，`glow` 是 2 倍） |
| `start` | 0.15 | 淡入的起始浓度 |
| `sources` | `ai` | 只在 AI 吐字时，或者你打字也算 |

## 想改哪里

- 淡入曲线：`paintMask()` 里 `alpha` 的算法（现在是线性）。
- 模糊强度：`restyle()` 里的 `blur(3.5px)`。
- 发光颜色和大小：`restyle()` 里的 `::highlight(…)` 规则。
