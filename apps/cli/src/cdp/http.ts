import { CdpTarget, CdpVersion } from './targets';

const HTTP_TIMEOUT_MS = 3000;

async function getJson<T>(port: number, pathname: string, fetchImpl: typeof fetch): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}${pathname}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`调试端口 ${port} 返回 HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchVersion(port: number, fetchImpl: typeof fetch = fetch): Promise<CdpVersion> {
  return getJson<CdpVersion>(port, '/json/version', fetchImpl);
}

export function fetchTargets(port: number, fetchImpl: typeof fetch = fetch): Promise<CdpTarget[]> {
  return getJson<CdpTarget[]>(port, '/json/list', fetchImpl);
}

/** Resolves true if something answers `/json/version` on the port. */
export async function isDebugPortAlive(
  port: number,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  try {
    await fetchVersion(port, fetchImpl);
    return true;
  } catch {
    return false;
  }
}
