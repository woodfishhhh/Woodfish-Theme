# Licensing

The plugin code is licensed under the MIT License in `LICENSE`. It is a JetBrains port of
[Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme) for VS Code (MIT,
Copyright (c) 2024 Woodfish); the gradient and glow color math is a Java port of that
project's runtime overlay.

The 15 color themes (`themes/*.theme.json` and `themes/*.xml` inside the plugin) are generated from
the Woodfish themes by `pnpm jetbrains:generate`. Several of them are derived from third-party
themes (Dracula, One Dark Pro, Tokyo Night, Catppuccin, Nord, GitHub, Night Owl, Ayu Mirage, Gruvbox
and others); the license of each theme is shipped as `licenses/<theme>.txt` inside the plugin, and the
original notices are in [apps/vscode-extension/THIRD_PARTY_NOTICES.md](../vscode-extension/THIRD_PARTY_NOTICES.md).
The Gradle 9.6.0 wrapper (scripts and
`gradle/wrapper/gradle-wrapper.jar`) is distributed with the source under Apache-2.0;
the complete license is in `META-INF/LICENSE` inside the wrapper JAR. The wrapper is
not included in the installable IDE plugin.

---

# 许可说明

插件代码使用 `LICENSE` 中的 MIT 许可。它移植自 VS Code 扩展
[Woodfish Theme](https://github.com/woodfishhhh/Woodfish-Theme)（MIT，Copyright (c) 2024 Woodfish），
渐变与发光的颜色算法是原版运行时叠层的 Java 移植。

15 套配色（插件内的 `themes/*.theme.json` 与 `themes/*.xml`）由 `pnpm jetbrains:generate` 从 Woodfish
主题生成。其中几套源自第三方主题（Dracula、One Dark Pro、Tokyo Night、Catppuccin、Nord、GitHub、
Night Owl、Ayu Mirage、Gruvbox 等），每套主题的许可以 `licenses/<主题>.txt` 随插件分发，原始说明见
[apps/vscode-extension/THIRD_PARTY_NOTICES.md](../vscode-extension/THIRD_PARTY_NOTICES.md)。
源码中附带的 Gradle 9.6.0 wrapper（启动脚本和 JAR）使用
Apache-2.0 许可，完整条文见该 JAR 内的 `META-INF/LICENSE`；它不随可安装的 IDE 插件分发。
