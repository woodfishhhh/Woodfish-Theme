# 窗口背景 `background`（核心效果）

一张图铺在 Codex 整个窗口底下（默认是《彩云》），对话区透明露出它，侧栏和输入框是叠在上面的毛玻璃。

这是一个**核心效果**（`effect.json` 里有 `"core": "background"`）：取图、上传、按窗口大小预先模糊出毛玻璃用的副本，这些都在 Woodfish 核心里（`packages/adapter-codex/src/renderer/background.ts`、`packages/renderer-runtime/src/background.ts`），因为要经过监视进程读写图片、还要避开实时 `backdrop-filter`（流式输出时会让帧时间翻倍）。这个文件夹里管的是开关和参数；想改长相可以加一个 `effect.css`，它会在背景打开时追加在最后。

用哪张图不在这里：在 Codex 设置 → 外观 → Woodfish 的背景区挑或上传，或运行 `woodfish codex background use <编号>`，记在 `%APPDATA%\Woodfish\codex.json` 的 `backgroundImage`。

## 参数

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `opacity` | 0.15 | 背景图透出来的程度 |
| `blur` | 10 px | 侧栏和输入框毛玻璃的模糊 |
| `mask` | 0.35 | 毛玻璃上的主题色浓度 |
| `saturate` | 150% | 毛玻璃里透出的颜色饱和度 |
| `luminosity` | 0.1 | 毛玻璃上叠的亮度层 |
| `size` | `cover` | 铺满或完整显示 |
| `position` | `center` | 图片对齐位置 |
