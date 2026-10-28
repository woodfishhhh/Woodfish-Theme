/* WOODFISH_NATIVE_WINDOW - managed file */
// Loaded by VS Code's main process through a guarded dynamic import that Woodfish
// prepends to out/main.js. Every step is wrapped so a failure here can never stop
// VS Code from starting; the worst case is an opaque window.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_FILE = 'woodfish-native-window.json';
const TRANSPARENT = '#00000000';

function readConfig() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const config = JSON.parse(readFileSync(join(here, CONFIG_FILE), 'utf8'));
    return config && config.enabled === true ? config : null;
  } catch {
    return null;
  }
}

function applyMaterial(win, config) {
  if (!win || win.isDestroyed()) {
    return;
  }

  const setBackgroundColor = win.setBackgroundColor.bind(win);
  setBackgroundColor(TRANSPARENT);
  // VS Code repaints the window background on theme changes; keep it transparent
  // so the OS material stays visible behind the translucent workbench.
  win.setBackgroundColor = () => setBackgroundColor(TRANSPARENT);

  if (process.platform === 'darwin' && typeof win.setVibrancy === 'function') {
    win.setVibrancy(config.macVibrancy || 'under-window');
    if (typeof win.setVisualEffectState === 'function') {
      win.setVisualEffectState('followWindow');
    }
  } else if (process.platform === 'win32' && typeof win.setBackgroundMaterial === 'function') {
    win.setBackgroundMaterial(config.windowsMaterial || 'acrylic');
  }
}

const config = readConfig();
if (config && (process.platform === 'darwin' || process.platform === 'win32')) {
  import('electron')
    .then((electronModule) => {
      const electron = electronModule.default ?? electronModule;
      const safeApply = (win) => {
        try {
          applyMaterial(win, config);
        } catch (error) {
          console.warn('[Woodfish] native window material failed', error);
        }
      };
      electron.app.on('browser-window-created', (_event, win) => safeApply(win));
      for (const win of electron.BrowserWindow.getAllWindows()) {
        safeApply(win);
      }
    })
    .catch(() => undefined);
}
