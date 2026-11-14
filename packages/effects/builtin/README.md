# Woodfish 效果文件夹：用 CSS 自定义

这个文件夹（Windows：`%APPDATA%\Woodfish\effects`）放着 Codex 和 VS Code 里 Woodfish 的所有效果，每个效果一个子文件夹。想改颜色、粗细、速度这类样子，**先用 `user.css`**：写一行 CSS 就行，Woodfish 升级也不会动它。只有换画法、加新效果时才去改效果文件夹里的代码（写法见 `AGENTS.md`）。

## user.css

- **在哪**：就在这个文件夹里，`user.css`（Windows：`%APPDATA%\Woodfish\effects\user.css`）。Codex 设置 → 外观 →「Woodfish 外观」里有「打开 user.css」按钮。
- **优先级最高**：Codex 和 VS Code 里它都排在宿主和 Woodfish 所有样式的后面，同样的写法它说了算。
- **生效**：保存后一两秒自动生效。也可以手动刷新：`woodfish reload`、Codex 里按 `Ctrl+Alt+R` 或点「刷新效果」、VS Code 里运行「Woodfish: 刷新效果」。
- **升级不覆盖**：Woodfish 只在你从没改过时更新这个模板，改过就不再碰它。删掉也不会再生成；想要回模板就「恢复默认」。
- **恢复默认**：设置页「user.css」那一行的「恢复默认」，或运行 `woodfish codex effects restore user.css`。你原来的内容会留一份 `user.css.bak`。

### 怎么写

每个效果的每个参数都是一个 CSS 变量，名字是 `--woodfish-<效果名>-<参数名>`（参数名的大写字母换成「-小写」，例如 `followTheme` → `follow-theme`）。写在 `:root` 上：

```css
:root {
  --woodfish-caret-trail-color: #ff4d4f; /* 光标拖尾换成红色 */
  --woodfish-caret-trail-length: 20; /* 拖得更长 */
  --woodfish-caret-trail-opacity: 0.6; /* 淡一点 */
}
```

- 值的写法：数字可以带表里的单位（`8px`、`3.2s`；秒和毫秒可以互换），也可以不带；颜色用 `#rrggbb`、颜色名、`rgb()`、`hsl()`；开关写 `1` 或 `0`；选项写选项的值（表里的英文）。数字会被夹在范围内；写错的值直接忽略，继续用原来的。
- 光标拖尾、打字粒子这些画在画布上的效果也读这些变量，不用改代码。
- 设置页的滑块和 `user.css` 改了同一个参数时，`user.css` 优先，设置页那一项会标「user.css 覆盖」。
- 只在深色或浅色时改：Codex 里写 `:root[data-theme="light"] { … }` 或 `:root[data-theme="dark"] { … }`；VS Code 里写 `:root:has(.monaco-workbench.vs) { … }`（浅色）。
- 参数变量必须写在 `:root` 上才对所有效果生效。下面「额外变量」那张表里的变量本来就是 CSS，写在别的选择器上也行（比如只给某一类元素换色）。
- `user.css` 里也可以写任何别的 CSS，直接改 Codex 或 VS Code 自己的界面。

### 常用例子

```css
:root {
  /* 打字粒子：金色、大一点 */
  --woodfish-typing-particles-colors: single;
  --woodfish-typing-particles-color: gold;
  --woodfish-typing-particles-size: 3.2px;

  /* 侧栏选中会话的光环：蓝紫色、粗一点、转慢一点、光晕淡一点 */
  --woodfish-thread-ring-stops: #5b8cff, #9b7bff, #ff5fa2, #5b8cff;
  --woodfish-thread-ring-border: 2px;
  --woodfish-thread-ring-turn-seconds: 6s;
  --woodfish-thread-ring-halo: 0.3;

  /* 回复正文换成自己的渐变 */
  --woodfish-rainbow-text-gradient: linear-gradient(120deg, #ffd1dc, #c1e1ff, #d4f5c4);

  /* 菜单毛玻璃：更透、更糊 */
  --woodfish-glass-opacity: 0.25;
  --woodfish-glass-blur: 32px;

  /* Codex 输入框光标：纯白、细一点 */
  --woodfish-caret-stops: #ffffff, #ffffff;
  --woodfish-caret-width: 3px;

  /* 窗口背景：遮罩更深、图片更清楚 */
  --woodfish-background-mask: 0.6;
  --woodfish-background-opacity: 0.3;
}
```

## 额外变量

不是参数，是效果自己的 CSS 里留的口子，写在 `:root` 或任何元素上都行。它们只在 Codex 里有（这些效果只在 Codex 运行）。

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-caret-stops` | 输入框光标的渐变色，从上往下流动；最后一个颜色写成和第一个一样才能无缝循环 | 主题自带的光标色，没有就是 Woodfish 彩虹 | `--woodfish-caret-stops: #ffffff, #ffffff;` |
| `--woodfish-stream-cursor-stops` | AI 吐字时末尾彩虹光标的渐变色，写法同上 | Woodfish 彩虹（打开「跟随主题」时用主题色） | `--woodfish-stream-cursor-stops: #ffd25e, #ff5f4e, #ffd25e;` |
| `--woodfish-thread-ring-stops` | 侧栏选中会话的光谱环颜色，顺时针；首尾同色转起来才没有接缝 | Bifrost 七色：`#ff5f4e, #ff9b3d, #ffd25e, #4fd18b, #38c6c8, #5b8cff, #9b7bff, #ff5f4e`（浅色主题略深） | `--woodfish-thread-ring-stops: #5b8cff, #9b7bff, #5b8cff;` |
| `--woodfish-thread-ring-face` | 光环里面的底色 | 深色 `#10142a`，浅色 `#ffffff` | `--woodfish-thread-ring-face: #1b1b1f;` |
| `--woodfish-thread-ring-face-hover` | 鼠标悬停时的底色 | 深色 `#171c36`，浅色 `#eef0f7` | `--woodfish-thread-ring-face-hover: #26262c;` |
| `--woodfish-rainbow-text-gradient` | 回复正文的整条渐变，任何 CSS 渐变都行 | 当前主题特调的正文渐变 | `--woodfish-rainbow-text-gradient: linear-gradient(90deg, #f6d365, #fda085);` |
| `--woodfish-text-reveal-color` | 新字发光（`text-reveal` 的出场方式选「新字发光」时）的颜色 | 主题强调色 | `--woodfish-text-reveal-color: #ffd700;` |
| `--woodfish-accent` | `accent`：输入框光晕、发送按钮、标签下划线的主色 | Codex 强调色 | `--woodfish-accent: #ff7a59;` |
| `--woodfish-accent-alt` | `accent`：渐变的第二个颜色 | 主题第二强调色，没有就把主色转 60° | `--woodfish-accent-alt: #ffcf5c;` |
| `--woodfish-reveal-color` | `glass`：菜单项跟着指针的柔光颜色 | 深色 `rgb(255 255 255 / 9%)`，浅色 `rgb(0 0 0 / 6%)` | `--woodfish-reveal-color: rgb(120 160 255 / 14%);` |
| `--woodfish-reveal-size` | `glass`：柔光的半径 | `120px` | `--woodfish-reveal-size: 180px;` |

## 参数变量

每个效果的全部参数。默认值是 Woodfish 自带的值，你在设置页或 `params.json` 里改过的，以那边为准，`user.css` 再盖在上面。VS Code 里光标拖尾、打字粒子的值来自 VS Code 设置（`woodfishTheme.*`），`user.css` 同样能盖过它们。

<!-- 参数变量清单：scripts/css-variables.js 按各效果的 effect.json 生成，别手改 -->

### 输入框光标（`caret`，Codex）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-caret-width` | 光标宽度：VS Code 的 editor.cursorWidth（默认 6）。范围 1–16px | `6px` | `--woodfish-caret-width: 10px;` |
| `--woodfish-caret-blinking` | 闪烁方式：VS Code 的 editor.cursorBlinking（默认 solid）；打字时总是常亮。可选 `solid` 不闪烁、`blink` 闪烁、`smooth` 柔和闪烁、`phase` 渐隐渐现、`expand` 伸缩 | `solid` | `--woodfish-caret-blinking: blink;` |
| `--woodfish-caret-smooth-caret-animation` | 平滑移动：VS Code 的 editor.cursorSmoothCaretAnimation（默认 on），移动用 80 ms。可选 `on` 总是平滑、`explicit` 只在点击和方向键移动时、`off` 关 | `on` | `--woodfish-caret-smooth-caret-animation: explicit;` |
| `--woodfish-caret-colors` | 颜色：跟 VS Code 一样：主题自带光标色时用主题的，否则用 Woodfish 彩虹（Woodfish Dark 是彩虹）。可选 `auto` 跟 VS Code 一样、`rainbow` Woodfish 彩虹、`theme` 主题色 | `auto` | `--woodfish-caret-colors: rainbow;` |
| `--woodfish-caret-flow-seconds` | 变色周期：woodfishTheme.cursor.animationDuration（默认 8 秒）。范围 1–60s | `8s` | `--woodfish-caret-flow-seconds: 23s;` |
| `--woodfish-caret-radius` | 圆角：woodfishTheme.cursor.borderRadius（默认 2）。范围 0–8px | `2px` | `--woodfish-caret-radius: 4px;` |
| `--woodfish-caret-glow` | 发光：光标外的一圈柔光；默认 0（关闭）。范围 0–1 | `0` | `--woodfish-caret-glow: 0.25;` |

### 光标拖尾（`caret-trail`，Codex、VS Code）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-caret-trail-length` | 拖尾长度：带子由多少个点连成（默认 12，和 VS Code Animations 插件的 TrailLength 一样）。范围 2–50 | `12` | `--woodfish-caret-trail-length: 24;` |
| `--woodfish-caret-trail-style` | 样式：Animations 插件的 CursorStyle。可选 `block` 实心带子、`line` 四条细线 | `block` | `--woodfish-caret-trail-style: line;` |
| `--woodfish-caret-trail-width` | 宽度：光标宽度（默认 6）；宿主报告了光标宽度时用宿主的。范围 1–24px | `6px` | `--woodfish-caret-trail-width: 12px;` |
| `--woodfish-caret-trail-color` | 颜色：单色，Animations 插件默认白色。写 #rrggbb、颜色名、rgb() 或 hsl() | `#ffffff` | `--woodfish-caret-trail-color: #ff4d4f;` |
| `--woodfish-caret-trail-follow-theme` | 颜色跟随主题：打开后用当前主题的强调色。1 开，0 关 | `0` | `--woodfish-caret-trail-follow-theme: 1;` |
| `--woodfish-caret-trail-opacity` | 不透明度：1 是插件原样。范围 0.05–1 | `1` | `--woodfish-caret-trail-opacity: 0.75;` |
| `--woodfish-caret-trail-sources` | 跟随谁：Codex 里 AI 流式吐字时，末尾也算一个光标。可选 `all` 你的光标和 AI 吐字、`user` 只跟你的光标、`ai` 只跟 AI 吐字 | `all` | `--woodfish-caret-trail-sources: user;` |

### 打字粒子（`typing-particles`，Codex、VS Code）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-typing-particles-count` | 每次粒子数：每插入一次文字迸出多少颗。范围 1–40 | `8` | `--woodfish-typing-particles-count: 18;` |
| `--woodfish-typing-particles-size` | 粒子大小：光点半径。范围 0.5–8px | `2.2px` | `--woodfish-typing-particles-size: 4.1px;` |
| `--woodfish-typing-particles-speed` | 迸出速度：初速度（像素/秒），越大飞得越远。范围 20–600 | `170` | `--woodfish-typing-particles-speed: 320;` |
| `--woodfish-typing-particles-spread` | 散开角度：以正上方为中心的扇形角度，360 是四面八方。范围 10–360deg | `150deg` | `--woodfish-typing-particles-spread: 240deg;` |
| `--woodfish-typing-particles-gravity` | 重力：向下的加速度（像素/秒²），负数会往上飘。范围 -400–1500 | `450` | `--woodfish-typing-particles-gravity: 930;` |
| `--woodfish-typing-particles-life` | 存活时间：每颗粒子从出现到消失的时间。范围 100–2000ms | `650ms` | `--woodfish-typing-particles-life: 1150ms;` |
| `--woodfish-typing-particles-colors` | 颜色：主题渐变色取当前主题的光标色；单色用下面的颜色。可选 `theme` 主题渐变色、`rainbow` Woodfish 彩虹、`single` 单色 | `theme` | `--woodfish-typing-particles-colors: rainbow;` |
| `--woodfish-typing-particles-color` | 单色颜色：颜色选“单色”时用。写 #rrggbb、颜色名、rgb() 或 hsl() | `#ffffff` | `--woodfish-typing-particles-color: #ff4d4f;` |
| `--woodfish-typing-particles-sources` | 谁触发：Codex 里 AI 流式输出也算“打字”。可选 `all` 你打字和 AI 吐字、`user` 只在你打字时、`ai` 只在 AI 吐字时 | `all` | `--woodfish-typing-particles-sources: user;` |
| `--woodfish-typing-particles-shake` | 震动：打字时编辑区轻轻一抖（默认关闭）。1 开，0 关 | `0` | `--woodfish-typing-particles-shake: 1;` |

### 吐字光标（`stream-cursor`，Codex）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-stream-cursor-width` | 光标粗细：默认 6，和输入框的彩虹光标一样粗。范围 1–16px | `6px` | `--woodfish-stream-cursor-width: 10px;` |
| `--woodfish-stream-cursor-follow-theme` | 颜色跟随主题：关：Woodfish 彩虹（VS Code 光标的颜色）；开：当前主题的光标色。1 开，0 关 | `0` | `--woodfish-stream-cursor-follow-theme: 1;` |
| `--woodfish-stream-cursor-flow-seconds` | 变色周期：彩虹在光标里流过一圈的时间（VS Code 光标是 8 秒）。范围 1–60s | `8s` | `--woodfish-stream-cursor-flow-seconds: 23s;` |
| `--woodfish-stream-cursor-smooth` | 平滑移动：在同一行里滑过去（像 VS Code 的 cursorSmoothCaretAnimation），换行总是直接跳。1 开，0 关 | `1` | `--woodfish-stream-cursor-smooth: 0;` |
| `--woodfish-stream-cursor-radius` | 圆角：光标的圆角。范围 0–8px | `2px` | `--woodfish-stream-cursor-radius: 4px;` |
| `--woodfish-stream-cursor-gap` | 离字的距离：光标和最后一个字之间的空隙。范围 0–8px | `1px` | `--woodfish-stream-cursor-gap: 3px;` |

### 新字淡入（`text-reveal`，Codex）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-text-reveal-style` | 出场方式：playground 里的 #1/#2 是淡入，#3 模糊变清晰，#8 新字发光。可选 `fade` 淡入、`blur` 模糊变清晰、`glow` 新字发光 | `fade` | `--woodfish-text-reveal-style: blur;` |
| `--woodfish-text-reveal-duration` | 时长：新字从出现到完全正常的时间。范围 40–1200ms | `120ms` | `--woodfish-text-reveal-duration: 420ms;` |
| `--woodfish-text-reveal-start` | 起始浓度：淡入时新字一开始有多实（0 是完全透明）。范围 0–0.9 | `0.15` | `--woodfish-text-reveal-start: 0.4;` |
| `--woodfish-text-reveal-sources` | 谁触发：输入框里你自己打的字默认不做出场。可选 `ai` 只在 AI 吐字时、`all` AI 吐字和你打字 | `ai` | `--woodfish-text-reveal-sources: all;` |

### 流光边框（`thread-ring`，Codex）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-thread-ring-follow-theme` | 跟随主题配色：关：Bifrost 的七色光谱（深浅色各一套）；开：当前主题的颜色和底色。1 开，0 关 | `0` | `--woodfish-thread-ring-follow-theme: 1;` |
| `--woodfish-thread-ring-turn-seconds` | 转一圈：光谱环转一圈的时间（Bifrost 是 3.2 秒）。范围 0.5–30s | `3.2s` | `--woodfish-thread-ring-turn-seconds: 10.6s;` |
| `--woodfish-thread-ring-border` | 光谱环粗细：Bifrost 是 1.5px。范围 0.5–6px | `1.5px` | `--woodfish-thread-ring-border: 3px;` |
| `--woodfish-thread-ring-radius` | 圆角：Bifrost 小号按钮是 10px（里面的面是 8.5px）。范围 0–16px | `10px` | `--woodfish-thread-ring-radius: 14px;` |
| `--woodfish-thread-ring-halo` | 光晕：选中时外圈柔光的浓度（Bifrost 0.5）。范围 0–1 | `0.5` | `--woodfish-thread-ring-halo: 0.75;` |
| `--woodfish-thread-ring-hover-halo` | 悬停光晕：鼠标放上去时的浓度（Bifrost 0.85）。范围 0–1 | `0.85` | `--woodfish-thread-ring-hover-halo: 0.6;` |
| `--woodfish-thread-ring-running-halo` | 运行中光晕：没选中但在运行的会话用同一效果的弱化版，光晕更淡。范围 0–1 | `0.2` | `--woodfish-thread-ring-running-halo: 0.45;` |
| `--woodfish-thread-ring-lift` | 悬停上浮：鼠标放到选中的会话上时上浮 1px。1 开，0 关 | `1` | `--woodfish-thread-ring-lift: 0;` |

### 回复正文彩虹（`rainbow-text`，Codex）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-rainbow-text-colors` | 颜色：主题渐变：Woodfish 主题用特调的正文彩虹，其他主题用光标色向正文色收拢；彩虹：VS Code 光标那套。可选 `theme` 主题渐变、`rainbow` Woodfish 彩虹 | `theme` | `--woodfish-rainbow-text-colors: rainbow;` |
| `--woodfish-rainbow-text-strength` | 鲜艳程度：Woodfish 彩虹（以及没有特调的主题）里颜色占多少，其余是正文色。范围 10–100% | `42%` | `--woodfish-rainbow-text-strength: 64%;` |
| `--woodfish-rainbow-text-angle` | 渐变角度：Woodfish 彩虹的方向；主题特调的渐变用它自己的角度。范围 0–360deg | `135deg` | `--woodfish-rainbow-text-angle: 225deg;` |

### 强调色点缀（`accent`，Codex）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-accent-composer-glow` | 输入框光晕：输入框聚焦时外圈一层强调色光晕。1 开，0 关 | `1` | `--woodfish-accent-composer-glow: 0;` |
| `--woodfish-accent-send-button` | 渐变发送按钮：发送按钮用两种强调色的渐变。1 开，0 关 | `1` | `--woodfish-accent-send-button: 0;` |
| `--woodfish-accent-tab-bar` | 标签下划线：右侧面板当前标签下面一条慢慢流动的渐变短条（VS Code 标签栏那条渐变）。1 开，0 关 | `1` | `--woodfish-accent-tab-bar: 0;` |
| `--woodfish-accent-glow` | 光晕强度：输入框光晕和发送按钮阴影的强弱。范围 0–2 | `1` | `--woodfish-accent-glow: 1.5;` |

### 浮层毛玻璃（`glass`，Codex）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-glass-mode` | 玻璃类型：亚克力是 Fluent 的做法：模糊 + 淡淡的颗粒。可选 `blur` 模糊、`acrylic` 亚克力（带颗粒） | `blur` | `--woodfish-glass-mode: acrylic;` |
| `--woodfish-glass-opacity` | 不透明度：玻璃上那层底色的浓度；默认 0.4，和 VS Code 的 Frosted Glass Theme 一样。范围 0.15–1 | `0.4` | `--woodfish-glass-opacity: 0.6;` |
| `--woodfish-glass-blur` | 模糊：背后内容的模糊半径。范围 0–60px | `24px` | `--woodfish-glass-blur: 39px;` |
| `--woodfish-glass-saturate` | 饱和度：透过玻璃的颜色更鲜艳一些。范围 100–250% | `150%` | `--woodfish-glass-saturate: 190%;` |
| `--woodfish-glass-noise` | 颗粒：叠一层很淡的噪点，大面积玻璃不显得平。范围 0–0.2 | `0.02` | `--woodfish-glass-noise: 0.07;` |
| `--woodfish-glass-border-radius` | 圆角：0 表示保留 Codex 自己的圆角。范围 0–16px | `0px` | `--woodfish-glass-border-radius: 4px;` |
| `--woodfish-glass-animations` | 弹出动画：菜单轻轻落下、弹窗放大淡入（和 VS Code 里一样的曲线）。1 开，0 关 | `1` | `--woodfish-glass-animations: 0;` |
| `--woodfish-glass-reveal` | 跟随指针的柔光：列表项和按钮上跟着指针移动的一团柔光（Fluent Reveal）。1 开，0 关 | `1` | `--woodfish-glass-reveal: 0;` |

### 窗口背景（`background`，Codex）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-background-opacity` | 透明度：背景图透出来的程度（默认 0.15）。范围 0–1 | `0.15` | `--woodfish-background-opacity: 0.4;` |
| `--woodfish-background-blur` | 模糊：侧栏和输入框毛玻璃的模糊半径。范围 0–60px | `10px` | `--woodfish-background-blur: 25px;` |
| `--woodfish-background-mask` | 遮罩：侧栏和输入框盖在背景上的主题色浓度。范围 0–1 | `0.35` | `--woodfish-background-mask: 0.6;` |
| `--woodfish-background-saturate` | 饱和度：毛玻璃里透出的颜色饱和度。范围 100–250% | `150%` | `--woodfish-background-saturate: 190%;` |
| `--woodfish-background-luminosity` | 亮度层：毛玻璃上叠的一层亮度（Frosted Glass 的 luminosity 10%）。范围 0–0.6 | `0.1` | `--woodfish-background-luminosity: 0.25;` |
| `--woodfish-background-size` | 图片缩放：铺满会裁掉多出来的部分。可选 `cover` 铺满、`contain` 完整显示 | `cover` | `--woodfish-background-size: contain;` |
| `--woodfish-background-position` | 图片位置：图片对齐的位置。可选 `center` 居中、`top` 靠上、`bottom` 靠下、`left` 靠左、`right` 靠右 | `center` | `--woodfish-background-position: top;` |

### 代码渐变（`code-gradient`，Codex）

| 变量 | 作用 | 默认值 | 示例 |
| --- | --- | --- | --- |
| `--woodfish-code-gradient-angle` | 渐变角度：每个 token 里渐变的方向。范围 0–360deg | `45deg` | `--woodfish-code-gradient-angle: 135deg;` |
| `--woodfish-code-gradient-hue-shift` | 色相偏移：推导渐变时终点相对起点转多少度（主题没有手调渐变的颜色才用）。范围 0–180 | `32` | `--woodfish-code-gradient-hue-shift: 77;` |
| `--woodfish-code-gradient-lightness-delta` | 亮度变化：推导渐变时终点比起点亮多少（OKLCH 的 L）。范围 0–0.5 | `0.12` | `--woodfish-code-gradient-lightness-delta: 0.25;` |
| `--woodfish-code-gradient-neutral-chroma` | 灰色的彩度：灰色 token（标点、注释）推导渐变时给的彩度。范围 0–0.4 | `0.075` | `--woodfish-code-gradient-neutral-chroma: 0.175;` |
| `--woodfish-code-gradient-glow` | 代码发光：代码文字带一层柔和光晕（默认关闭）。1 开，0 关 | `0` | `--woodfish-code-gradient-glow: 1;` |
| `--woodfish-code-gradient-glow-intensity` | 发光强度：发光打开时的强弱。范围 0.1–3 | `1` | `--woodfish-code-gradient-glow-intensity: 1.7;` |

<!-- 参数变量清单结束 -->
