# 代码渐变 `code-gradient`（核心效果）

Codex 代码块和 diff 里的每个 token 按 OKLCH 渐变着色：Woodfish 的 5 套内置主题用手调的渐变，其他主题按同样的手法推导，并保证每个颜色在背景上不比原色难读。可选再加一层柔和发光。和 VS Code 里的语法渐变是同一个引擎。

这是一个**核心效果**（`effect.json` 里有 `"core": "code-gradient"`）：找 token、按帧分批上色、跟随主题、处理 diff 视图的 Shadow DOM，这些在 Woodfish 核心里（`packages/renderer-runtime/src/textGradientEngine.ts`、`packages/theme-core/src/gradient/`）。这个文件夹管开关和参数；想补充样式可以加一个 `effect.css`，打开时追加在最后（上过色的 token 带 `data-woodfish-overlay-token` 属性）。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `angle` | 45° | 每个 token 里渐变的方向 |
| `hueShift` | 32 | 推导渐变时终点转多少度 |
| `lightnessDelta` | 0.12 | 推导渐变时终点亮多少 |
| `neutralChroma` | 0.075 | 灰色 token 推导时给的彩度 |
| `glow` | 关 | 代码发光 |
| `glowIntensity` | 1 | 发光强度 |
