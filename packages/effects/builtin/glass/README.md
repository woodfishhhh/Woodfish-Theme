# 浮层毛玻璃 `glass`

Codex 的菜单、弹窗、下拉和浮层用磨砂玻璃；弹出时轻轻落下（菜单）或放大淡入（弹窗），列表项和按钮上有一团跟着指针的柔光（Fluent Reveal）。主界面不动，Codex 自己的 Windows 11 Mica 照常。

默认值取 VS Code 的 Frosted Glass Theme 的观感：0.4 的薄玻璃、饱和度 150%。

亚克力滤镜（`ctx.lib.mountAcrylicFilter`）、噪点（`ctx.lib.noiseDataUri`）和指针柔光（`ctx.lib.startReveal`）是宿主提供的小工具，VS Code 里的毛玻璃也用同一套。

dsh 的菜单和弹出框本来就是毛玻璃，自带弹出动画：在 dsh 里这个效果只改 dsh 画浮层用的三个变量（`--dsw-menu-surface-fill`、`--dsw-specific-menu`、`--dsw-menu-backdrop-filter`），加上菜单项的指针柔光；`animations` 不起作用。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `mode` | `blur` | `blur` 模糊，`acrylic` 亚克力（模糊 + 颗粒） |
| `opacity` | 0.4 | 玻璃上那层底色的浓度 |
| `blur` | 24 px | 模糊半径 |
| `saturate` | 150% | 透过玻璃的颜色饱和度 |
| `noise` | 0.02 | 噪点浓度 |
| `borderRadius` | 0 | 圆角，0 保留 Codex 的 |
| `animations` | 开 | 弹出动画 |
| `reveal` | 开 | 跟随指针的柔光 |

## 想改哪里

- 哪些元素算卡面：宿主的 `ctx.selectors.floatingLayer`。毛玻璃和入场动画都只加在卡面，不加在外层定位容器，否则悬浮卡会离开触发行。
- 玻璃的边和阴影：`css()` 里的 `border-color`、`box-shadow`。
- 弹出动画：`woodfish-glass-drop` / `woodfish-glass-zoom` 关键帧和 200/250 ms。
- 柔光大小、颜色：`--woodfish-reveal-size`、`--woodfish-reveal-color`。
