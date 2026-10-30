# @woodfish/theme-core

Woodfish 各产品共用的视觉核心，只包含纯计算和数据，不依赖 `vscode`、Electron、DOM 或 Node 内置模块，可以同时在扩展宿主、Electron 主进程和渲染页面中使用。

| 模块 | 导出 |
| --- | --- |
| 颜色 | `parseCssColor`、`rgbToOklch`、`oklchToRgb`、`gamutMapOklch`、`contrastRatio`、`isValidCssColor` 等 |
| 渐变 | `deriveTokenGradient`：从一个文字颜色推导三段渐变和发光色；`rankPaletteAnchorHue`、`pickAccentHue`、`isPunctuationOnly` |
| 效果参数 | `DEFAULT_*` 默认值、`*_RANGES` 取值范围、`normalize*` 归一化；`sanitizeCustomCssRules`、`sanitizeGradientStops`、`containsUnsafeCss` |
| 调色板 | `ORIGINAL_PALETTES`（Woodfish Light / Black / Neon）、`validatePalette` |

```ts
import { deriveTokenGradient, normalizeTextGradient } from '@woodfish/theme-core';

const params = normalizeTextGradient({ hueShift: 30 });
const colors = deriveTokenGradient('rgb(97, 175, 234)', {
  ...params,
  anchorHue: 300,
  punctuation: false,
});
// colors.light / colors.base / colors.dark → 三段 CSS 渐变色
```

## 构建与使用

- `pnpm --filter @woodfish/theme-core run compile` 输出 CommonJS 与类型声明到 `out/`。
- 打包工具通过 `source` 导出条件直接引用 `src/` 中的 TypeScript 源码。VS Code 扩展就是这样把核心打进 VSIX 的，所以发布出去的产物不依赖本包。
- 包目前标记为 `private`，只在本仓库内使用。

修改本包会影响所有 Woodfish 产品，注意事项见仓库的 [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)。
