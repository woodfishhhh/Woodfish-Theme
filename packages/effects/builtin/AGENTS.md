# 怎么改 Woodfish 效果（写给 Codex、Claude 等 AI）

这个文件夹是 Woodfish 的效果目录（Windows：`%APPDATA%\Woodfish\effects`）。Codex 和 VS Code 里的 Woodfish 效果都从这里加载。用户说“帮我改一下出字的粒子”“鼠标尾巴换个颜色”时，就在这里改，改完按最后一节验证。

## 1. 先找到是哪个效果

| 用户说的 | 文件夹 |
| --- | --- |
| 打字 / AI 出字时迸出来的粒子、光点 | `typing-particles` |
| 鼠标指针后面的尾巴 | `mouse-trail` |
| 文字光标后面的尾巴、拖影 | `caret-trail` |
| Codex 输入框里的光标（粗细、颜色、闪烁、平滑） | `caret` |
| AI 回复时末尾跟着的彩虹光标 | `stream-cursor` |
| AI 回复时新字淡入 / 模糊变清晰 / 发光 | `text-reveal` |
| 左边侧栏选中会话的彩色边框、光晕 | `thread-ring` |
| 回复正文的彩虹字 | `rainbow-text` |
| 输入框光晕、发送按钮渐变、标签下划线 | `accent` |
| 菜单、弹窗的毛玻璃，弹出动画 | `glass` |
| 窗口背景图、侧栏和输入框的毛玻璃 | `background`（核心效果） |
| 代码块里的渐变色、代码发光 | `code-gradient`（核心效果） |

拿不准就读各文件夹的 `README.md` 和 `effect.json` 里的 `name`、`description`。

## 2. 一个效果文件夹里有什么

| 文件 | 内容 |
| --- | --- |
| `effect.json` | 名字、说明、在哪运行（`hosts`: `codex` / `vscode`）、默认开不开（`enabled`）、参数定义 |
| `params.json` | **现在用的值**：`enabled` 加每个参数。Codex 设置 → 外观 → Woodfish 改的就是这个文件，你改了它设置页也会显示新值 |
| `effect.js` | 实现（写法见第 4 节） |
| `effect.css` | 可选：效果打开时挂上的固定 CSS |
| `README.md` | 这个效果是什么、参数各管什么、改哪里会怎样 |

参数定义的格式（`effect.json` 的 `params`）：

```json
"size": { "type": "number", "default": 2.2, "min": 0.5, "max": 8, "step": 0.1, "unit": "px", "label": "粒子大小", "description": "光点半径" }
```

`type` 只有 `number`（要 `min`/`max`，可选 `step`、`unit`）、`boolean`、`select`（要 `options`: `[{ "value": "a", "label": "甲" }]`）、`color`（`#rrggbb`、颜色名或 `rgb()`/`hsl()`）。设置页按这些自动生成开关、滑块、下拉和取色器。

## 3. 只改参数（最常见）

改 `params.json` 里的值，例如粒子大一点：`"size": 4`。不在范围内的值会被夹到 `min`/`max`，不认识的键会被忽略，缺的键用默认值。要超出范围，先改 `effect.json` 里的 `min`/`max`。

VS Code 里 Woodfish 自带的三个效果（`mouse-trail`、`caret-trail`、`typing-particles`）不读 `params.json`，用 VS Code 自己的设置：`settings.json` 里的 `woodfishTheme.<效果名的驼峰>.<参数>`，例如 `woodfishTheme.typingParticles.size`、`woodfishTheme.mouseTrail.enabled`，参数名和这里一样。你新加的效果在 VS Code 里也读它自己的 `params.json`。

## 4. 改实现：`effect.js` 的写法

```js
module.exports = function (ctx) {
  // 启动：挂事件、建元素、写样式
  return {
    update(params) {}, // 可省略：没有 update 时，参数一变效果会整个重启
    dispose() {}, // 可省略：ctx 帮你挂的东西会自动清理
  };
};
```

`ctx` 提供的东西（宿主不同，用法一样）：

| 成员 | 作用 |
| --- | --- |
| `ctx.params` | 当前参数值（每次变化是一个新对象，所以用的时候再读） |
| `ctx.host` | `'codex'` 或 `'vscode'` |
| `ctx.theme()` | `{ mode: 'dark'/'light', stops: 主题渐变色数组, accent, accent2, background, foreground, cursor?: 主题自带的光标色, reply?: 回复正文渐变 }` |
| `ctx.rainbow` | Woodfish 彩虹（VS Code 光标那套颜色） |
| `ctx.onInsert(fn)` | **插入了文字**：VS Code 里你打字、Codex 里你打字或 AI 流式吐字都会触发。`fn({ x, y, height, text, source: 'user'/'ai', rate, rects, block, node, start })`，`x`/`y` 是插入末尾在窗口里的位置 |
| `ctx.onCaret(fn)` | **光标动了**：你的光标，或 AI 吐字的末尾。`fn({ x, y, width, height, source, visible })`，`visible` 为假表示光标没了 |
| `ctx.onStreamEnd(fn)` | AI 这一段回复写完了 |
| `ctx.onTheme(fn)` | 主题或深浅色变了 |
| `ctx.painter(fn)` | 在全窗口共用的画布上逐帧画：`fn(g, now, dt)`，`g` 是 Canvas 2D，坐标就是窗口坐标；返回 `false` 表示画完了，停帧；之后 `painter.wake()` 再开始 |
| `ctx.layer` | 全窗口的覆盖层（不接收鼠标），自己的元素放这里 |
| `ctx.style(css)` | 这个效果的样式（每次调用替换上一次的） |
| `ctx.on(target, type, fn, options)` | 挂事件，停用时自动取消 |
| `ctx.later(ms, fn)` | `setTimeout`，停用时自动取消 |
| `ctx.selectors` | 宿主界面的选择器，例如 Codex 的 `composer`、`composerEditor`、`threadRow`、`activeThread`、`runningThread`、`assistantMarkdown`、`bodyText`、`activeTab`、`floatingLayer`；VS Code 的 `editorRoot` |
| `ctx.lib` | 宿主小工具（`startReveal`、`mountAcrylicFilter`、`noiseDataUri` 等，见 `glass`） |
| `ctx.simplified()` | 窗口在后台或系统开了“减少动态”：只保留静态部分，别做动画 |
| `ctx.log(text)` | 写进 Woodfish 的日志 |

另外，`effect.json` 的每个参数都会变成 CSS 变量 `--woodfish-<效果名>-<参数>`（数字带单位），只写 `effect.css` 也能做效果。窗口在后台时 `<html>` 上有 `data-woodfish-paused`，CSS 动画可以据此暂停。

### 必须遵守

- 只通过 `ctx` 挂事件、画布、样式、计时器，这样关掉效果时能清理干净。自己写 `addEventListener`、`setInterval`、`requestAnimationFrame` 的，必须在 `dispose` 里清掉。
- 不改宿主（Codex、VS Code）自己的 DOM 结构：不拆字、不包 `span`、不移动节点。只读、只加样式、只往 `ctx.layer` 放自己的元素（给宿主元素加 `data-*` 属性或行内样式可以，用完要撤掉）。
- 只在需要时动：`painter` 没东西画就返回 `false`；`ctx.simplified()` 为真时不做动画。长回复、高速输出、打字都不能卡。
- 不联网、不读写文件、不碰别人的 `localStorage`。
- 按严格模式写：VS Code 把效果当 ES module 加载，未声明的变量会直接报错。

## 5. 新增一个效果

新建文件夹，名字用小写字母、数字和横线（例如 `my-sparkles`），放 `effect.json`（至少 `name`、`hosts`、`params`）和 `effect.js`（或只放 `effect.css`）。保存后自动加载，设置页会按 `effect.json` 自动出现它的开关和参数。可以照着 `typing-particles` 写。

## 6. 验证

1. **刷新**：保存文件后，Codex 和 VS Code 会在一两秒内自动重新加载效果。也可以手动：
   - 命令行：`woodfish reload`（Codex 和 VS Code 一起刷新，并列出每个效果的状态）；
   - Codex 里按 `Ctrl+Alt+R`，或设置 → 外观 → Woodfish 的「刷新效果」；
   - VS Code 里运行命令「Woodfish: 刷新效果」（`Ctrl+Alt+R`）。
2. **看状态**：`woodfish codex effects` 列出每个效果：运行中、已关闭、失败（带原因，语法错误带行号）。

   命令行里找不到 `woodfish` 时（很多人是在 Woodfish 仓库里用 `pnpm woodfish` 跑的），直接用 `node "%LOCALAPPDATA%\Woodfish\woodfish.js" codex effects`（WSL 里用 `node.exe`），打开过 Codex 自动恢复就有这份。连这份也没有就不用跑命令：保存即刷新，让用户在设置页看状态。
3. **看效果**：让用户看一眼，或者截图。

出错的效果会被自动跳过并报错，不会影响 Codex 和其他效果。改坏了：`woodfish codex effects restore <效果名>` 恢复出厂文件（你改过的文件会留一份 `.bak`）；参数改乱了：`woodfish codex effects reset <效果名>`。

## 7. 不要动

- `.woodfish-shipped.json`：Woodfish 靠它判断哪些文件被改过，升级时不覆盖改过的文件。
- 这个文件夹以外的 Woodfish 文件。
