import { fetchJson, nowIso, SourceError } from "../http";
import type { AaModel, AaPanel, SourceHealth } from "../types";

const FREE_URL = "https://artificialanalysis.ai/api/v2/language/models/free";
const SOURCE_ID = "artificial-analysis";
const SOURCE_URL = "https://artificialanalysis.ai/";
/** Free-tier key, also committed in `.env` so Vercel production can load the desk. */
const COMMITTED_FREE_KEY = "aa_HiypCYSxpiwsjfWPxSRdUDhzOIZiWRae";

interface AaCreator {
  name?: string;
}

interface AaEvals {
  artificial_analysis_intelligence_index?: number | null;
  artificial_analysis_coding_index?: number | null;
  artificial_analysis_agentic_index?: number | null;
}

interface AaPricing {
  price_1m_input_tokens?: number | null;
  price_1m_output_tokens?: number | null;
  price_1m_cache_hit_tokens?: number | null;
}

interface AaPerformance {
  median_output_tokens_per_second?: number | null;
  median_time_to_first_token_seconds?: number | null;
}

interface AaEvalCost {
  total_cost?: number | null;
}

interface AaRow {
  id?: string;
  name?: string;
  slug?: string;
  release_date?: string | null;
  model_creator?: AaCreator;
  evaluations?: AaEvals;
  pricing?: AaPricing;
  performance?: AaPerformance;
  artificial_analysis_intelligence_index_cost?: AaEvalCost | null;
}

interface AaPage {
  tier?: string;
  intelligence_index_version?: number;
  pagination?: {
    page?: number;
    total_pages?: number;
    has_more?: boolean;
  };
  data?: AaRow[];
}

function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapRow(row: AaRow): AaModel | null {
  if (!row.id || !row.name || !row.slug) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    creator: row.model_creator?.name ?? "—",
    intelligence: num(row.evaluations?.artificial_analysis_intelligence_index),
    coding: num(row.evaluations?.artificial_analysis_coding_index),
    agentic: num(row.evaluations?.artificial_analysis_agentic_index),
    inputUsd: num(row.pricing?.price_1m_input_tokens),
    outputUsd: num(row.pricing?.price_1m_output_tokens),
    cacheReadUsd: num(row.pricing?.price_1m_cache_hit_tokens),
    tokensPerSec: num(row.performance?.median_output_tokens_per_second),
    ttftSec: num(row.performance?.median_time_to_first_token_seconds),
    evalCostUsd: num(row.artificial_analysis_intelligence_index_cost?.total_cost),
    releaseDate: row.release_date ?? null,
  };
}

function catalogSource(notes: string): SourceHealth {
  return {
    id: SOURCE_ID,
    name: "Artificial Analysis",
    kind: "catalog",
    category: "tokens",
    status: "catalog",
    url: SOURCE_URL,
    coverage: "Intelligence, coding, and speed indices plus independent list prices",
    fetchedAt: null,
    quoteCount: 0,
    notes,
  };
}

export async function fetchArtificialAnalysis(): Promise<AaPanel> {
  const key =
    process.env.ARTIFICIAL_ANALYSIS_API_KEY?.trim() || COMMITTED_FREE_KEY;
  if (!key) {
    return {
      models: [],
      indexVersion: null,
      source: catalogSource(
        "Set ARTIFICIAL_ANALYSIS_API_KEY to load the free language-model desk. Attribution: artificialanalysis.ai.",
      ),
    };
  }

  const fetchedAt = nowIso();
  try {
    const first = await fetchJson<AaPage>(`${FREE_URL}?page=1`, {
      timeoutMs: 20_000,
      headers: { accept: "application/json", "x-api-key": key },
    });
    const pages = Math.max(1, first.pagination?.total_pages ?? 1);
    const rest =
      pages > 1
        ? await Promise.all(
            Array.from({ length: pages - 1 }, (_, i) =>
              fetchJson<AaPage>(`${FREE_URL}?page=${i + 2}`, {
                timeoutMs: 20_000,
                headers: { accept: "application/json", "x-api-key": key },
              }),
            ),
          )
        : [];

    const models: AaModel[] = [];
    for (const page of [first, ...rest]) {
      for (const row of page.data ?? []) {
        const mapped = mapRow(row);
        if (mapped) models.push(mapped);
      }
    }

    return {
      models,
      indexVersion: first.intelligence_index_version ?? null,
      source: {
        id: SOURCE_ID,
        name: "Artificial Analysis",
        kind: "live",
        category: "tokens",
        status: models.length ? "ok" : "degraded",
        url: SOURCE_URL,
        coverage:
          "Free-tier Intelligence, Coding, and Agentic indices, input/output list prices, median tok/s and TTFT",
        fetchedAt,
        quoteCount: models.length,
        notes:
          "Source: Artificial Analysis (artificialanalysis.ai). Free API, attribution required. Not token consumption. Prices are AA’s tape, not a live marketplace ask.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError(SOURCE_ID, message);
  }
}
