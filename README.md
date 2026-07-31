<p align="center">
  <img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/assets/readme/hero.png" width="100%" alt="Woodfish Theme：为任意 VS Code 颜色主题叠加渐变语法、可调发光和彩虹光标">
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme"><img src="https://img.shields.io/visual-studio-marketplace/v/zhongjun.woodfish-theme?style=flat-square&label=Marketplace&color=69C3FF" alt="VS Code Marketplace version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme"><img src="https://img.shields.io/visual-studio-marketplace/d/zhongjun.woodfish-theme?style=flat-square&label=Downloads&color=22ECDB" alt="VS Code Marketplace downloads"></a>
  <a href="./THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/license-MIT%20%2B%20GPL--3.0-EACD61?style=flat-square" alt="MIT and GPL-3.0 licensing"></a>
  <a href="https://code.visualstudio.com/"><img src="https://img.shields.io/badge/VS%20Code-%5E1.74.0-B78AFF?style=flat-square" alt="Requires VS Code 1.74 or newer"></a>
</p>

<p align="center">
  中文 · <a href="https://github.com/woodfishhhh/Woodfish-Theme/blob/HEAD/README.en.md">English</a> ·
  <a href="https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme">安装扩展</a> ·
  <a href="./docs/TROUBLESHOOTING.md">故障排查</a>
</p>

Woodfish Theme 6 是一个默认开启的 VS Code 视觉叠层：它保留当前颜色主题的原始配色，再为代码文字自动计算 OKLCH 渐变与发光，也可以独立启用彩虹光标。内置的 Bearded 与 Dracula 只是可选基底，不再是使用特效的前提。

## 效果预览

<p align="center">
  <img src="https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/assets/readme/dracula-preview.png" width="100%" alt="Woodfish Dracula 在 VS Code 中的克制渐变语法、分层发光、主题光标与完整工作台效果">
</p>

叠层从每个 token 的当前原色自动生成 OKLCH 渐变：原色固定在中点，默认组合 `ΔL ±0.060` 与色相 `±24°`，再映射为兼容旧版 VS Code 内核的 sRGB 色值。白色、灰色等低色度文字会从当前主题的主要强调色自动取得色相，因此普通前景色也有可见渐变与发光；标点使用更弱的光晕。上图使用 `Woodfish Dracula` 基底，同一算法也会作用于其他颜色主题。

<details>
<summary><strong>查看 Woodfish Dark 预览</strong></summary>

![Woodfish Dark 渐变语法与发光效果](https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/images/img2.png)

![Woodfish Dark 彩虹光标效果](https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/images/img1.png)

</details>

## 它提供什么

- **任意主题叠层**：默认开启，切换到其他 VS Code 颜色主题后仍会继续工作。
- **原色自动计算**：运行时读取 Monaco token 的真实计算颜色，不依赖固定 `mtk` 编号。
- **双主题底座**：内置未经 Woodfish 调色的 Bearded Theme Arc 与官方 Dracula，可选而非必需。
- **渐变语法**：以每个 token 原色为中点生成 OKLCH 渐变，色相、明度、低色度补色与方向均可配置。
- **可调发光**：发光层可独立开关，并通过强度倍率适配不同字体和显示器。
- **彩虹光标**：颜色、循环速度、圆角、模糊与透明度均可配置。
- **安全恢复**：写入前保存并校验当前工作台备份，失败时自动回滚；修复与彻底停用只使用匹配当前 VS Code 安装的可信备份。
- **动效降级**：尊重系统的“减少动态效果”偏好，自动停用持续动画与过渡。
- **真实运行状态**：状态栏显示 `on / paused / off`，并用 `A / G / C` 标记当前开启的效果层。

## 三步开始

1. 从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=zhongjun.woodfish-theme) 安装 **Woodfish Theme**。
2. 选择你想使用的任意颜色主题。
3. 按 `Ctrl+Shift+P` 运行 `Woodfish Theme: 开启 Woodfish 通用叠层`，再点击 **重新加载窗口**。

叠层默认开启，并且不会替你切换颜色主题。点击右下角的 `Woodfish ...` 状态栏入口，可以快速开关叠层与各项效果。

<details>
<summary><strong>手动安装 VSIX</strong></summary>

下载对应版本的 `.vsix` 后运行：

```bash
code --install-extension woodfish-theme-6.0.0-beta.1.vsix
```

</details>

## 效果层与状态

Woodfish Theme 将当前颜色主题与运行时叠层分开管理：

```text
任意 VS Code 颜色主题
    └── Woodfish universal overlay
        ├── A  syntax gradient
        ├── G  text glow
        └── C  rainbow cursor
```

切换颜色主题不会关闭叠层。运行时会重新读取新主题的 token 原色与主要强调色，并据此刷新渐变。

| 状态 | 含义 |
| --- | --- |
| `on` | 通用叠层已开启，并检测到当前 Woodfish runtime payload |
| `paused` | 叠层与效果已开启，但 payload 缺失，通常需要修复或重新加载 |
| `off` | 叠层总开关已关闭，或所有效果均已关闭 |
| `A / G / C` | 渐变语法 / 文字发光 / 彩虹光标已开启 |

> [!IMPORTANT]
> 效果层会修改 VS Code 的 `workbench.html`，切换效果后需要重新加载窗口。扩展使用同目录临时文件完成校验后的原子替换，并保存带哈希、路径和 VS Code 版本信息的备份。VS Code 更新可能替换该文件；遇到效果消失时可运行 `Woodfish Theme: 修复 Woodfish 注入`。

## 常用命令

在命令面板中搜索 `Woodfish Theme`：

| 命令 | 用途 |
| --- | --- |
| `开启 Woodfish 通用叠层` | 保持当前颜色主题并写入 runtime payload |
| `关闭 Woodfish 通用叠层` | 移除当前 runtime payload，同时保留参数 |
| `开启/关闭 Woodfish 彩色字体` | 切换渐变语法层 |
| `开启/关闭 Woodfish 发光字体` | 切换文字发光层 |
| `开启 Woodfish 彩色光标` | 启用并配置彩虹光标 |
| `开启/关闭彩色光标` | 快速切换光标层 |
| `修复 Woodfish 注入` | 从备份状态重新写入当前 payload |
| `彻底停用 Woodfish 叠层` | 清理当前 payload 与可识别的旧 Woodfish 残留 |

`彻底停用 Woodfish 叠层` 会先要求二次确认。未知的第三方注入不会被 Woodfish 自动改写或清理。

## 切换内置主题

1. 按 `Ctrl+K Ctrl+T` 打开主题选择器。
2. 选择 `Woodfish Dark` 或 `Woodfish Dracula`。
3. Woodfish 会保留这个原版基底，并在其上应用同一套通用叠层。

未自定义光标参数时，`Woodfish Dracula` 会使用 12 秒的粉紫青绿主题色循环、`1px` 圆角与 `0.45` 尾迹透明度；任何显式的 `woodfishTheme.cursor.*` 设置都会优先生效。

## 配置示例

所有设置都以 `woodfishTheme.*` 开头。下面是一组偏克制的配置：

```json
{
  "woodfishTheme.overlay.enabled": true,
  "woodfishTheme.overlay.hueShift": 24,
  "woodfishTheme.overlay.lightnessDelta": 0.06,
  "woodfishTheme.overlay.neutralChroma": 0.06,
  "woodfishTheme.overlay.angle": 90,
  "woodfishTheme.syntaxGradient.enabled": true,
  "woodfishTheme.glow.enabled": true,
  "woodfishTheme.glow.intensity": 0.8,
  "woodfishTheme.cursor.enabled": true,
  "woodfishTheme.cursor.animationDuration": 8,
  "woodfishTheme.cursor.gradientStops": [
    "#ff2d95",
    "#ffd700",
    "#00ffff"
  ],
  "woodfishTheme.cursor.glowBlur": 0,
  "woodfishTheme.cursor.glowOpacity": 0.55
}
```

- `overlay.enabled`（`true / false`）：通用叠层总开关，默认开启。
- `overlay.hueShift`（`0 - 180` 度）：原色色相在渐变两端的偏移，默认 `24`。
- `overlay.lightnessDelta`（`0 - 0.5`）：OKLCH 明度变化，默认 `0.06`。
- `overlay.neutralChroma`（`0 - 0.4`）：白色与灰色文字的补充色度，默认 `0.06`。
- `overlay.angle`（`0 - 360` 度）：文字渐变方向，默认 `90`。
- `syntaxGradient.enabled`（`true / false`）：开关渐变语法层。
- `syntaxGradient.customRules`（CSS 字符串数组）：在默认 token 样式后追加覆盖。
- `glow.enabled`（`true / false`）：开关文字发光层。
- `glow.intensity`（`0.1 - 3` 倍）：缩放默认发光模糊半径。
- `glow.customRules`（CSS 字符串数组）：在默认发光样式后追加覆盖。
- `cursor.enabled`（`true / false`）：开关光标主体与尾迹。
- `cursor.animationDuration`（`1 - 60` 秒）：调整颜色循环速度。
- `cursor.gradientStops`（CSS 颜色数组）：定义彩虹光标色带。
- `cursor.borderRadius`（`0 - 24` px）：调整光标圆角。
- `cursor.glow`（`true / false`）：保留彩色光标主体时，单独开关尾迹发光。
- `cursor.glowBlur`（`0 - 24` px）：默认 `0` 关闭 GPU blur；大于 `0` 时按需启用。
- `cursor.glowOpacity`（`0 - 1`）：调整尾迹可见度。
- `cursor.customRules`（CSS 字符串数组）：追加最终光标 CSS 覆盖。

自定义规则最多 32 条，每条最多 4096 个字符，总计最多 16384 个字符。为避免突破样式边界或加载外部资源，包含 `</style`、`<script`、`@import` 或 `url(...)` 的规则会被忽略。在不受信任的工作区中，VS Code 会限制自定义规则与渐变色配置；其余安全设置仍可使用。

完整说明也可直接在 VS Code 设置页中查看。

## 排查问题

**效果没有出现**

确认 `woodfishTheme.overlay.enabled` 与所需效果均已开启，并在运行命令后重新加载窗口。任何颜色主题都可使用。

**状态栏显示 `paused`**

效果设置仍然开启，但当前 workbench 中缺少匹配的 payload。运行 `Woodfish Theme: 修复 Woodfish 注入` 后重新加载窗口。

**更新 VS Code 后效果消失**

运行 `Woodfish Theme: 修复 Woodfish 注入`，然后重新加载窗口。

**需要完整移除**

卸载扩展前先运行 `Woodfish Theme: 彻底停用 Woodfish 叠层`。若仍有样式残留，请检查其他会修改同一 `workbench.html` 的扩展。

更多诊断步骤、输出日志位置和高级清理方法见 [故障排查指南](./docs/TROUBLESHOOTING.md)。

## 本地开发

```bash
npm install
npm run compile
npm test
npm run test:integration
npm run lint
npm run format:check
npm run verify
npm run package
```

`npm run test:integration` 会启动隔离的 VS Code 扩展宿主并验证开启、关闭与工作台恢复链路。扩展入口位于 `src/extension.ts`；主题资源位于 `themes/bearded/`、`themes/dracula/` 与 `themes/shared/`。

## 项目信息

- [更新日志](./CHANGELOG.md)
- [参与贡献](./docs/CONTRIBUTING.md)
- [提交问题](https://github.com/woodfishhhh/Woodfish-Theme/issues)
- [许可与第三方主题声明](./THIRD_PARTY_NOTICES.md)
