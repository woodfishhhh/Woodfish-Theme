# 宣传视频

视频是渲染出来的，不是剪出来的：`apps/vscode-extension/scripts/promo/render-promo-video.js` 在无头 Chrome 里逐帧驱动真实的 Woodfish 代码，帧直接送进 ffmpeg，和 BGM 合成。

```bash
pnpm compile && pnpm runtime:build
node apps/vscode-extension/scripts/promo/render-promo-video.js --bgm <曲子.mp3>          # 成片：output/promo/woodfish-7.3-promo.mp4
node apps/vscode-extension/scripts/promo/render-promo-video.js --still 12,21.5            # 单帧审片：output/promo/stills/（时间是 BGM 秒数）
```

## 怎么做到“真实渲染”

| 部分 | 做法 |
| --- | --- |
| VS Code 镜头（`stage.js`） | 构建好的 `overlay-bootstrap.js` 加 `buildRuntimeCss` 的 CSS，画在仿 Monaco 的 DOM 上（长 token 按 50 字拆开）。效果插件走 bootstrap 自己的加载路径：`effects.json` 用 fetch 垫片、`effects.mjs` 用 import map 指向 data URL（无头 Chrome 没有 `vscode-file://`）；打字时先发 keydown 再移动光标，和 VS Code 里 Woodfish 看到的事件一样。按 200% 渲染，文字和粒子、拖尾保持 VS Code 里的比例 |
| Codex 镜头（`codex-page.js`、`codex-stage.js`） | 页面按 Codex 的结构搭（`data-app-action-sidebar-thread-row`、`data-markdown-text-style="assistant-message"`、`data-codex-composer-root` 等适配器认的钩子，见 `docs/hosts/codex.md`），运行的是 `@woodfish/adapter-codex/renderer` 的 `startCodexOverlay` 和 `packages/effects/builtin` 里的全部效果插件（默认参数）。回复按字增长、侧栏挂运行中的转圈、输入框用 `execCommand` 打字（真的 input 事件），所以吐字光标、拖尾、淡入、粒子、光环、毛玻璃都是产品自己的代码画的。只有宿主 DOM 是替身 |
| 时间（`clock.js`） | 页面里的 `performance.now`、`Date.now`、计时器、`requestAnimationFrame` 和 `Math.random` 都换成虚拟时钟，每帧推进一次；CSS 动画按帧时间定住。同一条命令渲染两次结果一样 |
| 帧率 | 60 fps。光标拖尾照 VS Code Animations 每帧追一次光标，30 fps 会比 60 Hz 屏幕上长一倍 |
| 镜头 | 每个页面窗口大小不变（Codex 1280×720、VS Code 960×540，3 倍像素密度），镜头是每帧截图用的裁切框：Chrome 按裁切的倍率重新栅格化，推近后文字照样锐利。页面每帧报告锚点（吐字光标、输入框光标、选中会话、菜单、回复、代码块、VS Code 光标），镜头按分镜给的倍率（按拍点缓动）和锚点算出裁切框，中心带 0.2–0.45 秒的缓动跟随，切镜头时直接对上 |
| 字幕、角标、片尾 | `overlay-page.js` 按 1920×1080 排版，每帧贴在裁切框上再按同一倍率缩回，所以推拉时字幕不跟着动 |

Codex 镜头里的会话、项目名都是编的，不出现负责人真实的会话列表。

## 7.3 分镜

BGM 实测 57.5 BPM（三连音踩镲，一拍 1.043 s，一小节 4.174 s，第 0 小节从 0 s 开始）；0–8.3 s 是安静的前奏，8.3 s 起鼓进来，91.8 s 进入间奏。视频从第 1 小节（4.17 s）切到第 25 小节（104.34 s），全长 100 秒，每个镜头都切在拍点上，推拉在拍点之间缓动。展示效果的镜头右上角常驻角标「你可以让 Codex 随时调整此效果」（片头、主题切换、片尾不显示）。下表时间是视频时间。

| 视频时间 | 镜头 | 画面 | 字幕 |
| --- | --- | --- | --- |
| 0:00–0:04 | Codex 全窗 | 开场即在吐字：《彩云》背景、彩虹回复字、吐字光标和拖尾、粒子，侧栏当前会话转着光谱环；镜头极慢地推近 | Woodfish 7.3 / Codex 桌面版也换上了 Woodfish |
| 0:04–0:12 | 推到正在出字的那一行（1.85×） | 鼓点进来时一拍半推近，跟着出字的行往下走：彩虹光标领着字走、新字淡入、换行时光标跳到下一行；最后一拍前写完 | AI 吐字：彩虹光标领着字往外走 |
| 0:12–0:21 | 全窗一拍 → 推到侧栏（2.5×） | 每两拍换一次选中会话（短文 → React 组件 → 周报 → 短文），镜头跟着选中项走；“排查 CI”在运行，只亮一圈弱光 | 选中的会话：七色光环 |
| 0:21–0:25 | 输入框（1.3×）→ 菜单（1.75×） | 输入框里打 `/`，命令菜单（照真机截图）弹出，镜头升到菜单，选中项逐拍下移 | 毛玻璃浮层 |
| 0:25–0:29 | Codex 全窗 | 背景是整个窗口的效果：前两拍关掉背景，第三拍打开《彩云》 | 关掉背景 → 窗口背景《彩云》 |
| 0:29–0:37 | 推到输入框（1.85×） | 6px 彩虹光标打字、粒子；第 4 拍按 Home、第 5 拍按 End，拖尾扫过整行；再补一句 | 输入框：和 VS Code 一样的彩虹光标 |
| 0:37–0:48 | 输入框（1.6×）→ 跟着回复（1.4×） | 在新会话里打“Woodfish 打字时迸出来的粒子，帮我改成金色，再大一点。”，发送后镜头退开跟着回复：Codex 照 `AGENTS.md` 在 `user.css` 写了三行（代码块逐行出来，代码渐变） | 对 Codex 说一句：把打字粒子改成金色 |
| 0:48–0:54 | 光标特写（2.1×） | 页面换上那份 `user.css`，再打字迸出来的是金色、大一号的粒子，镜头跟着光标 | 保存即生效 |
| 0:54–1:07 | VS Code 代码区（1 → 1.2×） | 10 套热门主题：One Dark Pro 先停三拍，之后每拍换一套（Tokyo Night、Catppuccin Mocha / Latte、Nord、GitHub Dark / Light、Night Owl、Ayu Mirage、Gruvbox Dark） | 主题名 / 新增 10 套热门主题… |
| 1:07–1:19 | VS Code 跟着光标（1.7×） | Woodfish Dark 大字号打一段 TypeScript，光标拖尾和打字粒子；镜头横向固定在整行都看得见的位置，纵向跟着光标 | VS Code 里也有：光标拖尾、打字粒子 |
| 1:19–1:23 | Codex 全窗 | 每拍换一套主题：Tokyo Night、Catppuccin Latte（浅色）、Gruvbox Dark、Nord | Codex 也能用全部 15 套主题 |
| 1:23–1:28 | Codex 全窗 | Woodfish Dark 收尾 | Woodfish Theme 7.3 |
| 1:28–1:32 | VS Code | 打出 `code --install-extension zhongjun.woodfish-theme` 和 `pnpm woodfish codex launch` | Woodfish Theme 7.3 / 去哪里装 |
| 1:32–1:40 | 片尾 | 「觉得好看，就点个 Star ⭐」，下面打出仓库地址 `https://github.com/woodfishhhh/Woodfish-Theme`（Woodfish 渐变），再下面一行商店信息；完整停留约 6.5 秒，最后 1.9 秒淡出 | — |

AI 改效果这一段是把实测过程压缩后的演示：2026-11-14 实测时 Codex 用了 2 分 18 秒、改的是 `params.json`（当时还没有 `user.css`）；现在的 `AGENTS.md` 让 AI 先改 `user.css`，画面里写的三行变量就是效果宿主实际读到并生效的值。

## 评论区置顶文案

```text
⭐ 觉得好看就点个 Star：https://github.com/woodfishhhh/Woodfish-Theme

Woodfish Theme 7.3：给 VS Code 和 Codex 桌面版换上渐变代码、彩虹光标、光标拖尾和打字粒子；Codex 里回复是彩虹字，AI 吐字时末尾跟着彩虹光标。每个效果都是一个文件夹，一句话就能让 Codex 帮你改。

安装：
· VS Code / Cursor / Kiro / Trae：扩展商店或 Open VSX 搜「Woodfish Theme」，或运行 code --install-extension zhongjun.woodfish-theme
· Codex 桌面版（Windows 商店版）：VS Code 里运行「Woodfish Theme: 为 Codex 启用 Woodfish」，或下载 GitHub Release 里的 woodfish.exe，或 npx woodfish codex launch；不会改你原来的 Codex 快捷方式，详见仓库 README

BGM：Sleepy Fish - no more fires（Chillhop Music）
```

## 曲目

**no more fires** — Sleepy Fish（制作人 Izzidin Joseph Oakes），收录于 Chillhop Music 的合辑 *Chillhop Essentials Winter 2019*（2019-12-11 发行，第 12 轨，3:00，ISRC NL1LE1900270）。发行方是 Chillhop Music（Chillhop Records），曲目页：<https://chillhop.bandcamp.com/track/no-more-fires>。

使用授权：负责人已取得这首曲子的使用授权，可以用在宣传片里。

发布时在视频说明里署名，例如：

- `Music: Sleepy Fish - no more fires (Chillhop Music) https://chillhop.bandcamp.com/track/no-more-fires`
- 或 Chillhop 的通用写法 `Music provided by Chillhop Music - https://chillhop.com/creatorcred`

曲子本身版权归 Chillhop Music，不是免版税音乐（Chillhop 的说明见 <https://chillhop.com/licensing/>）；换别的视频或别的用途前先确认授权范围。
