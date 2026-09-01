import { gpuFamily } from "../format";
import { fetchJson, nowIso, slug, SourceError } from "../http";
import { cohortGpu, marketFromKind } from "../lanes";
import type { GpuQuote, SourceHealth } from "../types";

const URL = "https://gpurentalprices.com/api/latest.json";
const SOURCE_ID = "gpurentalprices";

interface Offer {
  provider?: string;
  gpu?: string;
  vram_gb?: number;
  usd_hr?: number;
  kind?: string;
  source_url?: string;
  fetched_at?: string;
}

export async function fetchGpuRentalPrices(): Promise<{
  quotes: GpuQuote[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  try {
    const data = await fetchJson<{ date?: string; offers?: Offer[] }>(URL);
    const quotes: GpuQuote[] = [];
    for (const offer of data.offers ?? []) {
      if (!offer.provider || !offer.gpu || !offer.usd_hr || offer.usd_hr <= 0) continue;
      const market = marketFromKind(offer.kind ?? "");
      if (!market) continue;
      const label = (cohortGpu(offer.gpu) ?? offer.gpu).replace(/-/g, " ");
      quotes.push({
        id: slug(SOURCE_ID, offer.provider, offer.gpu, offer.kind),
        sourceId: SOURCE_ID,
        provider: offer.provider,
        gpu: label,
        family: gpuFamily(label),
        sku: offer.gpu,
        vramGb: offer.vram_gb ?? 0,
        gpuCount: 1,
        usdPerHour: offer.usd_hr,
        usdPerGpuHour: offer.usd_hr,
        market,
        availability: "unknown",
        region: `snapshot ${data.date ?? "latest"}`,
        live: true,
        fetchedAt: offer.fetched_at ?? fetchedAt,
        sourceUrl: offer.source_url ?? "https://gpurentalprices.com/",
      });
    }

    return {
      quotes,
      source: {
        id: SOURCE_ID,
        name: "GPU Rental Prices",
        kind: "live",
        category: "gpus",
        status: quotes.length ? "ok" : "degraded",
        url: URL,
        coverage: "Daily verified offers tagged on-demand, secure, community, and spot",
        fetchedAt,
        quoteCount: quotes.length,
        notes:
          "Source: GPU Rental Prices (gpurentalprices.com), retrieved from the public latest snapshot. CC BY 4.0.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError(SOURCE_ID, message);
  }
}
