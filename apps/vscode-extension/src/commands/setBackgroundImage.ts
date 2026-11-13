import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import { BACKGROUND_IMAGE_LIMITS } from '@woodfish/theme-core';
import { BACKGROUND_SETTING_KEYS, CONFIG_SECTION } from '../constants/config';
import { COMMANDS } from '../constants/commands';
import {
  BackgroundCompressor,
  BackgroundImportError,
  importBackgroundImage,
} from '../services/runtime/background';
import { BACKGROUND_GRADIENT_IMAGE } from '../types/features';
import { showErrorMessage, showInfoMessage } from '../ui/notifications';
import { runSafely } from './runSafely';
import { CommandDeps } from './types';

const COMPRESS_TIMEOUT_MS = 60000;

/**
 * The extension host has no image codec, so large pictures are scaled in a short-lived
 * webview with a canvas (the same steps as the in-page upload in Codex: decode at the
 * target size, re-encode as WebP).
 */
const compressInWebview: BackgroundCompressor = (data, info) => {
  const scale = Math.min(1, BACKGROUND_IMAGE_LIMITS.maxEdge / Math.max(info.width, info.height));
  const width = Math.max(1, Math.round(info.width * scale));
  const height = Math.max(1, Math.round(info.height * scale));
  const nonce = randomBytes(16).toString('base64');
  const panel = vscode.window.createWebviewPanel(
    'woodfishBackground',
    'Woodfish：正在处理背景图片',
    { viewColumn: vscode.ViewColumn.Active, preserveFocus: true },
    { enableScripts: true }
  );
  panel.webview.html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';">
</head><body><p>正在缩小并压缩背景图片……</p>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
window.addEventListener('message', async (event) => {
  try {
    const { data, type, width, height } = event.data;
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type }), { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' });
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    bitmap.close();
    const out = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 })).arrayBuffer());
    let text = '';
    for (let i = 0; i < out.length; i += 0x8000) text += String.fromCharCode(...out.subarray(i, i + 0x8000));
    vscode.postMessage({ ok: true, data: btoa(text) });
  } catch (error) {
    vscode.postMessage({ ok: false, error: String(error) });
  }
});
vscode.postMessage({ ready: true });
</script></body></html>`;
  return new Promise<Buffer>((resolve, reject) => {
    const timer = setTimeout(() => {
      finish();
      reject(new BackgroundImportError('处理图片超时'));
    }, COMPRESS_TIMEOUT_MS);
    const subscription = panel.webview.onDidReceiveMessage((message: unknown) => {
      const reply = (message ?? {}) as { ready?: boolean; ok?: boolean; data?: unknown };
      if (reply.ready) {
        void panel.webview.postMessage({
          data: data.toString('base64'),
          type: info.type,
          width,
          height,
        });
        return;
      }
      finish();
      if (reply.ok === true && typeof reply.data === 'string') {
        resolve(Buffer.from(reply.data, 'base64'));
      } else {
        reject(new BackgroundImportError('无法处理这张图片'));
      }
    });
    function finish(): void {
      clearTimeout(timer);
      subscription.dispose();
      panel.dispose();
    }
  });
};

type Choice = vscode.QuickPickItem & { image?: string; pick?: true; off?: true };

/** `Woodfish: 设置背景图片` — pick a file, 《彩云》 or the gradient, or switch it off. */
export function registerSetBackgroundImageCommand(deps: CommandDeps): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.setBackgroundImage, async () => {
    await runSafely('设置背景图片', async () => {
      const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
      const choices: Choice[] = [
        { label: '$(file-media) 选择图片文件…', description: 'JPG、PNG 或 WebP', pick: true },
        { label: '$(cloud) 默认背景《彩云》', description: '作者 woodfish', image: '' },
        {
          label: '$(symbol-color) 彩云渐变',
          description: '蓝、金、粉',
          image: BACKGROUND_GRADIENT_IMAGE,
        },
        ...(config.get<boolean>(BACKGROUND_SETTING_KEYS.enabled, false)
          ? [{ label: '$(circle-slash) 关闭背景', off: true } as Choice]
          : []),
      ];
      const choice = await vscode.window.showQuickPick(choices, {
        placeHolder: '图片铺在窗口底下，侧栏和面板用毛玻璃叠在上面',
      });
      if (!choice) {
        return;
      }
      if (choice.off) {
        await config.update(
          BACKGROUND_SETTING_KEYS.enabled,
          false,
          vscode.ConfigurationTarget.Global
        );
        return;
      }
      let image = choice.image ?? '';
      if (choice.pick) {
        const [file] =
          (await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: '设为背景',
            filters: { 图片: ['jpg', 'jpeg', 'png', 'webp'] },
          })) ?? [];
        if (!file) {
          return;
        }
        try {
          image = await importBackgroundImage(
            file.fsPath,
            deps.extensionContext.globalStorageUri.fsPath,
            compressInWebview
          );
        } catch (error) {
          if (error instanceof BackgroundImportError) {
            showErrorMessage(error.message);
            return;
          }
          throw error;
        }
        showInfoMessage('已复制图片到 Woodfish 的存储目录，原图之后可以删除或移动。');
      }
      await config.update(BACKGROUND_SETTING_KEYS.image, image, vscode.ConfigurationTarget.Global);
      await config.update(BACKGROUND_SETTING_KEYS.enabled, true, vscode.ConfigurationTarget.Global);
      await deps.runtimeService.syncWithCurrentSettings({ showPrompt: true });
    });
  });
}
