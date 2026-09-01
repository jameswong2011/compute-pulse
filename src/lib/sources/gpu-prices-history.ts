import { parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { gpuPathWindow } from "../dates";
import { median } from "../format";
import { fetchBuffer, fetchJson, nowIso, SourceError } from "../http";
import { cohortGpu } from "../lanes";
import type { GpuLanePoint, SourceHealth } from "../types";

const DATASET_API = "https://huggingface.co/api/datasets/afhubbard/gpu-prices";
const FILE_URL =
  "https://huggingface.co/datasets/afhubbard/gpu-prices/resolve/main/";

const COLUMNS = [
  "gpu_type",
  "gpu_count",
  "price_per_hour",
  "is_spot",
  "quality",
] as const;

interface DatasetInfo {
  siblings?: Array<{ rfilename?: string }>;
}

interface PriceRow {
  gpu_type?: string;
  gpu_count?: number | bigint;
  price_per_hour?: number;
  is_spot?: boolean;
  quality?: string;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return out;
}

function latestPathPerDay(
  files: string[],
  start: string,
): Array<{ date: string; path: string }> {
  const byDate = new Map<string, string[]>();
  for (const path of files) {
    const match = path.match(/^prices\/dt=(\d{4}-\d{2}-\d{2})\//);
    if (!match || match[1] < start) continue;
    const list = byDate.get(match[1]) ?? [];
    list.push(path);
    byDate.set(match[1], list);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, paths]) => ({
      date,
      path: [...paths].sort().at(-1) ?? "",
    }))
    .filter((row) => row.path);
}

function toCount(value: number | bigint | undefined): number {
  if (typeof value === "bigint") return Number(value);
  return typeof value === "number" ? value : 0;
}

export async function fetchGpuHuntHistory(start?: string): Promise<{
  gpuLanes: GpuLanePoint[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  const windowStart = start ?? gpuPathWindow().start;
  try {
    const info = await fetchJson<DatasetInfo>(DATASET_API, { timeoutMs: 20_000 });
    const files = (info.siblings ?? [])
      .map((s) => s.rfilename)
      .filter((p): p is string => typeof p === "string" && p.endsWith(".parquet"));
    const days = latestPathPerDay(files, windowStart);

    const snaps = await mapPool(days, 8, async ({ date, path }) => {
      try {
        const file = await fetchBuffer(`${FILE_URL}${path}`);
        const rows = (await parquetReadObjects({
          file,
          compressors,
          columns: [...COLUMNS],
        })) as PriceRow[];
        return { date, rows };
      } catch {
        return { date, rows: [] as PriceRow[] };
      }
    });

    const buckets = new Map<string, number[]>();
    for (const snap of snaps) {
      for (const row of snap.rows) {
        if (row.quality && row.quality !== "ok") continue;
        if (!row.gpu_type) continue;
        const gpu = cohortGpu(row.gpu_type);
        if (!gpu) continue;
        const count = toCount(row.gpu_count);
        const price = Number(row.price_per_hour);
        if (!(count > 0) || !(price > 0)) continue;
        const perGpu = price / count;
        const allKey = `${snap.date}|${gpu}|on_demand`;
        const all = buckets.get(allKey) ?? [];
        all.push(perGpu);
        buckets.set(allKey, all);
        if (!row.is_spot) {
          const firmKey = `${snap.date}|${gpu}|secure`;
          const firm = buckets.get(firmKey) ?? [];
          firm.push(perGpu);
          buckets.set(firmKey, firm);
        }
      }
    }

    const byDateGpu = new Map<string, GpuLanePoint>();
    for (const [key, prices] of buckets) {
      const [date, gpu, lane] = key.split("|");
      const id = `${date}|${gpu}`;
      const row = byDateGpu.get(id) ?? {
        date,
        gpu,
        onDemand: null,
        secure: null,
      };
      const mid = median(prices);
      if (lane === "secure") row.secure = mid;
      else row.onDemand = mid;
      byDateGpu.set(id, row);
    }

    const gpuLanes = [...byDateGpu.values()].sort((a, b) =>
      a.date === b.date
        ? a.gpu.localeCompare(b.gpu)
        : a.date.localeCompare(b.date),
    );

    return {
      gpuLanes,
      source: {
        id: "gpu-price-tracker",
        name: "GPU Price Tracker",
        kind: "live",
        category: "gpus",
        status: gpuLanes.length ? "ok" : "degraded",
        url: "https://huggingface.co/datasets/afhubbard/gpu-prices",
        coverage:
          "Daily median USD/GPU-hour over the last 6 months from twice-daily public listings (CC BY 4.0). Teal is all listings; brass is firm (non-spot).",
        fetchedAt,
        quoteCount: gpuLanes.length,
        notes:
          "Source: Hubbard GPU Price Tracker (afhubbard/gpu-prices), CC BY 4.0. Collected via gpuhunt. Spot semantics differ by provider.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError("gpu-price-tracker", message);
  }
}
