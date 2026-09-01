import { cohortGpu, pathCohortGpu } from "./lanes";
import type { GpuQuote, TokenKind, TokenQuote } from "./types";

const FRONTIER = [
  "claude-opus",
  "claude-sonnet",
  "gpt-5",
  "gpt-4.1",
  "gpt-4o",
  "o3",
  "o4",
  "gemini-2.5",
  "gemini-3",
  "grok-3",
  "grok-4",
  "deepseek-v3",
  "deepseek-r1",
  "llama-4",
  "llama-3.1-405b",
  "qwen3",
  "mistral-large",
];

export function isFrontier(model: string): boolean {
  const n = model.toLowerCase();
  return FRONTIER.some((f) => n.includes(f));
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function cheapestInput(quotes: TokenQuote[]): TokenQuote | undefined {
  return quotes
    .filter((q) => q.kind === "input" && q.tier === "standard" && q.unit === "usd_per_1m_tokens")
    .sort((a, b) => a.usd - b.usd)[0];
}

export function modelRows(quotes: TokenQuote[]) {
  const map = new Map<
    string,
    {
      key: string;
      sourceId: string;
      provider: string;
      model: string;
      modelId: string;
      modality: string;
      contextLength?: number;
      live: boolean;
      fetchedAt: string;
      prices: Partial<Record<TokenKind, number>>;
      tiers: string[];
      units: Partial<Record<TokenKind, TokenQuote["unit"]>>;
    }
  >();

  for (const q of quotes) {
    const key = `${q.sourceId}::${q.modelId}::${q.tier}`;
    const row = map.get(key) ?? {
      key,
      sourceId: q.sourceId,
      provider: q.provider,
      model: q.model,
      modelId: q.modelId,
      modality: q.modality,
      contextLength: q.contextLength,
      live: q.live,
      fetchedAt: q.fetchedAt,
      prices: {},
      tiers: [q.tier],
      units: {},
    };
    row.prices[q.kind] = q.usd;
    row.units[q.kind] = q.unit;
    if (!row.tiers.includes(q.tier)) row.tiers.push(q.tier);
    map.set(key, row);
  }

  return [...map.values()];
}

export function kindCoverage(quotes: TokenQuote[]): Array<{ kind: TokenKind; count: number }> {
  const counts = new Map<TokenKind, number>();
  for (const q of quotes) {
    counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count);
}

export function gpuMatrix(quotes: GpuQuote[], gpus: string[], providers: string[]) {
  const cells: Record<string, GpuQuote | undefined> = {};
  for (const q of quotes) {
    if (q.gpu.includes("(median)")) continue;
    const cohort = pathCohortGpu(q.gpu) ?? cohortGpu(q.gpu);
    const matchGpu =
      cohort && gpus.includes(cohort)
        ? cohort
        : gpus.find((g) => q.gpu.toUpperCase().includes(g.toUpperCase()));
    if (!matchGpu) continue;
    if (!providers.includes(q.provider)) continue;
    const key = `${q.provider}::${matchGpu}`;
    const prev = cells[key];
    if (!prev || q.usdPerGpuHour < prev.usdPerGpuHour) cells[key] = q;
  }
  return cells;
}

export function workloadCost(
  row: { prices: Partial<Record<TokenKind, number>> },
  inputM: number,
  outputM: number,
  cacheReadM = 0,
) {
  const input = row.prices.input ?? 0;
  const output = row.prices.output ?? 0;
  const cache = row.prices.cache_read ?? input;
  return input * inputM + output * outputM + cache * cacheReadM;
}
