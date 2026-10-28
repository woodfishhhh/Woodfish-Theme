import { CdpConnection, WebSocketConstructor, evaluate } from '../cdp/client';
import { fetchTargets } from '../cdp/http';
import { isMainWindowTarget, validateDebuggerUrl } from '../cdp/targets';

export interface PageOptions {
  WebSocketCtor?: WebSocketConstructor;
  fetchImpl?: typeof fetch;
}

/** Evaluates an expression in every Codex main window and returns the values. */
export async function evaluateInMainWindows(
  port: number,
  expression: string,
  options: PageOptions = {}
): Promise<unknown[]> {
  const targets = await fetchTargets(port, options.fetchImpl);
  const results: unknown[] = [];
  for (const target of targets.filter(isMainWindowTarget)) {
    if (!target.webSocketDebuggerUrl) {
      continue;
    }
    const connection = await CdpConnection.open(
      validateDebuggerUrl(target.webSocketDebuggerUrl, port),
      { WebSocketCtor: options.WebSocketCtor }
    );
    try {
      results.push(await evaluate(connection, expression));
    } finally {
      connection.close();
    }
  }
  return results;
}
