# 第三方许可

`woodfish` 命令行工具（`out/woodfish.js`）自身使用 MIT 许可，见仓库根目录的 `LICENSE`。

打包进单文件的第三方代码：

## smol-toml

https://github.com/squirrelchat/smol-toml ，BSD-3-Clause 许可。Woodfish 只用它读取和校验 `config.toml`，写入由 Woodfish 自己按键修改完成。

```text
Copyright (c) Squirrel Chat et al., All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## 配色

单文件里带有从 VS Code 主题读出的配色（`packages/theme-core/src/palettes/ported.ts`），沿用各主题的许可。完整许可文本和来源见 `apps/vscode-extension/themes/<文件夹>/LICENSE.txt` 与 `NOTICE.md`，汇总见 `apps/vscode-extension/THIRD_PARTY_NOTICES.md`。

- Woodfish Dark：Bearded Theme Arc 10.1.0，GPL-3.0-only。分发带有这套配色的 `woodfish.js` 时须遵守 GPL-3.0。
- MIT 许可：Dracula for Visual Studio Code（Copyright (c) 2016 Dracula Theme）、One Dark Pro（Copyright (c) 2013-2022 Binaryify）、Tokyo Night（Copyright (c) 2018-present Enkia）、Catppuccin for VSCode（Copyright (c) 2021 Catppuccin）、Nord Visual Studio Code（Copyright (C) 2017-present Arctic Ice Studio, Sven Greb）、GitHub Theme（Copyright (c) 2020 Primer）、Night Owl（Copyright (c) 2018 Sarah Drasner）、Ayu（Copyright (c) 2016 Ike Kurghinyan）、Gruvbox Theme（Copyright (c) 2017 JD）。

```text
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

## 说明

Woodfish 参考了 Codex++（BigPizzaV3/CodexPlusPlus，AGPL-3.0）证明的思路：通过 Chromium 调试协议注入页面样式，不修改 Codex 安装文件。Woodfish 的实现依据 Chromium DevTools Protocol 和 Microsoft 公开文档独立编写，没有使用 Codex++ 的任何代码。
