# Woodfish 终端配色

[下载目录](./dist)按工具分类，包含与编辑器对应的 15 套配色。不需要安装 VS Code 或运行脚本。下文以 **Woodfish Dark** 为例；换主题时，文件名和配置中的主题名一起换。已有配置只合并下面的字段，不要覆盖整份文件。

## Ghostty

将 [woodfish-dark](./dist/ghostty/woodfish-dark) 放进 `~/.config/ghostty/themes/`。在 Ghostty 的配置（可用 `ghostty +edit-config` 打开）中加入：

```ini
theme = woodfish-dark
```

重新加载配置即可。只设置 ANSI 16 色、前景、背景、光标和选区，不启用着色器。

## Windows Terminal

打开「设置 → 打开 JSON 文件」，将 [woodfish-dark.json](./dist/windows-terminal/woodfish-dark.json) 的整个对象作为一项加入顶层 `schemes` 数组。在要使用它的配置文件（`profiles.list` 的一项）中加入下面的属性；要应用于所有配置文件，就放在 `profiles.defaults` 中：

```json
"colorScheme": "Woodfish Dark"
```

## bat

把 [Woodfish Dark.tmTheme](./dist/bat/Woodfish%20Dark.tmTheme) 放进 `bat --config-dir` 输出目录下的 `themes/`，运行一次 `bat cache --build`。在同一配置目录的 `config` 文件中加入：

```text
--theme="Woodfish Dark"
```

用 `bat --theme="Woodfish Dark" 文件名` 即可单次试用。部分发行版的命令名是 `batcat`。

## Yazi

将整个 [woodfish-dark.yazi](./dist/yazi/woodfish-dark.yazi) 目录放进 `~/.config/yazi/flavors/`（Windows：`%APPDATA%\yazi\config\flavors\`）。目录里的 `flavor.toml` 控制界面，`tmtheme.xml` 控制代码预览，后者与 bat 的主题内容相同。在 Yazi 配置目录的 `theme.toml` 中选择：

```toml
[flavor]
dark = "woodfish-dark"
light = "woodfish-dark"
```

重开 Yazi。需要随终端切换明暗时，另装 `woodfish-light.yazi`，将第二行主题名（`light`）改为 `woodfish-light`。已有 `theme.toml` 中的自定义样式会优先于 flavor。

## Starship

把 [woodfish-dark.toml](./dist/starship/woodfish-dark.toml) 的内容追加到 `~/.config/starship.toml`（或 `STARSHIP_CONFIG` 指定的文件）。在文件顶部、第一个 `[表名]` 之前选择调色板：

```toml
palette = "woodfish-dark"
```

调色板不会改提示符布局。使用 `green`、`blue` 等命名颜色的模块可直接换色；要让路径用主题强调色，在已有 `[directory]` 段设置 `style = "fg:accent"`。写死的十六进制颜色不受调色板影响。

## lsd

把 [colors.yaml](./dist/lsd/woodfish-dark/colors.yaml) 放进 `~/.config/lsd/`，在同目录的 `config.yaml` 中选择：

```yaml
color:
  theme: custom
```

用 `lsd -l` 查看权限、用户、分组、大小和日期的颜色。这里只配置 lsd 自身的颜色，不设置 `LS_COLORS`。

## zsh-syntax-highlighting

先按插件说明启用 zsh-syntax-highlighting。把 [woodfish-dark.zsh](./dist/zsh/woodfish-dark.zsh) 放在 `~/.config/zsh/`，并在 `~/.zshrc` **加载插件之后**加一行：

```zsh
source ~/.config/zsh/woodfish-dark.zsh
```

新开一个 zsh，在输入命令、参数或引号时即可看到颜色。片段只设置 `ZSH_HIGHLIGHT_STYLES`，不改变提示符、按键或目录列表。

## 配色与许可

使用支持 24 位颜色的终端；bat 和 Yazi 的语法由各自的语法引擎匹配，和 VS Code 不保证逐字符完全相同。每套配色对应的许可在 [dist/licenses](./dist/licenses)，再分发时请保留相应许可；原始主题说明见 [第三方声明](../vscode-extension/THIRD_PARTY_NOTICES.md)。
