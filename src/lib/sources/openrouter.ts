import { fetchJson, nowIso, slug, SourceError } from "../http";
import type { SourceHealth, TokenKind, TokenQuote } from "../types";

const SOURCE_ID = "openrouter";
const URL = "https://openrouter.ai/api/v1/models";

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  architecture?: { modality?: string };
  pricing?: Record<string, string | number | unknown>;
}

const KIND_MAP: Array<{
  key: string;
  kind: TokenKind;
  unit: TokenQuote["unit"];
}> = [
  { key: "prompt", kind: "input", unit: "usd_per_1m_tokens" },
  { key: "completion", kind: "output", unit: "usd_per_1m_tokens" },
  { key: "input_cache_read", kind: "cache_read", unit: "usd_per_1m_tokens" },
  { key: "input_cache_write", kind: "cache_write", unit: "usd_per_1m_tokens" },
  { key: "input_cache_write_1h", kind: "cache_write_1h", unit: "usd_per_1m_tokens" },
  { key: "internal_reasoning", kind: "reasoning", unit: "usd_per_1m_tokens" },
  { key: "audio", kind: "audio_input", unit: "usd_per_1m_tokens" },
  { key: "audio_output", kind: "audio_output", unit: "usd_per_1m_tokens" },
  { key: "input_audio_cache", kind: "audio_cache", unit: "usd_per_1m_tokens" },
  { key: "image", kind: "image_input", unit: "usd_per_image" },
  { key: "image_output", kind: "image_output", unit: "usd_per_image" },
  { key: "image_token", kind: "image_token", unit: "usd_per_1m_tokens" },
  { key: "web_search", kind: "web_search", unit: "usd_per_search" },
  { key: "request", kind: "request", unit: "usd_per_request" },
];

function parseUsd(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function providerFromId(id: string): string {
  const [head] = id.split("/");
  return head || "openrouter";
}

export async function fetchOpenRouter(): Promise<{
  quotes: TokenQuote[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  try {
    const data = await fetchJson<{ data: OpenRouterModel[] }>(URL);
    const quotes: TokenQuote[] = [];

    for (const model of data.data ?? []) {
      if (!model.id) continue;
      const pricing = model.pricing ?? {};
      const provider = providerFromId(model.id);
      const modality = model.architecture?.modality ?? "text->text";

      for (const map of KIND_MAP) {
        const raw = parseUsd(pricing[map.key]);
        if (raw === null || raw === 0) continue;
        const usd =
          map.unit === "usd_per_1m_tokens" ? raw * 1_000_000 : raw;
        quotes.push({
          id: slug(SOURCE_ID, model.id, map.kind),
          sourceId: SOURCE_ID,
          provider,
          model: model.name || model.id,
          modelId: model.id,
          modality,
          kind: map.kind,
          tier: "standard",
          unit: map.unit,
          usd,
          contextLength: model.context_length,
          live: true,
          fetchedAt,
        });
      }
    }

    return {
      quotes,
      source: {
        id: SOURCE_ID,
        name: "OpenRouter",
        kind: "live",
        category: "tokens",
        status: quotes.length ? "ok" : "degraded",
        url: "https://openrouter.ai/api/v1/models",
        coverage: "Public model catalog with input, output, cache, reasoning, audio, image, and search prices",
        fetchedAt,
        quoteCount: quotes.length,
        notes: "Prices are USD as quoted by OpenRouter for the top provider of each model.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError(SOURCE_ID, message);
  }
}
