# Troubleshooting Guide

This guide provides solutions for common issues encountered when using the Woodfish Theme.

## Common Issues

### Issue: Effects not showing after toggle
If you've enabled the theme or a specific effect (like Glow or Rainbow Cursor) but don't see any changes:
1. **Check Prerequisite**: Ensure you have a CSS injection extension installed (e.g., `Custom CSS and JS Loader`).
2. **Verify Reload**: Did you click "Reload Window" after running the command? CSS injection requires a full UI reload.
3. **Check Output Channel**: Open the VS Code Output panel and select `Woodfish Theme` from the dropdown to check for any error logs.

### Issue: Status bar not visible
The status bar entry (`✨ Woodfish`) appears only when the extension is active.
- **Activation**: The extension activates when you run any of its commands. Try running `Woodfish Theme: 开启 Woodfish 主题`.
- **Theme Check**: Ensure the theme is actually enabled in your settings.

### Issue: Rainbow cursor not working
The rainbow cursor requires specific CSS injection and depends on the theme being active.
- **Enable Theme First**: You must enable the main Woodfish Theme before the cursor styles can be properly applied.
- **Run Auto-Config**: Run the command `Woodfish Theme: 启动彩色光标自动配置` to ensure the correct CSS paths are added to your configuration.

### Issue: Glow effects too strong or too weak
Glow intensity can vary depending on your monitor and personal preference.
- **Manual Adjustment**: Advanced users can find the `glow-effects.css` file in the extension's theme directory and adjust values like `text-shadow` or `filter: drop-shadow()`.

---

## Debugging Steps

If the basic checks don't solve your problem:

1. **Check Custom CSS Extension Settings**:
   - Open your `settings.json`.
   - Look for `"vscode_custom_css.imports"`.
   - Verify that the paths listed there exist on your disk and point to the `xiangmu/themes/...` directory.

2. **View Output Channel Logs**:
   - Go to `View` -> `Output`.
   - Select `Woodfish Theme` from the list.
   - Look for messages related to "Applying CSS" or "File not found".

3. **Verify CSS Injection**:
   - Use `Developer: Toggle Developer Tools` in VS Code.
   - Look for `<link>` tags in the `<head>` that point to `woodfish` related CSS files.

---

## Advanced Troubleshooting

### Manual CSS Cleanup
If you've uninstalled the extension but effects still persist:
1. Run `Woodfish Theme: 彻底停用 Woodfish 主题` before uninstalling.
2. If already uninstalled, manually check your `settings.json` and remove any entries in `"vscode_custom_css.imports"` related to Woodfish.
3. Run the command `Custom CSS and JS: Disable Custom CSS` from the command palette.

### Resetting VS Code Settings
If settings are corrupted:
- Backup your `settings.json`.
- Remove `woodfishTheme.*` keys.

---

## Getting Help

If you're still stuck:
- **GitHub Issues**: Search for similar problems or open a new one at [GitHub Issues](https://github.com/woodfishhhh/Woodfish-Theme/issues).
- **Information to include**:
  - VS Code version
  - OS version
  - List of installed extensions (especially CSS loaders)
  - Logs from the `Woodfish Theme` output channel.
