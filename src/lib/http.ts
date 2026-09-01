export class SourceError extends Error {
  constructor(
    public sourceId: string,
    message: string,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 18_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBuffer(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<ArrayBuffer> {
  const { timeoutMs = 25_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function slug(...parts: Array<string | number | undefined>): string {
  return parts
    .filter((p) => p !== undefined && p !== "")
    .map((p) =>
      String(p)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .join(":");
}
