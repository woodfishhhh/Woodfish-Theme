# Woodfish Theme

> [中文](README.md) | English

An elegant VSCode gradient theme providing a modern visual experience and a comfortable coding environment with rainbow cursor, glow effects, and animated UI elements.

![Woodfish Theme](https://img.shields.io/badge/version-3.5.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![VSCode](https://img.shields.io/badge/VSCode-%5E1.74.0-blue.svg)  
![Downloads](https://img.shields.io/visual-studio-marketplace/d/zhongjun.woodfish-theme)
![GitHub Release](https://img.shields.io/github/v/release/woodfishhhh/Woodfish-Theme)

## ✨ Features

- 🌈 **Rainbow Cursor**: Dynamic rainbow cursor animation for coding fun
- ✨ **Glow Effects**: Keyword and line number glow for enhanced visuals
- 🎨 **Gradient Colors**: Carefully designed gradient syntax highlighting
- 🔍 **Transparent UI**: Modern semi-transparent menus and hover effects
- 📊 **Activity Bar Animation**: Gradient border animations for selected tabs
- 🎯 **Modular Design**: Customizable modular CSS architecture
- 🚀 **Performance Optimized**: Lightweight design that doesn't affect editor performance
- 🎛️ **Independent Control**: Glow effects, glass effects, and rainbow cursor can be toggled independently
- 🏗️ **Modular Architecture**: Fully refactored src modular design for better maintainability
- ⚙️ **Smart Configuration**: Automatic configuration and validation to ensure theme functionality

## 🖼️ Showcase

![Example 1](images/img1.png)  
![Example 2](images/img2.png)

*Showcasing rainbow cursor, glow effects, and gradient colors*

## 📦 Installation

### Method 1: Install from VSCode Marketplace

1. Open VSCode  
2. Press `Ctrl+Shift+X` to open Extensions panel  
3. Search for "Woodfish Theme"  
4. Click Install

### Method 2: Manual Installation

```bash
# Download and install VSIX file
code --install-extension woodfish-theme-3.0.0.vsix
```

### Compatibility

Woodfish Theme has been tested on:  

- Windows 10/11  
- macOS 10.15+  
- Linux (Ubuntu 20.04+)  
- VSCode 1.74.0 and above  
- Cursor IDE

## 🚀 Usage

### Enable Theme

1. After installing, press `Ctrl+Shift+P` to open the command palette  
2. Type `Woodfish Theme: Enable Woodfish Theme`  
3. Select and run the command  
4. Restart VSCode to apply changes

### 🌈 Enable Rainbow Cursor (New in v3.0.0)

1. Press `Ctrl+Shift+P` to open the command palette
2. Type `Woodfish Theme: Launch rainbow cursor auto-configuration`
3. Select and run the command
4. If prompted to install Custom CSS and JS Loader extension, select installation method:
   - **Recommended**: Choose "Install using script"
   - **Manual**: Choose "Manual install" and follow the prompts
5. After installation, follow the prompts to enable Custom CSS functionality
6. Restart VSCode to enjoy the rainbow cursor effect

### Select Color Theme

1. Press `Ctrl+K Ctrl+T` to open the theme selector  
2. Choose "Woodfish Dark"

### 🎛️ Theme Commands

- `Woodfish Theme: Enable Woodfish Theme` - Enable theme
- `Woodfish Theme: Disable Woodfish Theme` - Disable theme
- `Woodfish Theme: Completely Uninstall Woodfish Theme` - Force remove glow effects, rainbow cursor, and other features from both new and old versions
- `Woodfish Theme: Enable/Disable Woodfish Glow` - Toggle glow effects
- `Woodfish Theme: Launch rainbow cursor auto-configuration` - Configure rainbow cursor
- `Woodfish Theme: Enable/Disable Glass Effect` - Toggle glass effects
- `Woodfish Theme: Enable/Disable Rainbow Cursor` - Toggle rainbow cursor effect

## ⚙️ Configuration

In VSCode settings you can customize Woodfish Theme:

```json
{
  "woodfishTheme.customStyles": [
    {
      "enabled": true,
      "css": "/* Custom CSS styles */"
    }
  ],
  "woodfishTheme.enableGlowEffects": true,
  "woodfishTheme.enableGlassEffect": true,
  "woodfishTheme.enableRainbowCursor": false
}
```

### Configuration Options

- `woodfishTheme.enableGlowEffects`: Enable/disable glow effects
- `woodfishTheme.enableGlassEffect`: Enable/disable glass effects
- `woodfishTheme.enableRainbowCursor`: Enable/disable rainbow cursor effect
- `woodfishTheme.customStyles`: Array of custom CSS style objects

### Custom Style Examples

```json
{
  "woodfishTheme.customStyles": [
    {
      "enabled": true,
      "css": "div.cursor { animation-duration: 20s !important; }"
    },
    {
      "enabled": true,
      "css": "span.mtk1 { text-shadow: 0 0 40px currentColor !important; }"
    }
  ]
}
```

## 🛠️ Development

### Requirements

- Node.js >= 16.0.0  
- VSCode >= 1.74.0  
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/woodfishhhh/Woodfish-Theme.git
cd Woodfish-Theme

# Install dependencies
npm install

# Package extension
npm run package
```

### Modular Architecture

The theme uses a modular design with the following modules:

**CSS Style Modules:**

- `variables.css` - Theme variable definitions
- `activity-bar.css` - Activity bar styles
- `tab-bar.css` - Tab bar styles
- `syntax-highlighting.css` - Syntax highlighting
- `glow-effects.css` - Glow effects
- `cursor-animation.css` - Cursor animation
- `transparent-ui.css` - Transparent UI

**JavaScript Function Modules:**

- `src/constants.js` - Constant definitions
- `src/utils.js` - Utility functions
- `src/themes.js` - Theme configuration and CSS management
- `src/config.js` - Configuration management
- `src/commands.js` - Command processing
- `src/config-validator.js` - Configuration validation and monitoring

## 🤝 Contributing

Contributions are welcome! Please see the [Contributing Guide](CONTRIBUTING.md) for details.

### Contribution Workflow

1. Fork the repository  
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)  
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)  
4. Push to branch (`git push origin feature/AmazingFeature`)  
5. Open a Pull Request

## 📝 Changelog

### [3.5.1] - 2025-12-25 🛠️ Latest Version

#### 🆕 Main Fixes

- **Modular Architecture Optimization** - Improved src modular design with functions split into independent modules
- **Configuration Management Optimization** - Refactored configuration management logic to improve code maintainability
- **Packaging Configuration Fix** - Fixed issue where src folder was being ignored during packaging, ensuring all modules are properly packaged
- **Command Registration Fix** - Fixed command import path issues to ensure all commands are registered correctly

#### 🏗️ Architecture Improvements

- `src/constants.js` - Constant definition module
- `src/utils.js` - Utility function module  
- `src/themes.js` - Theme configuration module
- `src/config.js` - Configuration management module
- `src/commands.js` - Command processing module
- `src/config-validator.js` - Configuration validation and monitoring module

#### 🐛 Optimization Improvements

- Improved modular architecture to enhance code maintainability
- Fixed packaging configuration issues to ensure all files are properly included
- Optimized error handling and module loading mechanisms
- Improved code structure to enhance performance and stability

### [3.4.0] - 2025-09-18

#### 🆕 Main New Features

- **Complete Uninstall Function** - Added "Completely Uninstall Woodfish Theme" command to force remove glow effects, rainbow cursor, and other features from both new and old versions
- **Complete Cleanup Mechanism** - Thoroughly cleans all theme-related CSS configurations and Custom CSS settings
- **Compatibility Enhancement** - Ensures complete compatibility with various theme configuration versions

#### 🎛️ New Commands

- `Woodfish Theme: Completely Uninstall Woodfish Theme` - Forces removal of all theme effects, including new and old version configurations

#### 🐛 Optimization Improvements

- Improved theme uninstallation mechanism to ensure thorough cleanup
- Enhanced user experience with complete uninstallation options
- Improved error handling and status feedback

### [3.1.0] - 2025-08-27

#### 🆕 Main New Features

- **Independent Effect Control** - Added "Enable/Disable Glass Effect" command to independently control transparent UI effects
- **Rainbow Cursor Toggle** - Added "Enable/Disable Rainbow Cursor" command for one-click rainbow cursor toggle
- **Smart Configuration Management** - Rainbow cursor toggle automatically manages Custom CSS configuration without manual operation
- **Modular Architecture Optimization** - Improved modular design with fully independent control of effects

#### 🎛️ New Commands

- `Woodfish Theme: Enable/Disable Glass Effect` - Toggle transparent UI and glass effects
- `Woodfish Theme: Enable/Disable Rainbow Cursor` - Toggle rainbow cursor effects

#### ⚙️ New Configuration Items

- `woodfishTheme.enableGlassEffect`: Controls glass effect toggle
- `woodfishTheme.enableRainbowCursor`: Controls rainbow cursor effect toggle

#### 🐛 Optimization Improvements

- Improved configuration monitoring mechanism for real-time effect toggling
- Enhanced user experience with clear status feedback
- Improved error handling and fallback solutions
- Enhanced documentation and usage guides

### [3.0.0] - 2025-01-22

#### 🌈 Main New Features

- **Rainbow Cursor Auto-Configuration** - Added "Launch rainbow cursor auto-configuration" command for one-click enablement of stunning rainbow cursor effects
- **Smart Dependency Management** - Automatically detects and installs Custom CSS and JS Loader extension
- **Multiple Installation Methods** - Supports script auto-installation and manual installation
- **Complete Configuration Process** - Automatically configures rainbow cursor CSS settings and guides user activation
- **Cross-Platform Support** - Fully compatible with Windows, macOS, and Linux systems

#### 🐛 Fixes and Optimizations

- Fixed dependency extension installation issues in rainbow cursor configuration
- Improved error handling and user prompting mechanisms
- Optimized extension installation process for user experience
- Enhanced documentation structure and explanations

### [2.3.0] - 2024-12-19

#### Added

- 🚀 Version updated to 2.3.0
- 📝 Updated project documentation
- 🎯 Dispersed features can each be enabled separately

### [2.2.0] - 2024-12-XX

#### Added

- 🌈 Rainbow cursor animation effects
- ✨ Code glow effect system
- 🎨 Gradient syntax highlighting optimization
- 🔍 Transparent UI design
- 📊 Activity bar animation effects
- 🎯 Modular CSS architecture

#### Optimized

- Performance optimization, reducing resource usage
- Animation smoothness improvements
- Color contrast adjustments

### [2.1.1] - 2024-12-19

- 💫 Added frosted glass background effect to hover tips
- 🐛 Fixed hover menu position offset issue
- 🎯 Optimized hover tip visual effects

## 🐛 Feedback

If you encounter any issues or have suggestions, please:

1. Check the [FAQ](https://github.com/woodfishhhh/Woodfish-Theme/wiki/FAQ)  
2. Search existing [Issues](https://github.com/woodfishhhh/Woodfish-Theme/issues)  
3. If not reported, [open a new Issue](https://github.com/woodfishhhh/Woodfish-Theme/issues/new)  
4. Provide details:  
   - VSCode version  
   - OS information  
   - Screenshots or recordings  
   - Steps to reproduce

## 📄 License

This project is licensed under MIT License – see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgements

- Thanks to the VSCode team for an excellent editor platform  
- Thanks to all contributors and users for support  
- Inspired by modern design trends and UX best practices
- Special thanks to shaobeichen for project inspiration
- Thanks to Bearded Theme for open-source reference

## 📞 Contact

- Author: Woodfish  
- QQ: [woodfish](3053932588)
- Email: [woodfish](woodfishhhh@163.com)  
- GitHub: [@woodfishhhh](https://github.com/woodfishhhh)  
- Issues: [Issues](https://github.com/woodfishhhh/Woodfish-Theme/issues)  
- Discussions: [Discussions](https://github.com/woodfishhhh/Woodfish-Theme/discussions)

---

⭐ If you find this theme helpful, please give it a star!

![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red.svg)
