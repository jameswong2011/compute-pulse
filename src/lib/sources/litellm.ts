import { fetchJson, nowIso, slug, SourceError } from "../http";
import type { PriceTier, PriceUnit, SourceHealth, TokenKind, TokenQuote } from "../types";

const SOURCE_ID = "litellm";
const URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

type LiteModel = Record<string, unknown>;

interface FieldMap {
  key: string;
  kind: TokenKind;
  tier: PriceTier;
  unit: PriceUnit;
  scale: number;
}

const FIELDS: FieldMap[] = [
  { key: "input_cost_per_token", kind: "input", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "output_cost_per_token", kind: "output", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "input_cost_per_token_batches", kind: "input", tier: "batch", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "output_cost_per_token_batches", kind: "output", tier: "batch", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "input_cost_per_token_flex", kind: "input", tier: "flex", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "output_cost_per_token_flex", kind: "output", tier: "flex", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "input_cost_per_token_priority", kind: "input", tier: "priority", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "output_cost_per_token_priority", kind: "output", tier: "priority", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "input_cost_per_token_above_200k_tokens", kind: "input", tier: "long_context", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "output_cost_per_token_above_200k_tokens", kind: "output", tier: "long_context", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "cache_read_input_token_cost", kind: "cache_read", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "cache_creation_input_token_cost", kind: "cache_write", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "cache_creation_input_token_cost_above_1hr", kind: "cache_write_1h", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "output_cost_per_reasoning_token", kind: "reasoning", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "input_cost_per_audio_token", kind: "audio_input", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "output_cost_per_audio_token", kind: "audio_output", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "cache_read_input_audio_token_cost", kind: "audio_cache", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "input_cost_per_image_token", kind: "image_token", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "output_cost_per_image_token", kind: "image_token", tier: "standard", unit: "usd_per_1m_tokens", scale: 1e6 },
  { key: "input_cost_per_image", kind: "image_input", tier: "standard", unit: "usd_per_image", scale: 1 },
  { key: "output_cost_per_image", kind: "image_output", tier: "standard", unit: "usd_per_image", scale: 1 },
  { key: "input_cost_per_video_per_second", kind: "video_input", tier: "standard", unit: "usd_per_second", scale: 1 },
  { key: "input_cost_per_query", kind: "rerank", tier: "standard", unit: "usd_per_request", scale: 1 },
  { key: "ocr_cost_per_page", kind: "ocr", tier: "standard", unit: "usd_per_page", scale: 1 },
  { key: "input_cost_per_request", kind: "request", tier: "standard", unit: "usd_per_request", scale: 1 },
];

function num(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function kindFromMode(mode: string, kind: TokenKind): TokenKind {
  if (mode === "embedding" && kind === "input") return "embedding";
  if (mode === "rerank" && kind === "input") return "rerank";
  if (mode === "ocr" && kind === "input") return "ocr";
  return kind;
}

export async function fetchLiteLLM(): Promise<{
  quotes: TokenQuote[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  try {
    const catalog = await fetchJson<Record<string, LiteModel>>(URL);
    const quotes: TokenQuote[] = [];

    for (const [modelId, row] of Object.entries(catalog)) {
      if (!row || typeof row !== "object" || modelId === "sample_spec") continue;
      const provider = String(row.litellm_provider ?? "unknown");
      const mode = String(row.mode ?? "chat");
      const context = num(row.max_input_tokens) ?? num(row.max_tokens) ?? undefined;

      for (const field of FIELDS) {
        const raw = num(row[field.key]);
        if (raw === null || raw === 0) continue;
        const kind = kindFromMode(mode, field.kind);
        quotes.push({
          id: slug(SOURCE_ID, modelId, field.kind, field.tier, field.key),
          sourceId: SOURCE_ID,
          provider,
          model: modelId,
          modelId,
          modality: mode,
          kind,
          tier: field.tier,
          unit: field.unit,
          usd: raw * field.scale,
          contextLength: context,
          live: true,
          fetchedAt,
        });
      }

      const search = row.search_context_cost_per_query;
      if (search && typeof search === "object") {
        const medium = num((search as Record<string, unknown>).search_context_size_medium);
        if (medium !== null && medium > 0) {
          quotes.push({
            id: slug(SOURCE_ID, modelId, "web_search"),
            sourceId: SOURCE_ID,
            provider,
            model: modelId,
            modelId,
            modality: mode,
            kind: "web_search",
            tier: "standard",
            unit: "usd_per_search",
            usd: medium,
            contextLength: context,
            live: true,
            fetchedAt,
          });
        }
      }
    }

    return {
      quotes,
      source: {
        id: SOURCE_ID,
        name: "LiteLLM price table",
        kind: "live",
        category: "tokens",
        status: quotes.length ? "ok" : "degraded",
        url: URL,
        coverage:
          "Community-maintained provider price table: chat, embeddings, batch/flex/priority, cache, audio, image, OCR, rerank",
        fetchedAt,
        quoteCount: quotes.length,
        notes: "Read from the public LiteLLM model_prices_and_context_window.json on GitHub.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError(SOURCE_ID, message);
  }
}
