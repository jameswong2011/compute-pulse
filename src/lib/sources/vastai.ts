import { gpuFamily, median, percentile } from "../format";
import { fetchJson, nowIso, slug, SourceError } from "../http";
import type { GpuMarket, GpuQuote, SourceHealth } from "../types";

const SOURCE_ID = "vastai";
const BASE = "https://console.vast.ai/api/v0/bundles/";

const TARGET_GPUS = [
  "H100 SXM",
  "H100 PCIE",
  "H100 NVL",
  "H200",
  "H200 NVL",
  "B200",
  "GH200",
  "A100 SXM4",
  "A100 PCIE",
  "L40S",
  "L40",
  "RTX 4090",
  "RTX 5090",
  "RTX 6000Ada",
  "RTX A6000",
  "RTX PRO 6000",
  "A40",
  "A6000",
  "RTX 3090",
  "MI300X",
];

interface VastOffer {
  id?: number;
  gpu_name?: string;
  num_gpus?: number;
  gpu_ram?: number;
  dph_total?: number;
  geolocation?: string;
  is_bid?: boolean;
  rentable?: boolean;
}

interface VastResponse {
  offers?: VastOffer[];
}

async function queryOffers(gpuName?: string, limit = 40): Promise<VastOffer[]> {
  const q: Record<string, unknown> = {
    rentable: { eq: true },
    order: [["dph_total", "asc"]],
    type: "on-demand",
    limit,
  };
  if (gpuName) q.gpu_name = { eq: gpuName };
  const url = `${BASE}?q=${encodeURIComponent(JSON.stringify(q))}`;
  const data = await fetchJson<VastResponse>(url, { timeoutMs: 16_000 });
  return data.offers ?? [];
}

function normalizeName(name: string): string {
  return name.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchVastai(): Promise<{
  quotes: GpuQuote[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  try {
    const offers: VastOffer[] = [];
    let failures = 0;
    const chunkSize = 5;
    for (let i = 0; i < TARGET_GPUS.length; i += chunkSize) {
      const chunk = TARGET_GPUS.slice(i, i + chunkSize);
      const batches = await Promise.allSettled(
        chunk.map((name) => queryOffers(name, 24)),
      );
      for (const batch of batches) {
        if (batch.status === "fulfilled") offers.push(...batch.value);
        else failures += 1;
      }
    }

    const groups = new Map<string, VastOffer[]>();
    for (const offer of offers) {
      if (!offer.gpu_name || !offer.dph_total || offer.dph_total <= 0) continue;
      if (!offer.num_gpus) continue;
      const market: GpuMarket = offer.is_bid ? "spot" : "on_demand";
      const key = `${normalizeName(offer.gpu_name)}|${market}`;
      const list = groups.get(key) ?? [];
      list.push(offer);
      groups.set(key, list);
    }

    const quotes: GpuQuote[] = [];
    for (const [key, group] of groups) {
      const [gpu, market] = key.split("|") as [string, GpuMarket];
      const perGpu = group
        .map((o) => (o.dph_total ?? 0) / (o.num_gpus || 1))
        .filter((n) => n > 0)
        .sort((a, b) => a - b);
      const floor = perGpu[0];
      const p50 = median(perGpu);
      const p90 = percentile(perGpu, 90);
      const vram = Math.round((group[0].gpu_ram ?? 0) / 1024);
      const regions = [...new Set(group.map((o) => o.geolocation).filter(Boolean))];

      quotes.push({
        id: slug(SOURCE_ID, gpu, market, "floor"),
        sourceId: SOURCE_ID,
        provider: "Vast.ai",
        gpu,
        family: gpuFamily(gpu),
        vramGb: vram,
        gpuCount: 1,
        usdPerHour: floor,
        usdPerGpuHour: floor,
        market,
        availability: group.length > 8 ? "available" : "limited",
        region: regions[0],
        offerCount: group.length,
        live: true,
        fetchedAt,
        sourceUrl: "https://cloud.vast.ai/",
      });

      if (p50 && Math.abs(p50 - floor) / floor > 0.08) {
        quotes.push({
          id: slug(SOURCE_ID, gpu, market, "median"),
          sourceId: SOURCE_ID,
          provider: "Vast.ai",
          gpu: `${gpu} (median)`,
          family: gpuFamily(gpu),
          vramGb: vram,
          gpuCount: 1,
          usdPerHour: p50,
          usdPerGpuHour: p50,
          market,
          availability: "available",
          region: regions[0],
          offerCount: group.length,
          live: true,
          fetchedAt,
          sourceUrl: "https://cloud.vast.ai/",
        });
      }

      void p90;
    }

    return {
      quotes,
      source: {
        id: SOURCE_ID,
        name: "Vast.ai",
        kind: "live",
        category: "gpus",
        status: quotes.length ? (failures ? "degraded" : "ok") : "degraded",
        url: BASE,
        coverage: `Live marketplace floor and median for ${TARGET_GPUS.length} research-relevant GPU SKUs`,
        fetchedAt,
        quoteCount: quotes.length,
        error: failures ? `${failures} GPU queries failed` : undefined,
        notes: "Public bundles API. Floor is the cheapest rentable 1-GPU-equivalent on-demand ask.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError(SOURCE_ID, message);
  }
}
