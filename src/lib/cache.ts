type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return Promise.resolve(hit.value as T);
  }
  return loader().then((value) => {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  });
}

export function bust(key?: string) {
  if (key) store.delete(key);
  else store.clear();
}

export const TOKEN_CACHE_KEY = "tokens";
export const GPU_CACHE_KEY = "gpus";
export const TREND_CACHE_KEY = "trends-gpu-sources";
export const AA_CACHE_KEY = "artificial-analysis";
export const CACHE_TTL_MS = 5 * 60 * 1000;
export const TREND_TTL_MS = 30 * 60 * 1000;
