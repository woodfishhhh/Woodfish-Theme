import { showErrorMessage } from '../ui/notifications';

export async function runSafely(actionLabel: string, task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showErrorMessage(`${actionLabel}失败: ${message}`);
  }
}
