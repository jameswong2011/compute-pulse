import { gpuPathWindow, snapshotDateFromPath } from "../dates";
import { median } from "../format";
import { fetchJson, nowIso, SourceError } from "../http";
import { cohortGpu, laneFromKind } from "../lanes";
import type { GpuLanePoint, SourceHealth } from "../types";
import { fetchGpuHuntHistory } from "./gpu-prices-history";

const TREE_URL =
  "https://huggingface.co/api/datasets/gpurentalprices/gpu-rental-prices/tree/main/data/snapshots";
const FILE_URL =
  "https://huggingface.co/datasets/gpurentalprices/gpu-rental-prices/resolve/main/";

interface SnapshotOffer {
  gpu?: string;
  usd_hr?: number;
  kind?: string;
}

interface Snapshot {
  date?: string;
  offers?: SnapshotOffer[];
}

interface TreeEntry {
  path?: string;
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

async function fetchLedgerHistory(start: string): Promise<{
  gpuLanes: GpuLanePoint[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  const tree = await fetchJson<TreeEntry[]>(TREE_URL);
  const paths = tree
    .map((e) => e.path)
    .filter((p): p is string => {
      if (typeof p !== "string" || !p.endsWith(".json")) return false;
      const date = snapshotDateFromPath(p);
      return date != null && date >= start;
    })
    .sort();

  const snaps = await mapPool(paths, 8, async (path) => {
    try {
      return await fetchJson<Snapshot>(`${FILE_URL}${path}`);
    } catch {
      return null;
    }
  });

  const buckets = new Map<string, number[]>();
  for (const snap of snaps) {
    if (!snap?.date || !snap.offers) continue;
    for (const offer of snap.offers) {
      if (!offer.gpu || !offer.kind || !offer.usd_hr || offer.usd_hr <= 0) continue;
      const gpu = cohortGpu(offer.gpu);
      const lane = laneFromKind(offer.kind);
      if (!gpu || !lane) continue;
      const key = `${snap.date}|${gpu}|${lane}`;
      const list = buckets.get(key) ?? [];
      list.push(offer.usd_hr);
      buckets.set(key, list);
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

  const gpuLanes = [...byDateGpu.values()]
    .filter((row) => row.date >= start)
    .sort((a, b) =>
      a.date === b.date ? a.gpu.localeCompare(b.gpu) : a.date.localeCompare(b.date),
    );

  return {
    gpuLanes,
    source: {
      id: "gpurentalprices-history",
      name: "GPU Rental Prices ledger",
      kind: "live",
      category: "gpus",
      status: gpuLanes.length ? "ok" : "degraded",
      url: "https://huggingface.co/datasets/gpurentalprices/gpu-rental-prices",
      coverage:
        "Daily on-demand vs secure median USD/GPU-hour from the public Hugging Face snapshot window",
      fetchedAt,
      quoteCount: gpuLanes.length,
      notes:
        "Source: GPU Rental Prices (gpurentalprices.com), CC BY 4.0 daily snapshots since 2026-07-05. Used for the recent end of the 6-month path when present.",
    },
  };
}

function mergeLanes(
  base: GpuLanePoint[],
  overlay: GpuLanePoint[],
): GpuLanePoint[] {
  const byId = new Map<string, GpuLanePoint>();
  for (const row of base) byId.set(`${row.date}|${row.gpu}`, { ...row });
  for (const row of overlay) byId.set(`${row.date}|${row.gpu}`, { ...row });
  return [...byId.values()].sort((a, b) =>
    a.date === b.date ? a.gpu.localeCompare(b.gpu) : a.date.localeCompare(b.date),
  );
}

export async function fetchGpuHistory(): Promise<{
  gpuLanes: GpuLanePoint[];
  sources: SourceHealth[];
}> {
  const { start } = gpuPathWindow();
  const [hunt, ledger] = await Promise.allSettled([
    fetchGpuHuntHistory(start),
    fetchLedgerHistory(start),
  ]);

  const sources: SourceHealth[] = [];
  let gpuLanes: GpuLanePoint[] = [];

  if (hunt.status === "fulfilled") {
    gpuLanes = mergeLanes(gpuLanes, hunt.value.gpuLanes);
    sources.push(hunt.value.source);
  } else {
    sources.push({
      id: "gpu-price-tracker",
      name: "GPU Price Tracker",
      kind: "live",
      category: "gpus",
      status: "error",
      url: "https://huggingface.co/datasets/afhubbard/gpu-prices",
      coverage: "Daily median USD/GPU-hour over the last 6 months",
      fetchedAt: nowIso(),
      quoteCount: 0,
      error:
        hunt.reason instanceof Error ? hunt.reason.message : "Unknown error",
      notes: "Six-month listing history failed this refresh.",
    });
  }

  if (ledger.status === "fulfilled") {
    gpuLanes = mergeLanes(gpuLanes, ledger.value.gpuLanes);
    sources.push(ledger.value.source);
  } else {
    sources.push({
      id: "gpurentalprices-history",
      name: "GPU Rental Prices ledger",
      kind: "live",
      category: "gpus",
      status: "error",
      url: "https://huggingface.co/datasets/gpurentalprices/gpu-rental-prices",
      coverage: "Daily on-demand vs secure medians",
      fetchedAt: nowIso(),
      quoteCount: 0,
      error:
        ledger.reason instanceof Error
          ? ledger.reason.message
          : "Unknown error",
      notes: "Recent ledger window failed this refresh.",
    });
  }

  if (!gpuLanes.length) {
    throw new SourceError(
      "gpu-history",
      "No GPU price-path snapshots loaded.",
    );
  }

  return { gpuLanes, sources };
}
