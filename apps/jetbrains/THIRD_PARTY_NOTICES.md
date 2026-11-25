# Licensing

The plugin uses the [MIT license](LICENSE). The bundled JavaScript runs on [Rhino 1.9.2](https://github.com/mozilla/rhino/releases/tag/Rhino1_9_2_Release), distributed under MPL-2.0. The unmodified Rhino JAR includes its license and notices.

The WebP reader and its TwelveMonkeys ImageIO dependencies are distributed under the BSD 3-Clause license. The original JARs carry their notices and license text.

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

插件采用 [MIT 许可](LICENSE)。随包分发的 Rhino 1.9.2 用于执行共享颜色计算，遵循 MPL-2.0，原始 JAR 包含许可和声明。

WebP 解码器及其 TwelveMonkeys ImageIO 依赖遵循 BSD 三条款许可，版权与许可随原始 JAR 一同分发。

15 套配色（插件内的 `themes/*.theme.json` 与 `themes/*.xml`）由 `pnpm jetbrains:generate` 从 Woodfish
主题生成。其中几套源自第三方主题（Dracula、One Dark Pro、Tokyo Night、Catppuccin、Nord、GitHub、
Night Owl、Ayu Mirage、Gruvbox 等），每套主题的许可以 `licenses/<主题>.txt` 随插件分发，原始说明见
[apps/vscode-extension/THIRD_PARTY_NOTICES.md](../vscode-extension/THIRD_PARTY_NOTICES.md)。
源码中附带的 Gradle 9.6.0 wrapper（启动脚本和 JAR）使用
Apache-2.0 许可，完整条文见该 JAR 内的 `META-INF/LICENSE`；它不随可安装的 IDE 插件分发。
