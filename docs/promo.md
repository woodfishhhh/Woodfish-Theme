# 宣传视频

视频是渲染出来的，不是剪出来的：`apps/vscode-extension/scripts/promo/render-promo-video.js` 在无头 Chrome 里逐帧驱动真实的 Woodfish 代码，帧直接送进 ffmpeg，和 BGM 合成。

```bash
pnpm compile && pnpm runtime:build
node apps/vscode-extension/scripts/promo/render-promo-video.js --bgm <曲子.mp3>          # 成片：output/promo/woodfish-8.0-promo.mp4
node apps/vscode-extension/scripts/promo/render-promo-video.js --still 12,21.5            # 单帧审片：output/promo/stills/（时间是 BGM 秒数）
```

## 怎么做到“真实渲染”

| 部分 | 做法 |
| --- | --- |
| VS Code 镜头（`stage.js`） | 构建好的 `overlay-bootstrap.js` 加 `buildRuntimeCss` 的 CSS，画在仿 Monaco 的 DOM 上（长 token 按 50 字拆开）。效果插件走 bootstrap 自己的加载路径：`effects.json` 用 fetch 垫片、`effects.mjs` 用 import map 指向 data URL（无头 Chrome 没有 `vscode-file://`）；打字时先发 keydown 再移动光标，和 VS Code 里 Woodfish 看到的事件一样。按 200% 渲染，文字和粒子、拖尾保持 VS Code 里的比例 |
| Codex 镜头（`codex-page.js`、`codex-stage.js`） | 页面按 Codex 的结构搭（`data-app-action-sidebar-thread-row`、`data-markdown-text-style="assistant-message"`、`data-codex-composer-root` 等适配器认的钩子，见 `docs/hosts/codex.md`），运行的是 `@woodfish/adapter-codex/renderer` 的 `startCodexOverlay` 和 `packages/effects/builtin` 里的全部效果插件（默认参数）。回复按字增长、侧栏挂运行中的转圈、输入框用 `execCommand` 打字（真的 input 事件），所以吐字光标、拖尾、淡入、粒子、光环、毛玻璃都是产品自己的代码画的。只有宿主 DOM 是替身 |
| 时间（`clock.js`） | 页面里的 `performance.now`、`Date.now`、计时器、`requestAnimationFrame` 和 `Math.random` 都换成虚拟时钟，每帧推进一次；CSS 动画按帧时间定住。同一条命令渲染两次结果一样 |
| 帧率 | 60 fps。光标拖尾照 VS Code Animations 每帧追一次光标，30 fps 会比 60 Hz 屏幕上长一倍 |
| 编码 | H.264 High 4.2、限定范围（tv）、BT.709、每 2 秒一个关键帧。截图是全范围 BT.601 的 JPEG，直接从 mjpeg 管道编码会得到全范围、level 5.0 的流，很多 Windows 播放器不走硬件解码、播放发卡（7.3 第一版就是这样）；`startEncoder` 用 colorspace 滤镜只换矩阵和范围（swscale 的 in/out_color_matrix 会让画面整体暗 2–4 级），`--also-30fps` 另出一份 30 fps，`--only-30fps <成片>` 给已有成片补一份。README 的 WebP 动图经同一管道到 libwebp，颜色偏差小于 1 级，不受影响 |
| 镜头 | 每个页面窗口大小不变（Codex 1280×720、VS Code 960×540，3 倍像素密度），镜头是每帧截图用的裁切框：Chrome 按裁切的倍率重新栅格化，推近后文字照样锐利。页面每帧报告锚点（吐字光标、输入框光标、选中会话、菜单、回复、代码块、VS Code 光标），镜头按分镜给的倍率（按拍点缓动）和锚点算出裁切框，中心带 0.2–0.45 秒的缓动跟随，切镜头时直接对上 |
| 背景 | 每个镜头都铺《彩云》，用产品默认参数（图片 15%、cover 居中，面板 35% 主题色、模糊 10px、饱和度 150%）：Codex 镜头是 Codex 适配器自己的背景，VS Code 镜头是扩展的窗口背景 CSS（`buildRuntimeCss` 打开 `background`，和负责人 VS Code 里一样），主题切换时只换配色 |
| 字幕、角标、片尾 | `overlay-page.js` 按 1920×1080 排版，每帧贴在裁切框上再按同一倍率缩回，所以推拉时字幕不跟着动 |

Codex 镜头里的会话、项目名都是编的，不出现负责人真实的会话列表。

## 8.0 整合版分镜（已作废）

整合版已作废、不发布，改为下面的 Codex 版和 VS Code 版两条分片；这一节只留作记录。

BGM 实测 57.5 BPM（三连音踩镲，一拍 1.043 s，一小节 4.174 s，第 0 小节从 0 s 开始）；0–8.3 s 是安静的前奏，8.3 s 起鼓进来，91.8 s 进入间奏。视频从第 1 小节（4.17 s）切到第 25 小节（104.34 s），全长 100 秒，每个镜头都切在拍点上，推拉在拍点之间缓动。展示效果的镜头右上角常驻角标「你可以让 Codex 随时调整此效果」（片头、主题切换、片尾不显示）。下表时间是视频时间。

| 视频时间 | 镜头 | 画面 | 字幕 |
| --- | --- | --- | --- |
| 0:00–0:04 | Codex 全窗 | 开场即在吐字：《彩云》背景、彩虹回复字、吐字光标和拖尾、粒子，侧栏当前会话转着光谱环；镜头极慢地推近 | Woodfish 8.0 / Codex 桌面版也换上了 Woodfish |
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
| 1:23–1:28 | Codex 全窗 | Woodfish Dark 收尾 | Woodfish Theme 8.0 |
| 1:28–1:32 | VS Code（《彩云》背景） | 打出 `ext install zhongjun.woodfish-theme`（Ctrl+P 从扩展商店装）和 `> Woodfish Theme: 为 Codex 启用 Woodfish`（命令面板一键启用 Codex） | Woodfish Theme 8.0 / VS Code 扩展商店、Open VSX 搜 Woodfish Theme；Codex 在扩展里一键启用，或从 GitHub Release 下载 woodfish.exe |
| 1:32–1:40 | 片尾 | 《彩云》背景上一张毛玻璃卡片：「觉得好看，就点个 Star ⭐」和一行装法（Woodfish Theme 8.0 · 扩展商店 / Open VSX · Codex 在扩展里一键启用或下载 woodfish.exe），卡片下面打出仓库地址 `https://github.com/woodfishhhh/Woodfish-Theme`（Woodfish 渐变）；完整停留约 6.5 秒，最后 1.9 秒淡出 | — |

AI 改效果这一段是把实测过程压缩后的演示：2026-11-14 实测时 Codex 用了 2 分 18 秒、改的是 `params.json`（当时还没有 `user.css`）；现在的 `AGENTS.md` 让 AI 先改 `user.css`，画面里写的三行变量就是效果宿主实际读到并生效的值。

## 评论区置顶文案（整合版）

```text
觉得好看？求求star！⭐ https://github.com/woodfishhhh/Woodfish-Theme
欢迎共建~会看PR！

Woodfish Theme 8.0：给 VS Code 和 Codex 桌面版换上渐变代码、彩虹光标、光标拖尾和打字粒子；Codex 里回复是彩虹字，AI 吐字时末尾跟着彩虹光标。每个效果都是一个文件夹，一句话就能让 Codex 帮你改。

安装：
· VS Code / Cursor / Kiro / Trae：扩展商店或 Open VSX 搜「Woodfish Theme」，或运行 code --install-extension zhongjun.woodfish-theme
· Codex 桌面版（Windows 商店版）：VS Code 里运行「Woodfish Theme: 为 Codex 启用 Woodfish」一键启用，或下载 GitHub Release 里的 woodfish.exe；不会改你原来的 Codex 快捷方式，详见仓库 README

BGM：Sleepy Fish - no more fires（Chillhop Music）
```

## 8.0 两条分片：Codex 版、VS Code 版

`cuts.js` 定义三条片：`full`（上面的整合版）、`codex`、`vscode`，同一首 BGM、同一套拍点、同样的彩云背景、推近和字幕卡。渲染时加 `--cut codex` 或 `--cut vscode`，成片分别是 `output/promo/woodfish-8.0-codex.mp4`、`woodfish-8.0-vscode.mp4`；加 `--also-30fps` 另出一份 30 fps。角标：Codex 版是「你可以让 Codex 随时调整此效果」，VS Code 版是「你可以让 AI 随时调整此效果」（主题、安装、片头片尾不放）。

两条片都带音效（`sfx.js`），见下面「音效」一节。

### Codex 版（BGM 第 1–18 小节，71 秒）：全面介绍

前奏一小节开场，鼓点进来就是推近。

| 视频时间 | 画面 | 字幕 |
| --- | --- | --- |
| 0:00–0:04 | Codex 全窗，回复正在吐字（彩虹字、吐字光标、拖尾、粒子，侧栏光环） | Woodfish 8.0 · Codex 桌面版 |
| 0:04–0:08 | VS Code 里打出 `> Woodfish Theme: 为 Codex 启用 Woodfish` | 一条命令为 Codex 启用；或下载 woodfish.exe；不改快捷方式，重启后自己回来 |
| 0:08–0:17 | 推到正在出字的那一行 | 彩虹回复字 + 吐字光标 |
| 0:17–0:21 | 推到侧栏，选中项每拍换一次 | 选中的会话：七色光环 |
| 0:21–0:25 | `/` 菜单弹出，镜头升到菜单；对话在菜单后面缓缓上移，彩色的代码卡片从磨砂玻璃后面滑过，菜单上方的字是清楚的，下面是模糊的 | 毛玻璃浮层 |
| 0:25–0:29 | 背景关 → 《彩云》 → 换成自带的「彩云渐变」，对话在静止的背景上缓缓滚动 | 窗口背景；换成你自己的图（设置页上传或拖进窗口） |
| 0:29–0:38 | 输入框推近：6px 彩虹光标、Home/End 拖尾、打字粒子 | 输入框：彩虹光标、拖尾、打字粒子 |
| 0:38–0:42 | 每拍换一套主题（Tokyo Night、Catppuccin Latte、Dracula、Gruvbox Dark） | Codex 能用全部 15 套主题 |
| 0:42–0:46 | 设置页真机截图（只取主题卡片和效果插件标题那一块） | 设置 → 外观 → Woodfish 外观 |
| 0:46–0:56 | 对 Codex 说“把打字粒子改成金色”，它照 AGENTS.md 写 user.css | 对 Codex 说一句：把打字粒子改成金色 |
| 0:56–1:03 | 再打字迸出金色粒子 | 保存即生效，不用重启 Codex |
| 1:03–1:11 | 片尾卡：「觉得好看？求求star！」「欢迎共建~会看PR！」+ Codex 装法，下面打出仓库地址 | — |

### VS Code 版（BGM 第 25–39.5 小节，60 秒）：只讲 8.0 新功能

间奏最后一小节开场，鼓点进来切到主题，片尾在尾声的安静段。

| 视频时间 | 画面 | 字幕 |
| --- | --- | --- |
| 0:00–0:04 | Woodfish Dark 下打字，光标拖尾和粒子，彩云背景 | Woodfish Theme 8.0 |
| 0:04–0:15 | 10 套新主题，每拍一套，背景不变只换配色 | 主题名 / 新增 10 套热门主题 |
| 0:15–0:19 | 背景关两拍 → 《彩云》 | 窗口背景《彩云》 |
| 0:19–0:27 | 镜头跟着光标打一段 TypeScript | 光标拖尾和打字粒子 |
| 0:27–0:31 | 指针在代码上划过（画了一个指针，截图里没有系统指针） | 鼠标拖尾 |
| 0:31–0:40 | 在 user.css 里打 `--woodfish-caret-trail-color: #ff4d4f;`，保存后接着打字，拖尾变红（页面像扩展一样轮询到新的 user.css） | 效果插件 + user.css → 保存即生效 |
| 0:40–0:44 | 编辑器里的 AGENTS.md 开头 | 让 AI 改效果 |
| 0:44–0:48 | 效果文件夹的结构 | 和 Codex 共用一个效果文件夹 |
| 0:48–0:52 | 打出 `ext install zhongjun.woodfish-theme` | VS Code 扩展商店 / Open VSX 搜 Woodfish Theme |
| 0:52–1:00 | 片尾卡：「觉得好看？求求star！」「欢迎共建~会看PR！」+ VS Code 装法，下面打出仓库地址 | — |

透明感：凡是展示毛玻璃的镜头背后都有运动（菜单后面的对话在滚）。Codex 的侧栏和输入框是预先模糊好的静态背景副本（实时 backdrop-filter 会让流式输出时的帧时间翻倍，所以产品里就没用），背后本来就不会动，片子里不伪造这种效果。

每段开头，效果名字先在屏幕中间出现（Woodfish 渐变字 + 毛玻璃底卡，0.45 秒从放大、模糊到清晰，停约 1 秒，0.4 秒淡出），让开后左下角才出小字说明卡，不一直挡住效果。

### 音效

全部用代码合成（`sfx.js`：种子固定的噪声和正弦加包络，没有素材），事件从和画面同一份逐帧状态里算出来，所以每一声都落在对应的帧上：打字和吐字每出一个字一声轻柔的键盘咔哒（音高、音量小幅随机，连打成细碎的连击），有粒子的地方加一点 sparkle（金色粒子更亮）；切镜和推拉开始时一声很轻的 whoosh；光环出现、选中切换一声 shimmer；背景打开、保存 user.css 一声柔和的 swell；菜单弹出一声 pop，换主题一声小 tick；片尾求 Star 一声 chime。分两轨：轻的（咔哒、sparkle、tick、pop）和重点（whoosh、shimmer、swell、chime），重点那一轨轻微压低 BGM（sidechaincompress）。混好后两遍 loudnorm 到 -14 LUFS、峰值 -1 dBTP。

### 置顶文案：Codex 版

```text
觉得好看？求求star！⭐ https://github.com/woodfishhhh/Woodfish-Theme
欢迎共建~会看PR！

Woodfish 8.0 · Codex 桌面版：回复变成彩虹字，AI 吐字时彩虹光标领着字走、身后拖一段尾巴；选中的会话转着七色光环，菜单是毛玻璃，窗口底下铺《彩云》（也能换成你自己的图），15 套主题点一下就换。每个效果都是一个文件夹，对 Codex 说一句就能改。

怎么装（Windows 商店版 Codex）：
· 装好 VS Code 扩展 Woodfish Theme，命令面板运行「Woodfish Theme: 为 Codex 启用 Woodfish」一键启用
· 或从 GitHub Release 下载 woodfish.exe 双击
不改你原来的 Codex 快捷方式；Codex 重启或更新后效果自己回来。

BGM：Sleepy Fish - no more fires（Chillhop Music）
```

### 置顶文案：VS Code 版

```text
觉得好看？求求star！⭐ https://github.com/woodfishhhh/Woodfish-Theme
欢迎共建~会看PR！

Woodfish Theme 8.0 · VS Code 新功能：10 套热门主题（One Dark Pro、Tokyo Night、Catppuccin、Nord、GitHub、Night Owl、Ayu Mirage、Gruvbox）、窗口背景《彩云》、光标拖尾和鼠标拖尾、打字粒子。效果都做成了插件，在 user.css 里写一行变量就能改，也可以让 AI 照效果文件夹里的 AGENTS.md 帮你改；和 Codex 桌面版共用同一个效果文件夹。

安装：VS Code / Cursor / Kiro / Trae 的扩展商店或 Open VSX 搜「Woodfish Theme」，或在 VS Code 里按 Ctrl+P 输入 ext install zhongjun.woodfish-theme

BGM：Sleepy Fish - no more fires（Chillhop Music）
```

## 曲目

**no more fires** — Sleepy Fish（制作人 Izzidin Joseph Oakes），收录于 Chillhop Music 的合辑 *Chillhop Essentials Winter 2019*（2019-12-11 发行，第 12 轨，3:00，ISRC NL1LE1900270）。发行方是 Chillhop Music（Chillhop Records），曲目页：<https://chillhop.bandcamp.com/track/no-more-fires>。

使用授权：负责人已取得这首曲子的使用授权，可以用在宣传片里。

发布时在视频说明里署名，例如：

- `Music: Sleepy Fish - no more fires (Chillhop Music) https://chillhop.bandcamp.com/track/no-more-fires`
- 或 Chillhop 的通用写法 `Music provided by Chillhop Music - https://chillhop.com/creatorcred`

曲子本身版权归 Chillhop Music，不是免版税音乐（Chillhop 的说明见 <https://chillhop.com/licensing/>）；换别的视频或别的用途前先确认授权范围。
