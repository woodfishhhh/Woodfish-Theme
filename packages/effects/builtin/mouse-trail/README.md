# 鼠标拖尾 `mouse-trail`

鼠标指针移动时，身后拖一条单色的带子。画法照抄 VS Code 的 Animations 插件（brandonkirbyson.vscode-animations，MIT），Codex 和 VS Code 都生效。

## 文件

| 文件 | 内容 |
| --- | --- |
| `effect.json` | 名字、说明、参数定义（默认值、范围、单位） |
| `params.json` | 现在用的值。Codex 设置 → 外观 → Woodfish 改的就是它；VS Code 用自己的设置 `woodfishTheme.mouseTrail.*`，参数名相同 |
| `effect.js` | 实现 |

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `length` | 12 | 带子由多少个点连成，越大拖得越长（插件的 TrailLength） |
| `style` | `block` | `block` 实心带子，`line` 四条细线（插件的 CursorStyle） |
| `width` / `height` | 7 / 15.4 px | 带子的宽和高（插件默认光标尺寸，高是宽的 2.2 倍） |
| `color` | `#ffffff` | 单色，插件默认白色 |
| `followTheme` | 关 | 打开后用当前主题的强调色 |
| `opacity` | 1 | 不透明度，1 是插件原样 |

## 想改哪里

- 颜色、长度、粗细：改 `params.json`（或在设置页拖滑块）。
- 跟得更紧或更松：`effect.js` 的 `step()` 里 `0.42`（横向）和 `0.35`（纵向）是每帧每个点向前一个点挪的比例，越大越紧、拖尾越短。
- 想要渐变色：`draw()` 里把 `fillStyle` 换成 `g.createLinearGradient(…)`，颜色可取 `ctx.theme().stops`。
- 带子形状：`draw()`。

## 性能

只在指针移动时逐帧绘制，指针停下、带子收拢后立刻停帧；窗口在后台或系统开了“减少动态”时不画。所有效果共用一块画布。
