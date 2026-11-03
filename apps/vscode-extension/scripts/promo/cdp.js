'use strict';
/*
 * Minimal Chrome DevTools Protocol client for the promo renderer: launches headless Chrome
 * with a private profile and talks to one page over Node's built-in WebSocket.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const STARTUP_TIMEOUT_MS = 20000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits for Chrome to write `DevToolsActivePort` into its profile and returns the port. */
async function readDevToolsPort(profileDir) {
  const file = path.join(profileDir, 'DevToolsActivePort');
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) {
      const port = Number(fs.readFileSync(file, 'utf8').split(/\r?\n/)[0]);
      if (Number.isInteger(port) && port > 0) {
        return port;
      }
    }
    await delay(100);
  }
  throw new Error('Chrome did not open its DevTools port');
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', (event) => this.receive(JSON.parse(String(event.data))));
    socket.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error('DevTools connection closed'));
      }
      this.pending.clear();
    });
  }

  receive(message) {
    if (message.id !== undefined) {
      const waiter = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (!waiter) {
        return;
      }
      if (message.error) {
        waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
      } else {
        waiter.resolve(message.result);
      }
      return;
    }
    for (const listener of this.listeners.get(message.method) ?? []) {
      listener(message.params);
    }
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const listeners = this.listeners.get(method) ?? [];
      const listener = (params) => {
        this.listeners.set(
          method,
          (this.listeners.get(method) ?? []).filter((entry) => entry !== listener)
        );
        resolve(params);
      };
      this.listeners.set(method, [...listeners, listener]);
    });
  }

  /** Evaluates an expression in the page, awaiting promises; throws page exceptions. */
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      const description = result.exceptionDetails.exception?.description;
      throw new Error(description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  }
}

/** Launches headless Chrome and opens one page at `width`×`height` CSS pixels. */
async function launchPage(chromePath, profileDir, { width, height }) {
  fs.mkdirSync(profileDir, { recursive: true });
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
      '--allow-file-access-from-files',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileDir}`,
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  const port = await readDevToolsPort(profileDir);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.type === 'page');
  if (!page) {
    chrome.kill();
    throw new Error('Chrome opened no page');
  }
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('DevTools socket failed')), {
      once: true,
    });
  });
  const session = new CdpSession(socket);
  await session.send('Page.enable');
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return {
    session,
    /** Closes the page and waits for Chrome to exit, so its profile can be deleted. */
    async close() {
      const exited = new Promise((resolve) => chrome.once('exit', resolve));
      socket.close();
      chrome.kill();
      await Promise.race([exited, delay(5000)]);
    },
  };
}

module.exports = { launchPage };
