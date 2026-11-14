# 流光边框 `thread-ring`

Codex 侧栏选中的会话，照抄 Bifrost 控制台「创建 Key」按钮（`.ui-button--bridge`，经 Bifrost 作者同意照抄）：

- 1.5px 透明边框里用 `border-box` 画七色 `conic-gradient` 光谱环，`@property` 角度 3.2 秒转一圈；
- `::after` 是里面干净的面（圆角 8.5px），悬停换成更亮一档；
- `::before` 是同一个光谱环向外扩 5px、`blur(14px)`、0.5 浓度的柔光晕，悬停 0.85 并上浮 1px；
- 没选中但在运行的会话用弱化版（光晕 0.2、不上浮）；
- 窗口在后台时停转，“减少动态”时不转。

七色默认用 Bifrost 的两套（深色 `#ff5f4e … #9b7bff`，浅色 `#e5432f … #7a52f0`），里面的面也是 Bifrost 的（深色 `#10142a`，浅色白色）。`followTheme` 打开后改用当前主题的颜色和底色。

替换了之前在 `docs/playground/tab-indicator.html` 里选的 #8 旋转流光边框。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `followTheme` | 关 | 用主题配色代替 Bifrost 七色 |
| `turnSeconds` | 3.2 s | 转一圈的时间 |
| `border` | 1.5 px | 光谱环粗细 |
| `radius` | 10 px | 圆角（面的圆角 = 圆角 − 粗细） |
| `halo` / `hoverHalo` / `runningHalo` | 0.5 / 0.85 / 0.2 | 光晕浓度：选中、悬停、运行中 |
| `lift` | 开 | 悬停上浮 1px |

## 想改哪里

- 七色：`BANDS`；里面的面：`FACE`。
- 光晕大小：`::before` 的 `inset: -5px` 和 `blur(14px)`。
- 运行中的样子：`${running}:not(${active})::before`。
