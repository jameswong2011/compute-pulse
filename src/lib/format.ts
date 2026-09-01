import type { GpuLane, GpuMarket, PriceTier, PriceUnit, TokenKind } from "./types";

export const TOKEN_KIND_LABEL: Record<TokenKind, string> = {
  input: "Input",
  output: "Output",
  cache_read: "Cache read",
  cache_write: "Cache write",
  cache_write_1h: "Cache write (1h)",
  reasoning: "Reasoning",
  audio_input: "Audio in",
  audio_output: "Audio out",
  audio_cache: "Audio cache",
  image_input: "Image in",
  image_output: "Image out",
  image_token: "Image token",
  video_input: "Video in",
  embedding: "Embedding",
  rerank: "Rerank",
  ocr: "OCR",
  web_search: "Web search",
  request: "Per request",
};

export const TIER_LABEL: Record<PriceTier, string> = {
  standard: "Standard",
  batch: "Batch",
  flex: "Flex",
  priority: "Priority",
  long_context: "Long context",
};

export const UNIT_LABEL: Record<PriceUnit, string> = {
  usd_per_1m_tokens: "/ 1M tok",
  usd_per_image: "/ image",
  usd_per_request: "/ request",
  usd_per_search: "/ search",
  usd_per_page: "/ page",
  usd_per_second: "/ sec",
};

export const MARKET_LABEL: Record<GpuMarket, string> = {
  on_demand: "On-demand",
  spot: "Spot",
  community: "Community",
  secure: "Secure",
  reserved: "Reserved",
  list: "List price",
};

export const LANE_LABEL: Record<GpuLane, string> = {
  on_demand: "On-demand",
  secure: "Secure",
};

export function gpuLane(market: GpuMarket): GpuLane {
  return market === "secure" || market === "reserved" ? "secure" : "on_demand";
}

export function formatUsd(
  value: number,
  opts?: { digits?: number; compact?: boolean },
): string {
  if (!Number.isFinite(value)) return "—";
  const digits =
    opts?.digits ??
    (Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 2 : Math.abs(value) >= 1 ? 2 : 4);
  if (opts?.compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatTokens(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const n = abs;
  if (n >= 1e12) return `${sign}${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${sign}${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${sign}${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${sign}${(n / 1e3).toFixed(1)}K`;
  return value.toLocaleString("en-US");
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  const digits = Math.abs(pct) >= 10 ? 0 : 1;
  return `${sign}${pct.toFixed(digits)}%`;
}

export function formatShare(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const pct = value * 100;
  const digits = Math.abs(pct) >= 10 ? 0 : 1;
  return `${pct.toFixed(digits)}%`;
}

export function formatUsdSmart(value: number, unit: PriceUnit): string {
  if (unit === "usd_per_1m_tokens") {
    if (value === 0) return "$0";
    if (value < 0.01) return `$${value.toFixed(4)}`;
    if (value < 1) return `$${value.toFixed(3)}`;
    return formatUsd(value, { digits: 2 });
  }
  return formatUsd(value, { digits: value < 1 ? 4 : 2 });
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "not fetched";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const delta = Date.now() - then;
  const sec = Math.round(delta / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 36) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function gpuFamily(name: string): string {
  const n = name.toUpperCase();
  if (n.includes("B300") || n.includes("GB200") || n.includes("B200")) return "Blackwell";
  if (n.includes("H200") || n.includes("H100") || n.includes("GH200") || n.includes("H800"))
    return "Hopper";
  if (n.includes("A100") || n.includes("A800") || n.includes("A40") || n.includes("A10") || n.includes("A6000"))
    return "Ampere";
  if (n.includes("L40") || n.includes("L4") || n.includes("6000 ADA") || n.includes("4090"))
    return "Ada";
  if (n.includes("5090") || n.includes("PRO 6000") || n.includes("BLACKWELL")) return "Blackwell";
  if (n.includes("MI300") || n.includes("MI250") || n.includes("MI325")) return "AMD";
  if (n.includes("V100")) return "Volta";
  if (n.includes("T4") || n.includes("P100") || n.includes("P4")) return "Turing/older";
  if (n.includes("3090") || n.includes("3080") || n.includes("3070") || n.includes("A5000"))
    return "Ampere consumer";
  return "Other";
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}
