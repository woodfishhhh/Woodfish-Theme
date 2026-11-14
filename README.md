<p align="center">
  <img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/hero.png" width="100%" alt="Woodfish Dark 下的一段 TypeScript：渐变语法与发光">
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme"><img src="https://img.shields.io/visual-studio-marketplace/v/zhongjun.woodfish-theme?style=flat-square&label=Marketplace&color=69C3FF" alt="VS Code Marketplace version"></a>
  <a href="https://open-vsx.org/extension/zhongjun/woodfish-theme"><img src="https://img.shields.io/open-vsx/v/zhongjun/woodfish-theme?style=flat-square&label=Open%20VSX&color=C160EF" alt="Open VSX version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme"><img src="https://img.shields.io/visual-studio-marketplace/d/zhongjun.woodfish-theme?style=flat-square&label=Downloads&color=22ECDB" alt="VS Code Marketplace downloads"></a>
  <a href="./apps/vscode-extension/THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/license-MIT%20%2B%20GPL--3.0-EACD61?style=flat-square" alt="MIT and GPL-3.0 licensing"></a>
  <a href="https://code.visualstudio.com/"><img src="https://img.shields.io/badge/VS%20Code-%5E1.74.0-B78AFF?style=flat-square" alt="Requires VS Code 1.74 or newer"></a>
</p>

<p align="center">
  中文 · <a href="https://github.com/woodfishhhh/Woodfish-Theme/blob/HEAD/README.en.md">English</a> ·
  <a href="https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme">VS Code 安装</a> ·
  <a href="https://open-vsx.org/extension/zhongjun/woodfish-theme">Cursor / Kiro / Trae 安装</a> ·
  <a href="./apps/vscode-extension/docs/TROUBLESHOOTING.md">故障排查</a>
</p>

Woodfish Theme 给代码文字加上渐变和发光，再加上彩虹光标和毛玻璃。自带 5 套 Woodfish 主题（每套都有手工调好的渐变），另附 10 套热门主题；换成别的颜色主题也能用，渐变会照着同样的规律自动算出来。VS Code、Cursor、Kiro、Windsurf、Trae、VSCodium 都能用。

本页图片都由扩展实际的渲染代码生成：代码图来自 [render-readme-images.js](./apps/vscode-extension/scripts/render-readme-images.js)，「效果一览」和热门主题来自 [render-readme-effects.js](./apps/vscode-extension/scripts/promo/render-readme-effects.js)（和宣传片同一套逐帧渲染，动图是 WebP）；只有 Codex 设置页那张是真机截图。

## 效果预览

### 五套内置主题

**Woodfish Dark**：Bearded Theme Arc 的配色，渐变是 5.x 时手写的那一套。

<img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/theme-dark.png" width="100%" alt="Woodfish Dark">

**Woodfish Dracula**：Dracula 官方配色，关键字是粉到紫的渐变。

<img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/theme-dracula.png" width="100%" alt="Woodfish Dracula">

**Woodfish Black**：纯黑背景，适合 OLED 屏。

<img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/theme-black.png" width="100%" alt="Woodfish Black">

**Woodfish Neon**：深紫底的霓虹配色。

<img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/theme-neon.png" width="100%" alt="Woodfish Neon">

**Woodfish Light**：暖白底的浅色主题，渐变往深处走，发光是同色相的亮色。

<img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/theme-light.png" width="100%" alt="Woodfish Light">

### 十套热门主题

扩展还原样收录了 10 套热门的 MIT 许可主题，名字前加了 `Woodfish`，渐变和发光顺着各自的配色自动生成，效果开关同样适用（关掉就是纯配色）：

<table>
  <tr>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-onedark.webp" alt="Woodfish One Dark Pro"><br><sub>Woodfish One Dark Pro</sub></td>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-tokyonight.webp" alt="Woodfish Tokyo Night"><br><sub>Woodfish Tokyo Night</sub></td>
  </tr>
  <tr>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-catppuccin-mocha.webp" alt="Woodfish Catppuccin Mocha"><br><sub>Woodfish Catppuccin Mocha</sub></td>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-catppuccin-latte.webp" alt="Woodfish Catppuccin Latte"><br><sub>Woodfish Catppuccin Latte</sub></td>
  </tr>
  <tr>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-nord.webp" alt="Woodfish Nord"><br><sub>Woodfish Nord</sub></td>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-github-dark.webp" alt="Woodfish GitHub Dark"><br><sub>Woodfish GitHub Dark</sub></td>
  </tr>
  <tr>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-github-light.webp" alt="Woodfish GitHub Light"><br><sub>Woodfish GitHub Light</sub></td>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-nightowl.webp" alt="Woodfish Night Owl"><br><sub>Woodfish Night Owl</sub></td>
  </tr>
  <tr>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-ayu-mirage.webp" alt="Woodfish Ayu Mirage"><br><sub>Woodfish Ayu Mirage</sub></td>
    <td width="50%" align="center"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/theme-gruvbox-dark.webp" alt="Woodfish Gruvbox Dark"><br><sub>Woodfish Gruvbox Dark</sub></td>
  </tr>
</table>

来源与许可见 [THIRD_PARTY_NOTICES](./apps/vscode-extension/THIRD_PARTY_NOTICES.md)。

按 `Ctrl+K Ctrl+T`（macOS 为 `Cmd+K Cmd+T`）切换主题。

### 叠在任意主题上

不用内置主题也行。下面是 VS Code 自带的 Dark Modern，左边是原样，右边开了 Woodfish：渐变从每个词原来的颜色出发，沿色环转到更鲜艳的颜色，读起来不比原色费劲。

<table>
  <tr>
    <td width="50%"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/any-theme-before.png" alt="Dark Modern 原样"></td>
    <td width="50%"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/any-theme-after.png" alt="Dark Modern 开启 Woodfish"></td>
  </tr>
  <tr>
    <td align="center">Dark Modern 原样</td>
    <td align="center">开启 Woodfish</td>
  </tr>
</table>

## 效果一览

每个效果一张聚焦的图，会动的效果是动图。Codex 桌面版装好 Woodfish 后这些效果默认就开着（装法见下面的 [Codex 桌面端](#codex-桌面端)，一句话就能让 AI 帮你装），在 Codex 的 **设置 → 外观 → Woodfish 外观** 里能逐个开关、调参数；只想改颜色、大小、速度，在效果文件夹（`%APPDATA%\Woodfish\effects`）的 `user.css` 里写一行变量就行，变量清单在同一文件夹的 `README.md`。

<table>
  <tr>
    <td width="48%"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-rainbow-reply.webp" alt="Codex 里助手回复的正文是彩虹渐变"></td>
    <td><b>彩虹回复字</b> · Codex<br>助手回复的正文是一条按当前主题调好的彩虹渐变。纯 CSS，流式输出和很长的对话都不多花一帧。<br><sub>效果 <code>rainbow-text</code>；浓淡和方向：<code>--woodfish-rainbow-text-strength</code>、<code>--woodfish-rainbow-text-angle</code></sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-stream.webp" alt="AI 吐字时末尾的彩虹光标、身后的拖尾和粒子"></td>
    <td><b>吐字光标、拖尾和淡入</b> · Codex<br>AI 吐字时，末尾跟着一根彩虹光标，身后拖一段带子，新字轻轻淡入，还会迸出一点粒子。你打字和 AI 吐字触发的是同一套效果。<br><sub>效果 <code>stream-cursor</code>、<code>caret-trail</code>、<code>text-reveal</code>；例如 <code>--woodfish-caret-trail-color: #ff4d4f;</code>、<code>--woodfish-text-reveal-style: blur;</code></sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-thread-ring.webp" alt="侧栏选中的会话外圈是旋转的七色光谱环"></td>
    <td><b>选中会话的光环</b> · Codex<br>侧栏里选中的会话外圈是一道慢慢转的七色光谱环，外面一圈柔光；正在运行的会话亮一圈弱一些的光。<br><sub>效果 <code>thread-ring</code>；转一圈的秒数和光晕：<code>--woodfish-thread-ring-turn-seconds</code>、<code>--woodfish-thread-ring-halo</code></sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-glass.webp" alt="输入框的 / 命令菜单是毛玻璃，后面的彩虹字透出来"></td>
    <td><b>毛玻璃浮层</b> · Codex<br>菜单、<code>/</code> 命令、弹窗都是磨砂玻璃，弹出时淡入，后面的内容隐约透出来。VS Code 里的毛玻璃见下面的「毛玻璃」一节。<br><sub>效果 <code>glass</code>；模糊和不透明度：<code>--woodfish-glass-blur</code>、<code>--woodfish-glass-opacity</code></sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-background-off.webp" alt="关掉背景的 Codex"><br><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-background-on.webp" alt="铺上《彩云》的 Codex"></td>
    <td><b>窗口背景《彩云》</b> · Codex 与 VS Code<br>窗口底下铺一张图，侧栏和输入框是磨砂玻璃，文字照样清楚（上：关，下：开）。默认是《彩云》，也能换成你自己的图。<br><sub>Codex：设置 → 外观 → Woodfish 里「上传图片」，或 <code>woodfish codex background set &lt;图片&gt;</code>；VS Code：运行「设置背景图片」。浓淡：<code>--woodfish-background-opacity</code></sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-caret-trail.webp" alt="输入框里按 Home、End 时彩虹光标拖出一段带子"></td>
    <td><b>输入框光标和光标拖尾</b> · Codex<br>输入框里是和 VS Code 一样的 6px 彩虹光标；光标一跳（Home、End、点击）就拖出一段带子，画法照 VS Code Animations 插件。<br><sub>效果 <code>caret</code>、<code>caret-trail</code>；粗细、长度、颜色：<code>--woodfish-caret-width</code>、<code>--woodfish-caret-trail-length</code>、<code>--woodfish-caret-trail-color</code></sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-typing-particles.webp" alt="在输入框打字时迸出主题色光点"></td>
    <td><b>打字粒子</b> · Codex 与 VS Code<br>打字和 AI 吐字时，从光标处迸出一簇主题色的光点，没有震动和连击计数；吐字很快时自动限流。<br><sub>效果 <code>typing-particles</code>；数量、大小、配色：<code>--woodfish-typing-particles-count</code>、<code>--woodfish-typing-particles-size</code>、<code>--woodfish-typing-particles-colors: rainbow;</code>（VS Code 里是 <code>woodfishTheme.typingParticles.*</code>）</sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-ask-codex.webp" alt="对 Codex 说把打字粒子改成金色，它照 AGENTS.md 在 user.css 里写了三行"></td>
    <td><b>一句话让 Codex 改效果</b><br>效果文件夹里有一份写给 AI 的 <code>AGENTS.md</code>：对 Codex 或 Claude 说“把打字粒子改成金色，再大一点”，它会找到对应的效果，先在 <code>user.css</code> 里改变量，必要时才改参数或代码，改完自动刷新。<br><sub>说明文件：<code>%APPDATA%\Woodfish\effects\AGENTS.md</code></sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-user-css-gold.webp" alt="写进 user.css 之后，打字迸出金色、大一号的粒子"></td>
    <td><b><code>user.css</code> 一行改样子</b><br>每个效果参数都是一个 CSS 变量 <code>--woodfish-&lt;效果&gt;-&lt;参数&gt;</code>。写进效果文件夹的 <code>user.css</code>，保存一两秒就生效，升级不覆盖；画布上的拖尾和粒子也跟着变。图里是上一行那三行变量的结果。<br><sub>Codex 设置页有「打开 user.css」「恢复默认」；变量清单见效果文件夹的 <code>README.md</code></sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-settings.webp" alt="Codex 设置页里的 Woodfish 外观：主题卡片和效果插件"></td>
    <td><b>Codex 设置页「Woodfish 外观」</b><br>设置 → 外观 里多出一节：深色、浅色各选一套主题（15 套，点一下整个界面就换色），每个效果一行开关，「参数」展开全部滑块和取色器，顶上有「刷新效果」「全部恢复默认」。<br><sub>这一张是真机截图（Codex 26.1013，2026-11-14）</sub></td>
  </tr>
  <tr>
    <td><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/vscode-effects.webp" alt="VS Code 里打字时的光标拖尾和打字粒子"></td>
    <td><b>VS Code 里的同款</b><br>光标拖尾和打字粒子在 VS Code 里也有，默认关闭；和 Codex 共用同一个效果文件夹，改一次两边都变。<br><sub>设置里打开 <code>woodfishTheme.caretTrail.enabled</code>、<code>woodfishTheme.typingParticles.enabled</code></sub></td>
  </tr>
</table>

## 7.2 有什么新东西

- **特调渐变回来了**：`Woodfish Dark` 恢复 5.x 手写的那套颜色，`Dracula`、`Black`、`Neon`、`Light` 也按同样的手法调了一遍。
- **其他主题的渐变更好看**：自动计算改成照着特调的规律来，终点更鲜艳，普通文字是一条淡彩虹。
- **长名字、长段落不再断色**：VS Code 会把超过 50 个字符的词拆成几段显示，以前每段各算一次渐变，所以每隔 50 个字颜色就从头开始（Markdown 里最明显）。现在整段是一条渐变：

  7.1 及以前，彩虹在 `and` 那里又从粉色开始了一遍：

  <img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/long-before.png" width="100%" alt="7.1 及以前：一行 100 个字符的文字，彩虹在第 50 个字符处重新开始">

  7.2，从头到尾是一条：

  <img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/long-after.png" width="100%" alt="7.2：整行一条彩虹">

- **浅色主题的发光换成亮色**：以前用文字本身的深色发光，看起来像一圈阴影。

<details>
<summary><strong>7.0 的新功能</strong></summary>

- **支持 Cursor、Kiro、Windsurf、Trae、VSCodium**：同一个扩展，从各自的扩展面板（Open VSX）直接安装。
- **毛玻璃回来了**：菜单、悬浮提示、补全列表、命令面板、通知等 12 类浮层，可选普通模糊或亚克力质感，带 Reveal 光效和入场动画；VS Code 1.143 起与原生毛玻璃协同。
- **系统级透明窗口（实验）**：macOS vibrancy、Windows 11 亚克力 / 云母。
- **三套新主题**：`Woodfish Black`（纯黑）、`Woodfish Neon`（霓虹）、`Woodfish Light`（浅色）。
- **效果预设和光标配色**：6 套内置预设，可以保存自己的组合；8 套光标配色，也能自定义颜色。
- **卸载即还原**：卸载扩展后自动清理所有注入，不会再出现“卸载了光标还在”。
- **出错时说人话**：写入失败会按系统给出中文的处理办法；新增一键生成诊断信息，方便提 issue。
- **新手引导**：首次安装后在“欢迎”页里一步步带你开启效果。

</details>

## 它提供什么

- **渐变语法**：内置主题用特调，其他主题自动计算。运行时读取每个词的实际颜色，不依赖固定的 `mtk` 编号。
- **发光**：独立开关，强弱可调。深色主题用文字本身的颜色发光，浅色主题用同色相的亮色。
- **彩虹光标**：颜色、循环速度、圆角、尾迹模糊和透明度都能调，8 套配色可选。
- **毛玻璃**：12 类浮层，底色取自当前主题，不用改 `workbench.colorCustomizations`。
- **系统级透明窗口（实验）**：macOS vibrancy、Windows 11 亚克力 / 云母。
- **效果预设**：6 套内置组合，也能把自己调好的参数存成预设。
- **安全恢复**：写入前保存并校验备份，失败自动回滚；卸载后自动还原。
- **动效降级**：遵循系统的“减少动态效果”“降低透明度”和 `workbench.reduceMotion`。
- **状态栏**：显示 `on / paused / off`，用 `A / G / C / F` 标出正在生效的效果层。

### 发光

<table>
  <tr>
    <td width="50%"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/glow-off.png" alt="只开渐变"></td>
    <td width="50%"><img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/glow-on.png" alt="渐变加发光"></td>
  </tr>
  <tr>
    <td align="center">只开渐变</td>
    <td align="center">渐变 + 发光（默认强度）</td>
  </tr>
</table>

### 彩虹光标

光标的颜色会循环变化。下图是同一个光标在一个循环里的 6 个时刻：

<img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/cursor.png" width="40%" alt="彩虹光标一个颜色循环里的 6 个时刻">

## 三步开始

1. 安装 **Woodfish Theme**：
   - VS Code：从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme) 安装。
   - Cursor、Kiro、Windsurf、Trae、VSCodium：在扩展面板里搜索 `Woodfish Theme`（来自 [Open VSX](https://open-vsx.org/extension/zhongjun/woodfish-theme)）。
   - 让 AI 装：把这句话发给你的 AI：“运行 `code --install-extension zhongjun.woodfish-theme` 帮我装上 Woodfish Theme。”（Cursor 把 `code` 换成 `cursor`，其他编辑器同理）
2. 选一个你喜欢的颜色主题，想要特调效果就选 Woodfish Dark / Dracula / Black / Neon / Light 这五套。
3. 点右下角弹出的 **重新加载窗口**。

叠层默认开启，不会替你切换颜色主题。点击状态栏右下角的 `Woodfish ...` 打开功能菜单，可以开关各项效果、选预设、开毛玻璃。

<details>
<summary><strong>手动安装 VSIX</strong></summary>

从 [GitHub Releases](https://github.com/woodfishhhh/Woodfish-Theme/releases) 下载 `.vsix` 后运行（Cursor 把 `code` 换成 `cursor`，其他编辑器同理）：

```bash
code --install-extension woodfish-theme-7.2.0.vsix
```

</details>

## 支持的编辑器

| 编辑器 | 基于 VS Code | 从哪里安装 | 实测 |
|---|---|---|---|
| VS Code | 1.74+ | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme) | ✅ 1.143 |
| Cursor | 1.128 | 扩展面板（Open VSX） | ✅ 3.27 |
| VSCodium | 1.143 | 扩展面板（Open VSX） | ✅ 1.143 |
| Kiro | 1.131 | 扩展面板（Open VSX） | 结构已核对 |
| Windsurf / Devin | 1.126 | 扩展面板（Open VSX） | 结构已核对 |
| Trae / Trae CN | 1.107 | 扩展面板（Open VSX） | 结构已核对 |

“结构已核对”表示已逐项检查过该编辑器安装包里的 workbench 路径、安全策略（CSP）、校验和与主进程格式，与实测通过的编辑器一致。提示信息会显示你正在用的编辑器名字，比如“请重新加载 Cursor”。Remote SSH、WSL 和开发容器里同样有效：Woodfish 始终运行在本地界面这一侧。

## 毛玻璃

运行 `Woodfish Theme: 开启/关闭 Woodfish 毛玻璃`，或在功能菜单里打开。

<img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/glass.png" width="100%" alt="补全列表的毛玻璃效果，后面的代码透出来">

<sub>补全列表，毛玻璃透明度 0.5、模糊 14px</sub>

- **两种质感**：`blur` 是普通模糊加噪点，开销最低；`acrylic` 是 SVG 亚克力滤镜，质感更好。
- **作用范围**：菜单、悬浮提示、补全列表、命令面板、通知、查找框、下拉框、面包屑、调试工具栏、粘性滚动、面板标题、对话框，可以在 `woodfishTheme.glass.targets` 里逐项取舍。
- **Reveal 光效**：鼠标划过列表、按钮、标签页时跟随指针的柔光。
- **系统级透明窗口（实验）**：运行 `开启/关闭系统级透明窗口（实验）`，让整个窗口透出桌面。它会在编辑器的 `out/main.js` 开头加一行受保护的加载语句，需要完全退出编辑器才会生效，编辑器更新后要重新开启。目前只支持 macOS 和 Windows 11。

## 窗口背景

运行 `Woodfish Theme: 设置背景图片`，选一张自己的图片（JPG、PNG 或 WebP），或者用默认背景《彩云》、彩云渐变。图片铺在窗口底下，编辑器直接透出背景，侧边栏和面板用毛玻璃叠在上面，文字始终清楚。

- **默认观感**：背景图透出 15%，铺满居中；侧边栏和面板按 35% 的主题色叠在上面，模糊 10px、饱和度 150%，外加 10% 的亮度层。深色主题被压暗，浅色主题被提亮，颜色都跟着当前主题走。
- **可调项**：`woodfishTheme.background.opacity`（透明度）、`woodfishTheme.background.blur`（模糊）、`woodfishTheme.background.mask`（遮罩，越大越不透明），`woodfishTheme.background.enabled` 开关。改完重新加载窗口。
- **图片放在哪**：选中的图片会复制到 Woodfish 自己的存储目录，原图之后可以删除或移动。长边超过 2560 像素或体积超过 3 MB 的图片会先缩小并转成 WebP。
- 背景是窗口底下的一张静态图，滚动和输入时不做额外计算。

## 效果插件

光标拖尾、打字粒子是可插拔的效果插件，在设置的「效果插件」一节里打开（默认关闭）：

- **光标拖尾** `woodfishTheme.caretTrail.*`：照抄 VS Code Animations 插件的画法，文字光标身后拖一条单色带子（默认白色，长度 12，可改成跟随主题）。
- **打字粒子** `woodfishTheme.typingParticles.*`：打字时从光标处迸出一簇主题色的光点，像 Power Mode，没有震动和连击计数。
- 每个效果是 `%APPDATA%\Woodfish\effects`（macOS 在 `~/Library/Application Support/Woodfish/effects`）里的一个文件夹，`effect.js` 就是实现，可以直接改，也可以让 AI 照文件夹里的 `AGENTS.md` 帮你改，或者新建一个效果。改了文件或设置会自动刷新，也可以运行 `Woodfish Theme: 刷新效果`（`Ctrl+Alt+R`），**不用重新加载窗口**。同一个文件夹也给 Codex 用，改一次两边都变。只想换颜色、粗细、长度：在同一文件夹的 `user.css` 里写一行 CSS 变量，例如 `:root { --woodfish-caret-trail-color: #ff4d4f; }`，它最后加载、优先级最高，升级不覆盖；全部变量见文件夹里的 `README.md`。
- 只在有效果要画时才逐帧绘制，窗口在后台或开了“减少动态效果”时暂停。

## 效果预设

运行 `Woodfish Theme: 选择效果预设`：

| 预设 | 说明 |
|---|---|
| Woodfish 默认 | 渐变 + 发光 + 彩色光标，所有参数恢复默认 |
| 柔和护眼 | 更小的色相偏移、更弱的发光，适合长时间写代码 |
| 霓虹全开 | 加粗、1.6 倍的大光晕、更快的光标，加上毛玻璃和 Reveal |
| 怀旧（5.x） | 回到 5.x 的样子：代码加粗、和文字同色的大光晕（也可以在设置里把“代码效果风格”选成“怀旧”） |
| 毛玻璃 | 默认代码效果 + 亚克力毛玻璃 |
| 专注模式 | 只保留彩色光标，代码颜色交给主题 |
| 性能优先 | 保留渐变，关掉发光、光标尾迹和毛玻璃 |

调好一套自己喜欢的参数后，运行 `将当前效果保存为预设` 就能随时切回来。光标颜色可以用 `选择彩色光标配色` 单独换：跟随主题、彩虹、Dracula、赛博朋克、极光、日落、樱花、单色白，或者输入自己的颜色。

## 效果层与状态

```text
任意颜色主题
    └── Woodfish 通用叠层
        ├── A  渐变语法
        ├── G  文字发光
        ├── C  彩虹光标
        └── F  毛玻璃
```

| 状态栏 | 含义 |
| --- | --- |
| `on` | 叠层已开启，并检测到当前的注入内容 |
| `paused` | 效果开着，但注入内容缺失，通常运行一次“修复 Woodfish 注入”即可 |
| `off` | 叠层总开关关闭，或所有效果都关闭 |
| `A / G / C / F` | 渐变语法 / 文字发光 / 彩虹光标 / 毛玻璃已开启 |

> [!IMPORTANT]
> 效果是通过修改编辑器自带的 `workbench.html` 实现的，切换效果后需要重新加载窗口。写入前会做校验后的原子替换，并保存带哈希、路径和版本信息的备份。编辑器更新会覆盖这个文件，效果消失时运行 `Woodfish Theme: 修复 Woodfish 注入`。

<details>
<summary><strong>常用命令</strong></summary>

在命令面板（`Ctrl+Shift+P`）里搜索 `Woodfish`：

| 命令 | 用途 |
| --- | --- |
| `打开 Woodfish 功能菜单` | 按分组列出所有开关，状态栏入口也是它 |
| `开启 / 关闭 Woodfish 通用叠层` | 整体开关，关闭后保留参数 |
| `开启/关闭 Woodfish 彩色字体` | 切换渐变语法 |
| `开启/关闭 Woodfish 发光字体` | 切换文字发光 |
| `开启 Woodfish 彩色光标` / `开启/关闭彩色光标` | 启用并配置 / 快速切换彩虹光标 |
| `选择彩色光标配色` | 换光标颜色 |
| `开启/关闭 Woodfish 毛玻璃` | 切换浮层毛玻璃 |
| `开启/关闭系统级透明窗口（实验）` | 让整个窗口透出桌面 |
| `选择效果预设` / `将当前效果保存为预设` | 一键切换 / 保存参数组合 |
| `打开 Woodfish 设置` | 跳到设置页 |
| `刷新效果`（`Ctrl+Alt+R`） / `打开效果文件夹` | 重新加载效果插件（不重载窗口） / 打开效果文件夹 |
| `修复 Woodfish 注入` | 编辑器更新后效果消失时使用 |
| `生成 Woodfish 诊断信息` | 复制一份环境报告，提 issue 时直接粘贴 |
| `彻底停用 Woodfish 叠层` | 移除全部注入、备份和系统级窗口钩子 |

</details>

## 配置示例

所有设置都以 `woodfishTheme.` 开头，也可以运行 `打开 Woodfish 设置` 在图形界面里调：设置页分成“开关、彩色字体、发光字体、彩色光标、毛玻璃、透明窗口（实验）、高级”几组，所有效果开关都在最上面。下面是一组偏克制、带毛玻璃的配置：

```json
{
  "woodfishTheme.overlay.hueShift": 24,
  "woodfishTheme.overlay.lightnessDelta": 0.08,
  "woodfishTheme.glow.intensity": 0.8,
  "woodfishTheme.cursor.animationDuration": 8,
  "woodfishTheme.cursor.gradientStops": ["#ff2d95", "#ffd700", "#00ffff"],
  "woodfishTheme.cursor.glowOpacity": 0.55,
  "woodfishTheme.glass.enabled": true,
  "woodfishTheme.glass.mode": "acrylic",
  "woodfishTheme.glass.opacity": 0.75,
  "woodfishTheme.glass.reveal": true
}
```

| 设置 | 范围 | 默认 | 作用 |
|---|---|---|---|
| `overlay.hueShift` | `0 - 180` 度 | `32` | 渐变从原色沿色环转到终点的角度 |
| `overlay.lightnessDelta` | `0 - 0.5` | `0.12` | 渐变终点最多变亮或变暗多少 |
| `overlay.neutralChroma` | `0 - 0.4` | `0.075` | 普通文字上那条彩虹的浓淡 |
| `overlay.angle` | `0 - 360` 度 | `45` | 渐变方向，`45` 是从左下到右上 |
| `glow.intensity` | `0.1 - 3` | `1` | 发光强度倍率 |
| `cursor.animationDuration` | `1 - 60` 秒 | `8` | 光标颜色循环一圈的时间 |

- `overlay.*` 这四项只影响自动计算的渐变；内置主题的特调渐变自带颜色和方向。
- `glass.blur` / `glass.saturate` / `glass.opacity` / `glass.noise`：毛玻璃的模糊半径、饱和度、底色不透明度和颗粒强度。
- `syntaxGradient.customRules`、`glow.customRules`、`cursor.customRules`：在对应效果层之后追加自己的 CSS。

## 卸载与恢复

- **直接卸载就行**：卸载扩展后，下次完全重启编辑器时会自动还原 `workbench.html`、校验和与系统级窗口钩子。
- **想立刻恢复原样**：先运行 `彻底停用 Woodfish 叠层` 再卸载。
- **用这个扩展给 Codex 开过 Woodfish**：卸载扩展时一并撤下 Codex 里的效果、登录任务和开始菜单的“Woodfish Codex”，和 `从 Codex 卸载 Woodfish` 一样。
- **效果文件夹**：Woodfish 放进 `%APPDATA%\Woodfish\effects` 的文件卸载时删掉，你自己写过或改过的留下（还装着 `woodfish` 命令行时整个保留）。Codex 的外观设置和上传的背景图也留在 `%APPDATA%\Woodfish`，不需要的话直接删掉这个文件夹。
- 你的 `settings.json` 不会被改动。
- Woodfish 只清理自己写入的内容，其他扩展的注入不会被改动。

## 排查问题

<details>
<summary><strong>效果没有出现</strong></summary>

确认右下角状态栏显示 `Woodfish on`，并且重新加载过窗口。显示 `paused` 时运行 `修复 Woodfish 注入`。

</details>

<details>
<summary><strong>编辑器更新后效果消失</strong></summary>

编辑器更新会覆盖 `workbench.html`，运行 `修复 Woodfish 注入` 后重新加载窗口。

</details>

<details>
<summary><strong>提示“没有权限写入”</strong></summary>

- macOS：如果是在终端里用 `code .`、`cursor .` 启动的，macOS 会把写入算到终端头上。请完全退出编辑器，改从程序坞打开后运行 `修复 Woodfish 注入`。仍然不行的话，到“系统设置 → 隐私与安全性 → App 管理”里允许这个编辑器。
- Windows：安装在 `Program Files` 时，以管理员身份运行一次编辑器再修复，或者改用“用户安装版”。
- Linux：Snap、Flatpak 版的安装目录是只读的，无法注入，请改用官方 `.deb`、`.rpm` 或 `.tar.gz`。

</details>

<details>
<summary><strong>提示“安装似乎损坏”</strong></summary>

开启、修改或移除效果后，在完全退出编辑器之前这条提示会一直出现，重新加载窗口不会消失。完全退出再打开就好，这是编辑器只在启动时读取校验和导致的。

</details>

提 issue 前运行 `生成 Woodfish 诊断信息`，内容会复制到剪贴板，直接粘贴到 [issue](https://github.com/woodfishhhh/Woodfish-Theme/issues) 里。更多排查步骤见 [故障排查指南](./apps/vscode-extension/docs/TROUBLESHOOTING.md)。

## 已知限制

- **小地图（minimap）没有渐变**：小地图是 canvas 绘制的，CSS 改不了。
- **网页版和 Remote 服务器端**：效果只能注入到桌面版编辑器的本地界面。
- **JetBrains 系列（如 CLion）、Visual Studio**：它们不是基于 VS Code 的，Woodfish 无法支持。
- **截图类扩展（如 CodeSnap）**：截图里不会带上 Woodfish 的效果。

## Codex 桌面端

Woodfish 也能给 OpenAI Codex 桌面版换上同样的配色和效果：彩虹回复字、吐字光标和拖尾、选中会话的光环、毛玻璃、《彩云》背景（见上面的[效果一览](#效果一览)）。需要 Windows 10 / 11 上的 Microsoft Store 版 Codex。

**让 AI 帮你装**：把这句话发给你正在用的 AI（Codex、Claude Code、Cursor……都行），它会装好 Woodfish，让效果在 Codex 重启、更新、重新开机之后一直都在；要你拍板的地方（同意调试端口的风险说明、重启 Codex）会停下来问你。

```text
读 https://github.com/woodfishhhh/Woodfish-Theme/blob/main/docs/agent-install.md ，照里面的步骤帮我给 Codex 装上 Woodfish。
```

AI 打不开 GitHub 的话，把地址换成 `https://cdn.jsdelivr.net/gh/woodfishhhh/Woodfish-Theme@main/docs/agent-install.md`。

**自己装**，三步：

1. 二选一：
   - **用 VS Code**：装好本扩展，按 `Ctrl+Shift+P`，运行 **Woodfish Theme: 为 Codex 启用 Woodfish**。
   - **不用 VS Code**：从 [GitHub Release](https://github.com/woodfishhhh/Woodfish-Theme/releases/latest) 下载 `woodfish.exe`，双击。它没有代码签名，Windows 提示“Windows 已保护你的电脑”时，点“更多信息”，再点“仍要运行”。
2. 读一遍调试端口的风险说明，同意（exe 里输入 `yes`）。Codex 正开着的话，会先问你能不能重启它。
3. Codex 带着效果重新打开。exe 最后问“登录 Windows 后自动恢复效果吗”时输入 `y`（VS Code 的启用命令会自己开好），以后 Codex 重启、商店更新、重新开机，效果都会自己回来。

**装好以后**

<img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/v8.0.0/assets/readme/effects/codex-settings.webp" width="60%" alt="Codex 设置页里的 Woodfish 外观：深色、浅色主题卡片和效果插件">

- **换主题、开关效果**：Codex 的 **设置 → 外观 → Woodfish 外观**。15 套主题点一下就换，每个效果一行开关，「参数」里有它的全部滑块和取色。
- **让 AI 改效果**：对 Codex 或 Claude 说“把打字粒子改成金色，效果文件夹在 %APPDATA%\Woodfish\effects”，它会照文件夹里写给 AI 的 `AGENTS.md` 改好并刷新。
- **停用和卸载**：VS Code 里运行 **为 Codex 停用 Woodfish** 或 **从 Codex 卸载 Woodfish**。用 exe 的话，在 `woodfish.exe` 所在的文件夹打开终端：停用是 `.\woodfish.exe codex autostart off` 再 `.\woodfish.exe codex stop-inject`，全部撤销是 `.\woodfish.exe codex uninstall`。之后重启一次 Codex，调试端口就关了。
- **不碰你的 Codex**：Woodfish 不修改 Codex 的安装文件，也不修改、替换或删除你开始菜单、桌面、任务栏上的 Codex 快捷方式。用原来的快捷方式打开 Codex 时，它会在窗口出现前被带效果重启一次，所以比平时晚两三秒出窗口；想省掉这一步，`woodfish codex shortcut`（VS Code 启用成功的提示上也有这个按钮）在开始菜单另加一个直接带效果启动的“Woodfish Codex”。

只换配色、不开调试端口的原生配色，Codex++ 用户脚本，全部命令和效果插件的细节，见 [Woodfish 桌面工具](./apps/desktop-cli/README.md)。

## DeepSeek Harness（dsh）Web 版

dsh 的 Web 版（`dsh web`，本机 `127.0.0.1:3080`）可以通过油猴用户脚本换上同样的主题和效果：`woodfish dsh userscript` 输出脚本路径，装进 Tampermonkey / Violentmonkey 即可。详见 [dsh 适配说明](./docs/hosts/dsh.md)。

## 本地开发

```bash
pnpm install
pnpm compile
pnpm test
pnpm test:integration
pnpm lint
pnpm format:check
pnpm verify
pnpm package
```

仓库是 pnpm workspace monorepo，以上命令都在根目录运行。VS Code 扩展位于 `apps/vscode-extension/`，与宿主无关的颜色算法、渐变计算、特调表和调色板位于 `packages/theme-core/`，结构与边界见 [仓库结构](./docs/ARCHITECTURE.md)。

`pnpm test:integration` 会启动隔离的 VS Code 扩展宿主，验证开启、关闭和工作台恢复。扩展入口是 `apps/vscode-extension/src/extension.ts`；主题由 `apps/vscode-extension/scripts/generate-themes.js` 生成（`pnpm themes:generate`），渲染端脚本源码在 `apps/vscode-extension/browser/`（`pnpm runtime:build`），注入用 CSS 在 `apps/vscode-extension/themes/shared/`。README 里的图片由 `apps/vscode-extension/scripts/render-readme-images.js` 生成，改了渐变或效果后重跑一次。发布到 Open VSX 需要先设置环境变量 `OVSX_PAT`。

## 参与共建

随时欢迎共建，会看每一个 PR，每一位贡献者都会出现在下面这张图里。怎么提交见[参与贡献](./docs/CONTRIBUTING.md)。

[![Contributors](https://contrib.rocks/image?repo=woodfishhhh/Woodfish-Theme)](https://github.com/woodfishhhh/Woodfish-Theme/graphs/contributors)

用 Claude Code、Codex 这类 AI 写代码的话，推荐顺手装上 [讣告 · AI 的回收站](https://obituary.woodfish.site)（[GitHub](https://github.com/woodfishhhh/obituary)）：AI 留下的调试脚本、日志、截图到期自己走，AI 删掉的东西七天内都能找回，提 PR 前工作区也干净。最省事的装法是把这句话发给你的 agent：“读 https://obituary.woodfish.site/agent-install.md ，照里面的步骤帮我安装讣告并接入你自己。”想自己装：Windows 用 Scoop（`scoop bucket add obituary https://github.com/woodfishhhh/scoop-bucket`，再 `scoop install obituary`），macOS 用 Homebrew（`brew install --cask woodfishhhh/tap/obituary`），其他方式见讣告的[安装文档](https://github.com/woodfishhhh/obituary/blob/main/docs/install.md)。

## 项目信息

- [更新日志](./apps/vscode-extension/CHANGELOG.md)
- [参与贡献](./docs/CONTRIBUTING.md)
- [提交问题](https://github.com/woodfishhhh/Woodfish-Theme/issues)
- [许可与第三方主题声明](./apps/vscode-extension/THIRD_PARTY_NOTICES.md)
