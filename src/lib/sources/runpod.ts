import { gpuFamily } from "../format";
import { fetchJson, nowIso, slug, SourceError } from "../http";
import type { GpuMarket, GpuQuote, SourceHealth } from "../types";

const SOURCE_ID = "runpod";
const URL = "https://api.runpod.io/graphql";
const QUERY = `{
  gpuTypes {
    id
    displayName
    memoryInGb
    securePrice
    communityPrice
    communitySpotPrice
    secureSpotPrice
    oneMonthPrice
    threeMonthPrice
    sixMonthPrice
    oneYearPrice
  }
}`;

interface RunpodGpu {
  id: string;
  displayName?: string;
  memoryInGb?: number;
  securePrice?: number | null;
  communityPrice?: number | null;
  communitySpotPrice?: number | null;
  secureSpotPrice?: number | null;
  oneMonthPrice?: number | null;
  threeMonthPrice?: number | null;
  sixMonthPrice?: number | null;
  oneYearPrice?: number | null;
}

function pushQuote(
  quotes: GpuQuote[],
  gpu: RunpodGpu,
  market: GpuMarket,
  usd: number | null | undefined,
  fetchedAt: string,
) {
  if (usd === null || usd === undefined || !Number.isFinite(usd) || usd <= 0) return;
  const name = gpu.displayName || gpu.id;
  quotes.push({
    id: slug(SOURCE_ID, gpu.id, market),
    sourceId: SOURCE_ID,
    provider: "RunPod",
    gpu: name,
    family: gpuFamily(name),
    sku: gpu.id,
    vramGb: gpu.memoryInGb ?? 0,
    gpuCount: 1,
    usdPerHour: usd,
    usdPerGpuHour: usd,
    market,
    availability: "unknown",
    live: true,
    fetchedAt,
    sourceUrl: "https://www.runpod.io/gpu-instance/pricing",
  });
}

export async function fetchRunpod(): Promise<{
  quotes: GpuQuote[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  try {
    const data = await fetchJson<{ data?: { gpuTypes?: RunpodGpu[] } }>(URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
    });
    const types = data.data?.gpuTypes ?? [];
    const quotes: GpuQuote[] = [];
    for (const gpu of types) {
      if (!gpu.id || gpu.id.toLowerCase() === "unknown") continue;
      pushQuote(quotes, gpu, "secure", gpu.securePrice, fetchedAt);
      pushQuote(quotes, gpu, "community", gpu.communityPrice, fetchedAt);
      pushQuote(quotes, gpu, "spot", gpu.communitySpotPrice ?? gpu.secureSpotPrice, fetchedAt);
      pushQuote(quotes, gpu, "reserved", gpu.oneMonthPrice, fetchedAt);
    }

    return {
      quotes,
      source: {
        id: SOURCE_ID,
        name: "RunPod",
        kind: "live",
        category: "gpus",
        status: quotes.length ? "ok" : "degraded",
        url: "https://api.runpod.io/graphql",
        coverage: "Public GraphQL gpuTypes: secure, community, spot, and reserved monthly list",
        fetchedAt,
        quoteCount: quotes.length,
        notes: "No API key required for the gpuTypes query. Prices are per GPU-hour.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError(SOURCE_ID, message);
  }
}
