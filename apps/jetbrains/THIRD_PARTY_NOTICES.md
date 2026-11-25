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

## VS Code Animations (caret trail)

The `caret-trail` effect plugin (`packages/effects/builtin/`, copied into the user's
effects folder) reproduces the trail of the `CursorAnimation` in
VS Code Animations 2.0.9 (`brandonkirbyson.vscode-animations`,
https://github.com/BrandonKirbyson/VSCode-Animations): the chain of points that follows
the cursor and its single-color band. Licensed under the MIT License:

```text
MIT License

Copyright (c) 2023 Brandon Kirbyson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
