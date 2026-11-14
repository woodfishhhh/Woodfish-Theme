# 宣传视频

视频是渲染出来的，不是剪出来的：`apps/vscode-extension/scripts/promo/render-promo-video.js` 在无头 Chrome 里逐帧驱动真实的 Woodfish 代码，帧直接送进 ffmpeg，和 BGM 合成。

```bash
pnpm compile && pnpm runtime:build
node apps/vscode-extension/scripts/promo/render-promo-video.js --bgm <曲子.mp3>          # 成片：output/promo/woodfish-7.3-promo.mp4
node apps/vscode-extension/scripts/promo/render-promo-video.js --still 12,21.5            # 单帧审片：output/promo/stills/
```

## 怎么做到“真实渲染”

| 部分 | 做法 |
| --- | --- |
| VS Code 镜头（`stage.js`） | 构建好的 `overlay-bootstrap.js` 加 `buildRuntimeCss` 的 CSS，画在仿 Monaco 的 DOM 上（长 token 按 50 字拆开）。效果插件走 bootstrap 自己的加载路径：`effects.json` 用 fetch 垫片、`effects.mjs` 用 import map 指向 data URL（无头 Chrome 没有 `vscode-file://`）；打字时先发 keydown 再移动光标，和 VS Code 里 Woodfish 看到的事件一样。按 200% 渲染，文字和粒子、拖尾保持 VS Code 里的比例 |
| Codex 镜头（`codex-page.js`、`codex-stage.js`） | 页面按 Codex 的结构搭（`data-app-action-sidebar-thread-row`、`data-markdown-text-style="assistant-message"`、`data-codex-composer-root` 等适配器认的钩子，见 `docs/hosts/codex.md`），运行的是 `@woodfish/adapter-codex/renderer` 的 `startCodexOverlay` 和 `packages/effects/builtin` 里的全部效果插件（默认参数）。回复按字增长、侧栏挂运行中的转圈、输入框用 `execCommand` 打字（真的 input 事件），所以吐字光标、拖尾、淡入、粒子、光环、毛玻璃都是产品自己的代码画的。只有宿主 DOM 是替身 |
| 时间（`clock.js`） | 页面里的 `performance.now`、`Date.now`、计时器、`requestAnimationFrame` 和 `Math.random` 都换成虚拟时钟，每帧推进一次；CSS 动画按帧时间定住。同一条命令渲染两次结果一样 |
| 帧率 | 60 fps。光标拖尾照 VS Code Animations 每帧追一次光标，30 fps 会比 60 Hz 屏幕上长一倍 |

Codex 镜头里的会话、项目名都是编的，不出现负责人真实的会话列表。

## 7.3 分镜

BGM 实测 57.5 BPM（三连音踩镲，一拍 1.043 s，一小节 4.174 s，第 0 小节从 0 s 开始）；0–8.3 s 是安静的前奏，8.3 s 起鼓进来，91.8 s 进入间奏。视频从第 1 小节（4.17 s）切到第 24 小节（100.17 s），全长 96 秒，每个镜头都切在拍点上。下表时间是视频时间（括号里是 BGM 时间）。

| 视频时间 | 镜头 | 画面 | 字幕 |
| --- | --- | --- | --- |
| 0:00–0:04 | Codex 整窗（1.6×） | 开场即在吐字：《彩云》背景、彩虹回复字、吐字光标和拖尾、粒子，侧栏当前会话转着光谱环 | Woodfish 7.3 / Codex 桌面版也换上了 Woodfish |
| 0:04–0:12 | 吐字特写（2×，收起侧栏） | 鼓点进来时切近：彩虹光标领着字走，新字淡入，换行时光标跳到下一行；最后一拍前写完，出现复制、朗读按钮 | AI 吐字：彩虹光标领着字往外走 |
| 0:12–0:21 | 侧栏光环（2×） | 每两拍换一次选中会话（短文 → React 组件 → 周报 → 短文），右侧内容跟着换；“排查 CI”在运行，只亮一圈弱光 | 选中的会话：七色光环 |
| 0:21–0:25 | 毛玻璃 | 输入框里打 `/`，命令菜单（照真机截图）弹出，后面的彩虹字透出来，选中项逐拍下移 | 毛玻璃浮层 |
| 0:25–0:29 | 整窗（1.25×） | 前两拍关掉背景，第三拍打开《彩云》 | 关掉背景 → 窗口背景《彩云》 |
| 0:29–0:37 | 输入框特写（2.4×） | 6px 彩虹光标打字、粒子；第 4 拍按 Home、第 5 拍按 End，拖尾扫过整行；再补一句 | 输入框：和 VS Code 一样的彩虹光标 |
| 0:37–0:48 | AI 改效果（1.6×） | 在新会话里打“Woodfish 打字时迸出来的粒子，帮我改成金色，再大一点。”，发送；Codex 回答：照 `AGENTS.md` 在 `user.css` 写了三行（代码块逐行出来，代码渐变） | 对 Codex 说一句：把打字粒子改成金色 |
| 0:48–0:54 | 输入框特写（2.4×） | 页面换上那份 `user.css`，再打字迸出来的是金色、大一号的粒子 | 保存即生效 |
| 0:54–1:07 | VS Code，10 套热门主题 | One Dark Pro 先停三拍，之后每拍换一套：Tokyo Night、Catppuccin Mocha / Latte、Nord、GitHub Dark / Light、Night Owl、Ayu Mirage、Gruvbox Dark | 主题名 / 新增 10 套热门主题… |
| 1:07–1:19 | VS Code 打字 | Woodfish Dark，大字号打一段 TypeScript，光标拖尾和打字粒子 | VS Code 里也有：光标拖尾、打字粒子 |
| 1:19–1:23 | Codex 换主题（1.25×） | 每拍一套：Tokyo Night、Catppuccin Latte（浅色）、Gruvbox Dark、Nord | Codex 也能用全部 15 套主题 |
| 1:23–1:28 | Codex 整窗 | Woodfish Dark 收尾 | Woodfish Theme 7.3 |
| 1:28–1:36 | VS Code 结尾 | 打出安装命令 `code --install-extension zhongjun.woodfish-theme` 和 `pnpm woodfish codex launch`，最后 1.9 秒淡出 | Woodfish Theme 7.3 / 去哪里装 |

AI 改效果这一段是把实测过程压缩后的演示：2026-11-14 实测时 Codex 用了 2 分 18 秒、改的是 `params.json`（当时还没有 `user.css`）；现在的 `AGENTS.md` 让 AI 先改 `user.css`，画面里写的三行变量就是效果宿主实际读到并生效的值。

## 曲目

**no more fires** — Sleepy Fish（制作人 Izzidin Joseph Oakes），收录于 Chillhop Music 的合辑 *Chillhop Essentials Winter 2019*（2019-12-11 发行，第 12 轨，3:00，ISRC NL1LE1900270）。发行方是 Chillhop Music（Chillhop Records），曲目页：<https://chillhop.bandcamp.com/track/no-more-fires>。

使用授权：负责人已取得这首曲子的使用授权，可以用在宣传片里。

发布时在视频说明里署名，例如：

- `Music: Sleepy Fish - no more fires (Chillhop Music) https://chillhop.bandcamp.com/track/no-more-fires`
- 或 Chillhop 的通用写法 `Music provided by Chillhop Music - https://chillhop.com/creatorcred`

曲子本身版权归 Chillhop Music，不是免版税音乐（Chillhop 的说明见 <https://chillhop.com/licensing/>）；换别的视频或别的用途前先确认授权范围。
