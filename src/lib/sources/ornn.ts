import { isoDay } from "../dates";
import { fetchJson, nowIso, SourceError } from "../http";
import type { GpuLanePoint, SeriesPoint, SourceHealth } from "../types";

const BASE = "https://api.ornnai.com";
const SOURCE_URL = "https://data.ornn.com/";

const GPU_MAP: Array<{ ornn: string; cohort: "H100" | "H200" | "B200" | "A100" }> =
  [
    { ornn: "H100 SXM", cohort: "H100" },
    { ornn: "H200", cohort: "H200" },
    { ornn: "B200", cohort: "B200" },
    { ornn: "A100 SXM4", cohort: "A100" },
  ];

const OTPI_LABS = ["anthropic", "openai", "google", "deepseek"] as const;

interface IndexPoint {
  timestamp?: string;
  index_value?: number;
}

interface GpuHistoryEnvelope {
  success?: boolean;
  access?: string;
  data?: IndexPoint[];
}

interface OtpiRow {
  date?: string;
  lab?: string;
  indexPerMtok?: number;
}

interface OtpiEnvelope {
  success?: boolean;
  startDate?: string;
  endDate?: string;
  data?: OtpiRow[];
}

function dayFromTs(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10) || null;
  return isoDay(d);
}

export async function fetchOrnnGpuHistory(): Promise<{
  gpuLanes: GpuLanePoint[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  const end = isoDay(new Date());
  const start = isoDay(new Date(Date.now() - 100 * 86_400_000));
  try {
    const snaps = await Promise.all(
      GPU_MAP.map(async ({ ornn, cohort }) => {
        const path = encodeURIComponent(ornn);
        const body = await fetchJson<GpuHistoryEnvelope>(
          `${BASE}/api/gpu/${path}/index-history?startDate=${start}&endDate=${end}`,
          { timeoutMs: 20_000, headers: { accept: "application/json" } },
        );
        return { cohort, points: body.data ?? [] };
      }),
    );

    const gpuLanes: GpuLanePoint[] = [];
    for (const { cohort, points } of snaps) {
      for (const point of points) {
        if (!point.timestamp || !(Number(point.index_value) > 0)) continue;
        const date = dayFromTs(point.timestamp);
        if (!date) continue;
        gpuLanes.push({
          date,
          gpu: cohort,
          onDemand: Number(point.index_value),
          secure: null,
        });
      }
    }
    gpuLanes.sort((a, b) =>
      a.date === b.date
        ? a.gpu.localeCompare(b.gpu)
        : a.date.localeCompare(b.date),
    );

    return {
      gpuLanes,
      source: {
        id: "ornn-gpu-index",
        name: "Ornn GPU index",
        kind: "live",
        category: "gpus",
        status: gpuLanes.length ? "ok" : "degraded",
        url: SOURCE_URL,
        coverage:
          "Public OCPI daily index for H100 SXM, H200, B200, and A100 SXM4 over the trailing 3 months. Transaction-weighted USD/GPU-hour, not a listing median.",
        fetchedAt,
        quoteCount: gpuLanes.length,
        notes:
          "Source: Ornn Data Index tier (data.ornn.com / api.ornnai.com). No key. Not mixed with Hubbard or GPU Rental Prices.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError("ornn-gpu-index", message);
  }
}

export async function fetchOrnnTokenIndex(): Promise<{
  prices: SeriesPoint[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  const end = isoDay(new Date());
  const start = isoDay(new Date(Date.now() - 32 * 86_400_000));
  try {
    const body = await fetchJson<OtpiEnvelope>(
      `${BASE}/api/otpi?startDate=${start}&endDate=${end}`,
      { timeoutMs: 20_000, headers: { accept: "application/json" } },
    );
    const byDate = new Map<string, Record<string, number>>();
    for (const row of body.data ?? []) {
      if (!row.date || !row.lab) continue;
      if (!(OTPI_LABS as readonly string[]).includes(row.lab)) continue;
      const price = Number(row.indexPerMtok);
      if (!(price > 0)) continue;
      const values = byDate.get(row.date) ?? {};
      values[row.lab] = price;
      byDate.set(row.date, values);
    }
    const prices = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, values }));

    return {
      prices,
      source: {
        id: "ornn-otpi",
        name: "Ornn token price index",
        kind: "live",
        category: "tokens",
        status: prices.length ? "ok" : "degraded",
        url: "https://data.ornn.com/docs/token-price-index",
        coverage:
          "Public OTPI: volume-weighted USD per million tokens for Anthropic, OpenAI, Google, and DeepSeek over the trailing month.",
        fetchedAt,
        quoteCount: prices.length,
        notes:
          "Source: Ornn Data Index tier. Realized lab blend, not a model list price and not token volume. Do not add to OpenRouter counts.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError("ornn-otpi", message);
  }
}
