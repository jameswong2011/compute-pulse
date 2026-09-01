export const TOKEN_KINDS = [
  "input",
  "output",
  "cache_read",
  "cache_write",
  "cache_write_1h",
  "reasoning",
  "audio_input",
  "audio_output",
  "audio_cache",
  "image_input",
  "image_output",
  "image_token",
  "video_input",
  "embedding",
  "rerank",
  "ocr",
  "web_search",
  "request",
] as const;

export type TokenKind = (typeof TOKEN_KINDS)[number];

export const PRICE_TIERS = [
  "standard",
  "batch",
  "flex",
  "priority",
  "long_context",
] as const;

export type PriceTier = (typeof PRICE_TIERS)[number];

export const PRICE_UNITS = [
  "usd_per_1m_tokens",
  "usd_per_image",
  "usd_per_request",
  "usd_per_search",
  "usd_per_page",
  "usd_per_second",
] as const;

export type PriceUnit = (typeof PRICE_UNITS)[number];

export type SourceKind = "live" | "catalog";
export type SourceStatus = "ok" | "degraded" | "error" | "catalog";

export interface SourceHealth {
  id: string;
  name: string;
  kind: SourceKind;
  category: "tokens" | "gpus" | "both";
  status: SourceStatus;
  url: string;
  coverage: string;
  fetchedAt: string | null;
  quoteCount: number;
  error?: string;
  notes: string;
}

export interface TokenQuote {
  id: string;
  sourceId: string;
  provider: string;
  model: string;
  modelId: string;
  modality: string;
  kind: TokenKind;
  tier: PriceTier;
  unit: PriceUnit;
  usd: number;
  contextLength?: number;
  live: boolean;
  fetchedAt: string;
}

export type GpuMarket =
  | "on_demand"
  | "spot"
  | "community"
  | "secure"
  | "reserved"
  | "list";

export type GpuLane = "on_demand" | "secure";

export interface GpuQuote {
  id: string;
  sourceId: string;
  provider: string;
  gpu: string;
  family: string;
  sku?: string;
  vramGb: number;
  gpuCount: number;
  usdPerHour: number;
  usdPerGpuHour: number;
  market: GpuMarket;
  availability: "available" | "limited" | "unknown";
  region?: string;
  offerCount?: number;
  live: boolean;
  fetchedAt: string;
  sourceUrl: string;
}

export interface TokenPanel {
  quotes: TokenQuote[];
  sources: SourceHealth[];
  fetchedAt: string;
}

export interface GpuPanel {
  quotes: GpuQuote[];
  sources: SourceHealth[];
  fetchedAt: string;
}

export interface AaModel {
  id: string;
  name: string;
  slug: string;
  creator: string;
  intelligence: number | null;
  coding: number | null;
  agentic: number | null;
  inputUsd: number | null;
  outputUsd: number | null;
  cacheReadUsd: number | null;
  tokensPerSec: number | null;
  ttftSec: number | null;
  evalCostUsd: number | null;
  releaseDate: string | null;
}

export interface AaPanel {
  models: AaModel[];
  source: SourceHealth;
  indexVersion: number | null;
}

export interface OverviewPanel {
  tokens: TokenPanel;
  gpus: GpuPanel;
  trends: TrendsPanel;
  analysis: AaPanel;
  fetchedAt: string;
}

export interface ConsumptionMix {
  model: string;
  modelId: string;
  window: "day" | "week" | "month";
  prompt: number;
  completion: number;
  reasoning: number;
  requests: number;
}

export interface SeriesPoint {
  date: string;
  values: Record<string, number>;
}

export interface GpuLanePoint {
  date: string;
  gpu: string;
  onDemand: number | null;
  secure: number | null;
}

export interface TrendsPanel {
  consumption: SeriesPoint[];
  mix: ConsumptionMix[];
  gatewayShare: SeriesPoint[];
  gatewayLabs: SeriesPoint[];
  gpuLanes: GpuLanePoint[];
  gpuLedgerLanes: GpuLanePoint[];
  ornnGpuLanes: GpuLanePoint[];
  ornnTokenPrices: SeriesPoint[];
  sources: SourceHealth[];
  fetchedAt: string;
}
