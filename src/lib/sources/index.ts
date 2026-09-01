import {
  CACHE_TTL_MS,
  TREND_TTL_MS,
  cached,
  GPU_CACHE_KEY,
  TOKEN_CACHE_KEY,
  TREND_CACHE_KEY,
  bust,
} from "../cache";
import { nowIso } from "../http";
import type {
  GpuPanel,
  OverviewPanel,
  SourceHealth,
  TokenPanel,
  TrendsPanel,
} from "../types";
import { fetchCatalog } from "./catalog";
import { fetchGpuHistory } from "./gpu-history";
import { fetchGpuRentalPrices } from "./gpurentalprices";
import { fetchLiteLLM } from "./litellm";
import { fetchOpenRouter } from "./openrouter";
import { fetchOpenRouterConsumption } from "./openrouter-consumption";
import { fetchRunpod } from "./runpod";
import { fetchVastai } from "./vastai";
import { fetchVercelGatewayConsumption } from "./vercel-gateway";

function failedSource(
  id: string,
  name: string,
  category: SourceHealth["category"],
  url: string,
  coverage: string,
  notes: string,
  error: unknown,
): SourceHealth {
  return {
    id,
    name,
    kind: "live",
    category,
    status: "error",
    url,
    coverage,
    fetchedAt: nowIso(),
    quoteCount: 0,
    error: error instanceof Error ? error.message : "Unknown error",
    notes,
  };
}

export async function loadTokenPanel(force = false): Promise<TokenPanel> {
  if (force) bust(TOKEN_CACHE_KEY);
  return cached(TOKEN_CACHE_KEY, CACHE_TTL_MS, async () => {
    const [openrouter, litellm] = await Promise.allSettled([
      fetchOpenRouter(),
      fetchLiteLLM(),
    ]);

    const quotes = [];
    const sources: SourceHealth[] = [];

    if (openrouter.status === "fulfilled") {
      quotes.push(...openrouter.value.quotes);
      sources.push(openrouter.value.source);
    } else {
      sources.push(
        failedSource(
          "openrouter",
          "OpenRouter",
          "tokens",
          "https://openrouter.ai/api/v1/models",
          "Public model catalog",
          "Live fetch failed; retry from the panel.",
          openrouter.reason,
        ),
      );
    }

    if (litellm.status === "fulfilled") {
      quotes.push(...litellm.value.quotes);
      sources.push(litellm.value.source);
    } else {
      sources.push(
        failedSource(
          "litellm",
          "LiteLLM price table",
          "tokens",
          "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json",
          "Community provider price table",
          "Live fetch failed; retry from the panel.",
          litellm.reason,
        ),
      );
    }

    return { quotes, sources, fetchedAt: nowIso() };
  });
}

export async function loadGpuPanel(force = false): Promise<GpuPanel> {
  if (force) bust(GPU_CACHE_KEY);
  return cached(GPU_CACHE_KEY, CACHE_TTL_MS, async () => {
    const [runpod, vast, catalog, grp] = await Promise.all([
      fetchRunpod().then(
        (ok) => ok,
        (error) => ({
          quotes: [],
          source: failedSource(
            "runpod",
            "RunPod",
            "gpus",
            "https://api.runpod.io/graphql",
            "Public GraphQL gpuTypes",
            "Live fetch failed; catalog sources still apply.",
            error,
          ),
        }),
      ),
      fetchVastai().then(
        (ok) => ok,
        (error) => ({
          quotes: [],
          source: failedSource(
            "vastai",
            "Vast.ai",
            "gpus",
            "https://console.vast.ai/api/v0/bundles/",
            "Live marketplace asks",
            "Live fetch failed; catalog sources still apply.",
            error,
          ),
        }),
      ),
      Promise.resolve(fetchCatalog()),
      fetchGpuRentalPrices().then(
        (ok) => ok,
        (error) => ({
          quotes: [],
          source: failedSource(
            "gpurentalprices",
            "GPU Rental Prices",
            "gpus",
            "https://gpurentalprices.com/api/latest.json",
            "Daily verified offers with on-demand vs secure tags",
            "Live snapshot failed; other GPU sources still apply.",
            error,
          ),
        }),
      ),
    ]);

    return {
      quotes: [...grp.quotes, ...runpod.quotes, ...vast.quotes, ...catalog.quotes],
      sources: [grp.source, runpod.source, vast.source, ...catalog.sources],
      fetchedAt: nowIso(),
    };
  });
}

export async function loadTrends(force = false): Promise<TrendsPanel> {
  if (force) bust(TREND_CACHE_KEY);
  return cached(TREND_CACHE_KEY, TREND_TTL_MS, async () => {
    const [consumption, gateway, history] = await Promise.allSettled([
      fetchOpenRouterConsumption(),
      fetchVercelGatewayConsumption(),
      fetchGpuHistory(),
    ]);

    const sources: SourceHealth[] = [];
    let consumptionSeries: TrendsPanel["consumption"] = [];
    let mix: TrendsPanel["mix"] = [];
    let gatewayShare: TrendsPanel["gatewayShare"] = [];
    let gatewayLabs: TrendsPanel["gatewayLabs"] = [];
    let gpuLanes: TrendsPanel["gpuLanes"] = [];
    let gpuLedgerLanes: TrendsPanel["gpuLedgerLanes"] = [];

    if (consumption.status === "fulfilled") {
      consumptionSeries = consumption.value.consumption;
      mix = consumption.value.mix;
      sources.push(consumption.value.source);
    } else {
      sources.push(
        failedSource(
          "openrouter-rankings",
          "OpenRouter rankings",
          "tokens",
          "https://openrouter.ai/rankings",
          "Weekly token consumption",
          "Public rankings chart failed this refresh.",
          consumption.reason,
        ),
      );
    }

    if (gateway.status === "fulfilled") {
      gatewayShare = gateway.value.models;
      gatewayLabs = gateway.value.labs;
      sources.push(gateway.value.source);
    } else {
      sources.push(
        failedSource(
          "vercel-ai-gateway",
          "Vercel AI Gateway",
          "tokens",
          "https://vercel.com/ai-gateway/leaderboards/models",
          "Weekly-average share of Gateway text token volume",
          "Leaderboard export failed this refresh.",
          gateway.reason,
        ),
      );
    }

    if (history.status === "fulfilled") {
      gpuLanes = history.value.gpuLanes;
      gpuLedgerLanes = history.value.gpuLedgerLanes;
      sources.push(...history.value.sources);
    } else {
      sources.push(
        failedSource(
          "gpu-history",
          "GPU price path",
          "gpus",
          "https://huggingface.co/datasets/afhubbard/gpu-prices",
          "Daily medians over the last 6 months",
          "Price-path sources failed this refresh.",
          history.reason,
        ),
      );
    }

    return {
      consumption: consumptionSeries,
      mix,
      gatewayShare,
      gatewayLabs,
      gpuLanes,
      gpuLedgerLanes,
      sources,
      fetchedAt: nowIso(),
    };
  });
}

export async function loadOverview(force = false): Promise<OverviewPanel> {
  const [tokens, gpus, trends] = await Promise.all([
    loadTokenPanel(force),
    loadGpuPanel(force),
    loadTrends(force),
  ]);
  return { tokens, gpus, trends, fetchedAt: nowIso() };
}
