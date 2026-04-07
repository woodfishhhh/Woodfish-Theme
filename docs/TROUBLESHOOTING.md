# Troubleshooting Guide

This guide provides solutions for common issues encountered when using the Woodfish Theme.

## Common Issues

### Issue: Effects not showing after toggle
If you've enabled the theme or a specific effect (like Glow or Rainbow Cursor) but don't see any changes:
1. **Verify Theme**: Make sure the active color theme is `Woodfish Dark`.
2. **Verify Reload**: Did you click "Reload Window" after running the command? Workbench injection requires a full UI reload.
3. **Check Output Channel**: Open the VS Code Output panel and select `Woodfish Theme` from the dropdown to check for any error logs.

### Issue: Status bar not visible
The status bar entry (`Woodfish ...`) appears only when the extension is active.
- **Activation**: The extension activates when you run any of its commands. Try running `Woodfish Theme: 开启 Woodfish 主题`.
- **Theme Check**: If the status says `paused`, switch back to `Woodfish Dark` and reload the window.

### Issue: Rainbow cursor not working
The rainbow cursor depends on the integrated runtime payload and the theme being active.
- **Enable Theme First**: You must enable the main Woodfish Theme before the cursor styles can be properly applied.
- **Enable Cursor Layer**: Run `Woodfish Theme: 开启 Woodfish 彩色光标` or `Woodfish Theme: 开启/关闭彩色光标`, then reload the window.

### Issue: Glow effects too strong or too weak
Glow intensity can vary depending on your monitor and personal preference.
- **Use the setting directly**: Adjust `woodfishTheme.glow.intensity` in Settings or `settings.json`.
- **Advanced override**: Use `woodfishTheme.glow.customRules` if you want to target only specific tokens.

---

## Debugging Steps

If the basic checks don't solve your problem:

1. **Check Woodfish Settings**:
   - Open your `settings.json`.
   - Verify `woodfishTheme.syntaxGradient.enabled`, `woodfishTheme.glow.enabled`, or `woodfishTheme.cursor.enabled` are enabled as needed.
   - Verify `woodfishTheme.cursor.enabled` is `true` if you are debugging the rainbow cursor.

2. **View Output Channel Logs**:
   - Go to `View` -> `Output`.
   - Select `Woodfish Theme` from the list.
   - Look for messages related to `Applied integrated runtime`, `Removed integrated runtime`, or workbench path errors.

3. **Verify Workbench Injection**:
   - Use `Developer: Toggle Developer Tools` in VS Code.
   - Look for `data-woodfish-theme="runtime"` in the injected workbench payload.

---

## Advanced Troubleshooting

### Manual Runtime Cleanup
If you've uninstalled the extension but effects still persist:
1. Run `Woodfish Theme: 彻底停用 Woodfish 主题` before uninstalling.
2. If effects still remain, inspect your VS Code installation for other injection-based extensions that may still patch the same `workbench.html`.
3. Remember that Woodfish only auto-takes over known legacy Woodfish payloads; unknown third-party payloads must be cleaned by their own source extension.

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
  - List of installed injection-related extensions
  - Logs from the `Woodfish Theme` output channel.
