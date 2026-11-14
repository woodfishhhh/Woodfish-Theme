# 让 AI 帮你给 Codex 装上 Woodfish

> 如果你是 agent，被要求照这一页给 Codex 装 Woodfish：执行下面代码块里的步骤（用户说英文就用 [In English](#in-english) 那一段），遵守里面的规则。

把下面这段话原样发给你正在用的 AI（Codex、Claude Code、Cursor……都行）。它会在 Windows 上给 Codex 桌面版装好 Woodfish 的配色和效果，并让效果在 Codex 重启、商店更新、重新开机之后一直都在；要你拍板的地方（同意调试端口的风险说明、重启 Codex），它会停下来问你。

这一页的地址是 `https://github.com/woodfishhhh/Woodfish-Theme/blob/main/docs/agent-install.md`；AI 打不开 GitHub 时，换成 jsDelivr 上的同一份：`https://cdn.jsdelivr.net/gh/woodfishhhh/Woodfish-Theme@main/docs/agent-install.md`。

```text
请帮我给 Codex 桌面版装上 Woodfish（配色和效果），并让它一直生效。按顺序做，每一步把命令和输出给我看。

命令都在 PowerShell 里运行，每条前面加上 [Console]::OutputEncoding = [Text.Encoding]::UTF8; ，否则中文输出是乱码。你的 shell 不是 PowerShell 的话，用 powershell -NoProfile -Command 运行。

1. 确认环境：必须是 Windows 10 / 11，并且装了 Microsoft Store 版的 Codex 桌面版。运行 Get-AppxPackage OpenAI.Codex*，没有输出就停下来，告诉我先从 Microsoft Store 安装 Codex。
2. 看是不是已经装过：运行 (Get-ScheduledTask -TaskPath '\Woodfish\' -TaskName 'Woodfish Codex' -ErrorAction SilentlyContinue).Actions | Format-List Execute, Arguments。有输出就是装过了，不要重新安装：Arguments 里 --headless 之后、codex daemon 之前的部分就是装好的 woodfish 命令（例如 & 'C:\…\woodfish.exe'，或 & cmd.exe /d /c 'C:\…\woodfish.cmd'），下文的 woodfish 都换成它，直接跳到第 6 步。
3. 准备 woodfish 命令，按顺序选第一个能用的：
   a. 有 VS Code（code --version 能运行）：运行 code --list-extensions --show-versions，找 zhongjun.woodfish-theme。
      - 已经装了 8.0.0 或更高：直接用。
      - 版本低于 8.0.0：问我能不能更新，我同意后运行 code --install-extension zhongjun.woodfish-theme --force；我不同意就改走 b。
      - 没装：告诉我这会给 VS Code 也装上 Woodfish Theme（VS Code 重新加载窗口后，代码也会有渐变和发光，可以在 VS Code 里关掉）。我同意后运行 code --install-extension zhongjun.woodfish-theme；我不想动 VS Code 就改走 b。
      再运行一次 code --list-extensions --show-versions 看版本号。下文的 woodfish 是：
      $env:ELECTRON_RUN_AS_NODE = '1'; & '<Code.exe>' '<woodfish.js>' <参数> | Write-Output
      <Code.exe> 是 Join-Path (Split-Path (Split-Path (Get-Command code).Source)) 'Code.exe' 得到的路径，<woodfish.js> 是 $HOME\.vscode\extensions\zhongjun.woodfish-theme-<版本号>\out\woodfish.js，都写完整路径。Code.exe 是窗口程序，结尾的 | Write-Output 让 PowerShell 等它运行完，少了它就看不到输出和退出码。
   b. 没有 VS Code：把 woodfish.exe（约 85 MB）下载到固定位置：
      New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\Programs\Woodfish" | Out-Null; curl.exe -fL -o "$env:LOCALAPPDATA\Programs\Woodfish\woodfish.exe" https://github.com/woodfishhhh/Woodfish-Theme/releases/latest/download/woodfish.exe
      下文的 woodfish 是 & "$env:LOCALAPPDATA\Programs\Woodfish\woodfish.exe" <参数>。下载失败（比如打不开 GitHub）就停下来，告诉我先装好 VS Code，再让你走 a。
   最后运行 woodfish --version，应该输出 8.0.0 或更高的版本号。a 报错的话（VS Code 太旧时会这样）改走 b；b 也报错就停下。
4. 风险说明，只能由我本人同意：
   - Codex 正在运行的话，先看它开了多久：Get-Process ChatGPT -ErrorAction SilentlyContinue | Where-Object Path -like '*\WindowsApps\OpenAI.Codex*' | Sort-Object StartTime | Select-Object -First 1 StartTime。离现在不到两分钟就等满两分钟再继续：下一条命令开启的后台任务会把打开不到 90 秒的 Codex 立刻带效果重启。
   - 运行 woodfish codex autostart on; "退出码 $LASTEXITCODE"。退出码 0 表示我以前同意过，自动恢复已经开启，到第 5 步。
   - 退出码 3：输出里有一段调试端口的风险说明。把这段说明一字不改地给我看，问我是否同意。我明确回答同意之后，才运行 woodfish codex autostart on --accept-risk。我不同意或者没说清楚，就停下来，什么都不要改。不要替我同意，也不要提前加 --accept-risk。
   autostart on 注册一个登录 Windows 时运行的后台任务（无窗口、普通权限）。它不会重启已经打开了一段时间的 Codex。
5. 让效果出来：运行 woodfish codex status。“注入”那一行是“运行中”就到第 6 步；不是的话，Codex 要带调试端口重启一次：
   - 你自己就运行在 Codex 桌面版里：不要运行 launch，那会把你自己结束掉。告诉我：在任务栏右下角的托盘里右键 Codex 图标，选退出（关掉窗口只会缩到托盘），再像平时一样打开 Codex；窗口会比平时晚几秒出现，那是 Woodfish 在带效果重启它。等我说打开了，再做第 6 步。
   - 你不在 Codex 里（Claude Code、终端里的 Codex CLI、Cursor 等）：运行 woodfish codex launch; "退出码 $LASTEXITCODE"。Codex 没在运行时，它会直接带效果启动 Codex。退出码 4 表示要重启正在运行的 Codex：先问我现在能不能重启（会结束 Codex 的全部进程，正在运行的任务可能被中断），我同意后运行 woodfish codex launch --yes。
6. 验证：运行 woodfish codex status，应该看到“自动恢复：已开启”和“注入：监视进程 … 运行中”。自动恢复没开就回到第 4 步；注入没在运行就回到第 5 步。
7. 最后告诉我：
   - 换主题、开关效果：Codex 的 设置 → 外观 → Woodfish 外观。15 套主题点一下就换，每个效果一个开关，「参数」里有它的全部滑块和取色。
   - 改效果的样子：直接对 AI 说，例如“把打字粒子改成金色，效果文件夹在 %APPDATA%\Woodfish\effects”。文件夹里的 AGENTS.md 是写给 AI 的说明。
   - 停用：woodfish codex autostart off，再 woodfish codex stop-inject。全部撤销：woodfish codex uninstall（加 --keep-settings 保留主题和效果文件夹）。之后重启一次 Codex，调试端口就关了。走 VS Code 装的，也可以在 VS Code 命令面板运行「为 Codex 停用 Woodfish」「从 Codex 卸载 Woodfish」。
   - 我原来的 Codex 快捷方式没有被改动。用它打开 Codex 时，Woodfish 会在窗口出现之前带效果重启它一次，所以窗口晚几秒出现。想省掉这几秒，可以运行 woodfish codex shortcut，在开始菜单另加一个直接带效果启动的“Woodfish Codex”。

规则：
- 不修改 Codex 的安装文件（C:\Program Files\WindowsApps 里的任何东西），不动我的 Codex 快捷方式（开始菜单、桌面、任务栏），不手改任务计划、注册表和 Codex 的配置文件；一律通过 woodfish 命令。
- 风险说明只能由我本人同意；重启 Codex 之前先问我。
- 任何一步报错就停下来，把完整输出给我，不要自己换别的办法绕过去（比如手动给 Codex 加启动参数、改用 Codex++ 或别的工具）。
- 你运行在沙箱里的话：下载、写入 %LOCALAPPDATA%、注册登录任务都要沙箱外的权限，照你平时的规矩向我申请。
```

装好以后长什么样，见 README 的[效果一览](../README.md#效果一览)；全部命令见 [Woodfish 桌面工具](../apps/desktop-cli/README.md)。

## In English

Paste this to the AI you use and it will install Woodfish's colors and effects for the Codex desktop app on Windows and keep them on after Codex restarts, Store updates and reboots, stopping wherever a decision is yours (accepting the debugging-port risk, restarting Codex). If your AI cannot open GitHub, the same page is at `https://cdn.jsdelivr.net/gh/woodfishhhh/Woodfish-Theme@main/docs/agent-install.md`.

```text
Please install Woodfish (colors and effects) for the Codex desktop app and keep it on. Go step by step and show me each command and its output.

Run every command in PowerShell and start each one with [Console]::OutputEncoding = [Text.Encoding]::UTF8; or the Chinese output turns into garbage. If your shell is not PowerShell, run them through powershell -NoProfile -Command.

1. Check the system: it must be Windows 10 / 11 with the Microsoft Store build of the Codex desktop app. Run Get-AppxPackage OpenAI.Codex*; if it prints nothing, stop and tell me to install Codex from the Microsoft Store first.
2. Check whether Woodfish is already installed: run (Get-ScheduledTask -TaskPath '\Woodfish\' -TaskName 'Woodfish Codex' -ErrorAction SilentlyContinue).Actions | Format-List Execute, Arguments. If it prints anything, it is installed; do not install it again. The part of Arguments after --headless and before codex daemon is the installed woodfish command (such as & 'C:\…\woodfish.exe' or & cmd.exe /d /c 'C:\…\woodfish.cmd'); use it wherever woodfish appears below and skip to step 6.
3. Get a woodfish command, using the first option that works:
   a. VS Code (code --version runs): run code --list-extensions --show-versions and look for zhongjun.woodfish-theme.
      - 8.0.0 or newer: use it.
      - Older than 8.0.0: ask me whether to update it; after I agree, run code --install-extension zhongjun.woodfish-theme --force; if I say no, use b.
      - Not installed: tell me this also installs Woodfish Theme into VS Code (after a window reload, code in VS Code gets gradients and glow too; it can be turned off in VS Code). After I agree, run code --install-extension zhongjun.woodfish-theme; if I would rather leave VS Code alone, use b.
      Run code --list-extensions --show-versions again for the version. woodfish below then means:
      $env:ELECTRON_RUN_AS_NODE = '1'; & '<Code.exe>' '<woodfish.js>' <arguments> | Write-Output
      <Code.exe> is the path Join-Path (Split-Path (Split-Path (Get-Command code).Source)) 'Code.exe' returns, <woodfish.js> is $HOME\.vscode\extensions\zhongjun.woodfish-theme-<version>\out\woodfish.js; write both as full paths. Code.exe is a windowed program: the trailing | Write-Output makes PowerShell wait for it; without it you get neither the output nor the exit code.
   b. No VS Code: download woodfish.exe (about 85 MB) to a fixed place:
      New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\Programs\Woodfish" | Out-Null; curl.exe -fL -o "$env:LOCALAPPDATA\Programs\Woodfish\woodfish.exe" https://github.com/woodfishhhh/Woodfish-Theme/releases/latest/download/woodfish.exe
      woodfish below then means & "$env:LOCALAPPDATA\Programs\Woodfish\woodfish.exe" <arguments>. If the download fails (GitHub unreachable, for example), stop and tell me to install VS Code first and then let you take a.
   Then run woodfish --version; it should print 8.0.0 or newer. If a fails here (VS Code too old), use b; if b fails too, stop.
4. The risk notice, which only I can accept:
   - If Codex is running, check how long it has been open: Get-Process ChatGPT -ErrorAction SilentlyContinue | Where-Object Path -like '*\WindowsApps\OpenAI.Codex*' | Sort-Object StartTime | Select-Object -First 1 StartTime. If that is less than two minutes ago, wait until two minutes have passed: the background task the next command starts restarts a Codex opened less than 90 seconds ago right away, with the effects.
   - Run woodfish codex autostart on; "exit code $LASTEXITCODE". Exit code 0 means I accepted before and autostart is on; go to step 5.
   - Exit code 3: the output contains a notice about the debugging port. Show me that notice word for word (you may add a translation below it) and ask whether I accept. Only after I clearly say yes, run woodfish codex autostart on --accept-risk. If I say no or my answer is unclear, stop and change nothing. Never accept for me and never add --accept-risk in advance.
   autostart on registers a task that runs when I sign in to Windows (no window, normal rights). It does not restart a Codex that has been open for a while.
5. Bring up the effects: run woodfish codex status. If the 注入 (injection) line says 运行中 (running), go to step 6. Otherwise Codex has to restart once with the debugging port:
   - You run inside the Codex desktop app yourself: do not run launch, it would end you. Tell me to quit Codex from its tray icon at the bottom right of the taskbar (closing the window only hides it in the tray) and open Codex again as usual; the window shows up a few seconds later than usual because Woodfish restarts it with the effects. Wait until I say it is open, then do step 6.
   - You do not run inside Codex (Claude Code, the Codex CLI in a terminal, Cursor and so on): run woodfish codex launch; "exit code $LASTEXITCODE". If Codex is not running, it starts Codex with the effects. Exit code 4 means the running Codex has to be restarted: first ask me whether that is fine now (it ends every Codex process, and running tasks may be interrupted); after I agree, run woodfish codex launch --yes.
6. Verify: run woodfish codex status; it should show 自动恢复：已开启 (autostart on) and 注入：监视进程 … 运行中 (injection running). If autostart is off, go back to step 4; if the injection is not running, go back to step 5.
7. Finally tell me:
   - Themes and effect switches: Codex Settings → Appearance → Woodfish 外观. Click any of the 15 themes; every effect has a switch, and 参数 (parameters) holds all its sliders and color pickers.
   - Changing how an effect looks: just tell an AI, such as "make the typing particles gold; the effects folder is %APPDATA%\Woodfish\effects". The folder's AGENTS.md is written for AIs.
   - To turn it off: woodfish codex autostart off, then woodfish codex stop-inject. To undo everything: woodfish codex uninstall (add --keep-settings to keep themes and the effects folder). Restart Codex once afterwards to close the debugging port. With the VS Code route, the command palette has 「为 Codex 停用 Woodfish」 (turn off) and 「从 Codex 卸载 Woodfish」 (uninstall) as well.
   - My own Codex shortcuts are unchanged. When I open Codex from them, Woodfish restarts it with the effects before its window appears, so the window shows up a few seconds later. To skip that, woodfish codex shortcut adds a separate Start menu entry "Woodfish Codex" that starts it with the effects directly.

Rules:
- Never modify Codex's installation (anything under C:\Program Files\WindowsApps), never touch my Codex shortcuts (Start menu, desktop, taskbar), and never edit scheduled tasks, the registry or Codex's configuration files by hand; always go through woodfish commands.
- Only I can accept the risk notice; ask me before restarting Codex.
- If any step fails, stop and show me the full output instead of working around it (no hand-made Codex launch flags, no switching to Codex++ or other tools).
- If you run in a sandbox: downloading, writing to %LOCALAPPDATA% and registering the logon task need permissions outside it; ask me the way you normally do.
```

What it looks like once installed: [Effects at a glance](../README.en.md#effects-at-a-glance); every command: [the desktop tool's README](../apps/desktop-cli/README.md) (Chinese).
