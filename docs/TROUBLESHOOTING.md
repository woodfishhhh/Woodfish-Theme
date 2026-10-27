# Troubleshooting Guide

This guide provides solutions for common issues encountered when using the Woodfish Theme.

## Common Issues

### Issue: Effects not showing after toggle
If you've enabled the theme or a specific effect (like Glow or Rainbow Cursor) but don't see any changes:
1. **Verify Overlay**: Make sure `woodfishTheme.overlay.enabled` and the desired effect are enabled. Any VS Code color theme is supported.
2. **Verify Reload**: Did you click "Reload Window" after running the command? Workbench injection requires a full UI reload.
3. **Check Output Channel**: Open the VS Code Output panel and select `Woodfish Theme` from the dropdown to check for any error logs.

### Issue: Status bar not visible
The status bar entry (`Woodfish ...`) appears only when the extension is active.
- **Activation**: The extension activates when you run any of its commands. Try running `Woodfish Theme: 开启 Woodfish 通用叠层`.
- **Payload Check**: If the status says `paused`, run `Woodfish Theme: 修复 Woodfish 注入` and reload the window.

### Issue: Rainbow cursor not working
The rainbow cursor depends on the integrated runtime payload and the overlay being active.
- **Enable Overlay First**: Enable the Woodfish universal overlay before applying cursor styles.
- **Any Theme Works**: The active color theme does not need to be a bundled Woodfish theme.
- **Enable Cursor Layer**: Run `Woodfish Theme: 开启 Woodfish 彩色光标` or `Woodfish Theme: 开启/关闭彩色光标`, then reload the window.

### Issue: Enabling the overlay did not switch themes
This is intentional in version 6. Enabling Woodfish keeps the current color theme. `Woodfish Dark` and `Woodfish Dracula` remain optional unmodified base themes in the normal VS Code theme picker.

### Issue: Glow effects too strong or too weak
Glow intensity can vary depending on your monitor and personal preference.
- **Use the setting directly**: Adjust `woodfishTheme.glow.intensity` in Settings or `settings.json`.
- **Advanced override**: Use `woodfishTheme.glow.customRules` if you want to target only specific tokens.

### Issue: A custom CSS rule is ignored
Woodfish validates custom CSS before adding it to the runtime payload.
- **Check the limits**: Each custom rule must be at most 4096 characters, with at most 32 rules and 16384 characters in total per setting.
- **Remove unsafe constructs**: Rules containing `</style`, `<script`, `@import`, or `url(...)` are rejected.
- **Check Workspace Trust**: Custom rule arrays and cursor gradient stops are restricted while the workspace is untrusted.

### Issue: Animations are disabled
Woodfish respects the operating system's reduced-motion preference and `workbench.reduceMotion`. When reduced motion is enabled, continuous cursor and tab animations are disabled while the static styling remains visible.

### Issue: “Permission denied” (没有权限写入)
Woodfish has to write into the editor's installation folder.
- **macOS, started from a terminal**: launching with `code .` or `cursor .` makes macOS attribute the write to the terminal, which usually lacks “App Management”. Quit the editor completely, open it from the Dock, then run `Woodfish Theme: 修复 Woodfish 注入`.
- **macOS, otherwise**: allow the editor under System Settings → Privacy & Security → App Management. If it runs from Downloads (App Translocation), move it to `/Applications` first.
- **Windows**: installs under `Program Files` need the editor to run once as administrator; the user installer avoids this.
- **Linux**: Snap and Flatpak installs are read-only. Use the official `.deb`, `.rpm` or `.tar.gz`, or `chown` the `resources/app/out` folder to your user.

### Issue: “Your installation appears to be corrupt”
Woodfish updates the matching checksum in `product.json` (`woodfishTheme.runtime.fixChecksums`), but the editor only reads checksums at startup. The notice therefore keeps appearing until the editor is fully quit after any change to the effects; reloading the window is not enough.

### Issue: Frosted glass does not appear
- Run `Woodfish Theme: 开启/关闭 Woodfish 毛玻璃` and reload the window.
- High-contrast themes and the OS “Reduce transparency” setting turn glass off on purpose.
- The system-wide transparent window is experimental, macOS / Windows 11 only, and needs a full restart; re-enable it after every editor update.

### Issue: Using Cursor, Kiro, Windsurf, Trae or VSCodium
Install Woodfish from the editor's own extension panel (it is published on Open VSX). Everything else works as in VS Code; prompts show your editor's name.

---

## Debugging Steps

If the basic checks don't solve your problem:

1. **Check Woodfish Settings**:
   - Open your `settings.json`.
   - Verify `woodfishTheme.syntaxGradient.enabled`, `woodfishTheme.glow.enabled`, or `woodfishTheme.cursor.enabled` are enabled as needed.
   - Verify `woodfishTheme.overlay.enabled` is `true`.
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
Uninstalling Woodfish restores `workbench.html`, the checksum and the native window hook the next time the editor fully restarts. If effects still persist:
1. Reinstall Woodfish, run `Woodfish Theme: 彻底停用 Woodfish 叠层`, then uninstall again.
2. If effects still remain, inspect your VS Code installation for other injection-based extensions that may still patch the same `workbench.html`.
3. Remember that Woodfish only auto-takes over known legacy Woodfish payloads; unknown third-party payloads must be cleaned by their own source extension.

### Repair and backup behavior
`Woodfish Theme: 修复 Woodfish 注入` restores only a backup whose hash, workbench path, and VS Code version still match the current installation. If the stored backup is missing or invalid, Woodfish derives a clean baseline from the current workbench instead of copying stale bytes across VS Code versions. Every replacement is validated before installation and rolled back if the write cannot be completed.

### Resetting VS Code Settings
If settings are corrupted:
- Backup your `settings.json`.
- Remove `woodfishTheme.*` keys.

---

## Getting Help

If you're still stuck:
- **GitHub Issues**: Search for similar problems or open a new one at [GitHub Issues](https://github.com/woodfishhhh/Woodfish-Theme/issues).
- **Information to include**: run `Woodfish Theme: 生成 Woodfish 诊断信息`. It copies the editor name and version, OS, install path, write permissions, injection state and recent `Woodfish Theme` log lines to the clipboard, ready to paste into the issue.
