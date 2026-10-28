/*
 * Minimal Chrome DevTools Protocol client over a WebSocket, written from the public
 * protocol documentation. Supports flat sessions (Target.attachToTarget flatten:true).
 */

/** The subset of the WHATWG WebSocket API the client needs. */
export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
}

export type WebSocketConstructor = new (url: string) => WebSocketLike;

interface PendingCall {
  resolve: (value: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface CdpEvent {
  method: string;
  params: Record<string, unknown>;
  sessionId?: string;
}

export class CdpError extends Error {
  public constructor(
    message: string,
    public readonly method: string
  ) {
    super(message);
    this.name = 'CdpError';
  }
}

export interface CdpConnectionOptions {
  WebSocketCtor?: WebSocketConstructor;
  timeoutMs?: number;
}

export class CdpConnection {
  private nextId = 1;
  private readonly pending = new Map<number, PendingCall>();
  private readonly listeners = new Set<(event: CdpEvent) => void>();
  private readonly closeListeners = new Set<() => void>();
  private closed = false;

  private constructor(
    private readonly socket: WebSocketLike,
    private readonly timeoutMs: number
  ) {
    socket.onmessage = (event): void => this.handleMessage(event.data);
    socket.onclose = (): void => this.handleClose();
    socket.onerror = (): void => this.handleClose();
  }

  /** Opens a connection; `url` must already be validated (see validateDebuggerUrl). */
  public static async open(
    url: string,
    options: CdpConnectionOptions = {}
  ): Promise<CdpConnection> {
    const Ctor =
      options.WebSocketCtor ??
      (globalThis as unknown as { WebSocket?: WebSocketConstructor }).WebSocket;
    if (!Ctor) {
      throw new Error('当前 Node.js 没有内置 WebSocket，请使用 Node.js 22 或更高版本');
    }
    const socket = new Ctor(url);
    const timeoutMs = options.timeoutMs ?? 10000;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`连接调试端口超时：${url}`)), timeoutMs);
      socket.onopen = (): void => {
        clearTimeout(timer);
        resolve();
      };
      socket.onerror = (): void => {
        clearTimeout(timer);
        reject(new Error(`无法连接调试端口：${url}`));
      };
    });
    return new CdpConnection(socket, timeoutMs);
  }

  public get isClosed(): boolean {
    return this.closed;
  }

  /** Sends a command; `sessionId` targets an attached page in flat mode. */
  public send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string
  ): Promise<Record<string, unknown>> {
    if (this.closed) {
      return Promise.reject(new CdpError('调试连接已关闭', method));
    }
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new CdpError(`${method} 超时`, method));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  public onEvent(listener: (event: CdpEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onClose(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  public close(): void {
    if (!this.closed) {
      this.socket.close();
      this.handleClose();
    }
  }

  private handleMessage(data: unknown): void {
    let message: {
      id?: number;
      result?: Record<string, unknown>;
      error?: { message?: string };
      method?: string;
      params?: Record<string, unknown>;
      sessionId?: string;
    };
    try {
      message = JSON.parse(typeof data === 'string' ? data : String(data)) as typeof message;
    } catch {
      return;
    }
    if (typeof message.id === 'number') {
      const call = this.pending.get(message.id);
      if (!call) {
        return;
      }
      this.pending.delete(message.id);
      clearTimeout(call.timer);
      if (message.error) {
        call.reject(new CdpError(message.error.message ?? '调试命令失败', 'unknown'));
      } else {
        call.resolve(message.result ?? {});
      }
      return;
    }
    if (typeof message.method === 'string') {
      const event: CdpEvent = {
        method: message.method,
        params: message.params ?? {},
        ...(message.sessionId ? { sessionId: message.sessionId } : {}),
      };
      for (const listener of this.listeners) {
        listener(event);
      }
    }
  }

  private handleClose(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const call of this.pending.values()) {
      clearTimeout(call.timer);
      call.reject(new CdpError('调试连接已关闭', 'close'));
    }
    this.pending.clear();
    for (const listener of this.closeListeners) {
      listener();
    }
  }
}

/** Result value of Runtime.evaluate, or an error with the page's exception text. */
export async function evaluate(
  connection: CdpConnection,
  expression: string,
  sessionId?: string
): Promise<unknown> {
  const response = await connection.send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: false },
    sessionId
  );
  const exception = response.exceptionDetails as
    { text?: string; exception?: { description?: string } } | undefined;
  if (exception) {
    throw new CdpError(
      exception.exception?.description ?? exception.text ?? '页面脚本执行失败',
      'Runtime.evaluate'
    );
  }
  return (response.result as { value?: unknown } | undefined)?.value;
}
