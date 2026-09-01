import { fetchJson, nowIso, SourceError } from "../http";
import type { ConsumptionMix, SeriesPoint, SourceHealth } from "../types";

const CHART_URL =
  "https://openrouter.ai/api/frontend/v1/rankings/model-rankings-chart";
const MIX_URL =
  "https://openrouter.ai/api/frontend/v1/rankings/models?view=week";

interface ChartEnvelope {
  data?: {
    data?: Array<{ x: string; ys?: Record<string, number> }>;
    cachedAt?: number;
  };
}

interface MixRow {
  date?: string;
  model_permaslug?: string;
  variant?: string;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
  total_native_tokens_reasoning?: number;
  count?: number;
}

function weekTotal(point: SeriesPoint): number {
  return Object.values(point.values).reduce((sum, n) => sum + n, 0);
}

/** Drop a trailing week that is still filling in (usually Monday's stub). */
function dropIncompleteWeek(points: SeriesPoint[]): SeriesPoint[] {
  if (points.length < 2) return points;
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const lastTotal = weekTotal(last);
  const prevTotal = weekTotal(prev);
  if (prevTotal > 0 && lastTotal < prevTotal * 0.45) {
    return points.slice(0, -1);
  }
  return points;
}

function shortModel(id: string): string {
  const bare = id.split(":")[0] ?? id;
  const name = bare.includes("/") ? bare.split("/")[1] : bare;
  return name.replace(/-\d{8}$/, "").replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

export async function fetchOpenRouterConsumption(): Promise<{
  consumption: SeriesPoint[];
  mix: ConsumptionMix[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  try {
    const [chart, mixRaw] = await Promise.all([
      fetchJson<ChartEnvelope>(CHART_URL, {
        headers: { accept: "application/json" },
      }),
      fetchJson<{ data?: MixRow[] }>(MIX_URL, {
        headers: { accept: "application/json" },
      }),
    ]);

    const consumption: SeriesPoint[] = dropIncompleteWeek(
      (chart.data?.data ?? []).map((row) => ({
        date: row.x.slice(0, 10),
        values: row.ys ?? {},
      })),
    );

    const mix: ConsumptionMix[] = [];
    for (const row of mixRaw.data ?? []) {
      if (!row.model_permaslug) continue;
      const prompt = Number(row.total_prompt_tokens ?? 0);
      const completion = Number(row.total_completion_tokens ?? 0);
      const reasoning = Number(row.total_native_tokens_reasoning ?? 0);
      if (prompt + completion + reasoning <= 0) continue;
      mix.push({
        model: shortModel(row.model_permaslug),
        modelId: row.model_permaslug,
        window: "week",
        prompt,
        completion,
        reasoning,
        requests: Number(row.count ?? 0),
      });
    }
    mix.sort((a, b) => b.prompt + b.completion - (a.prompt + a.completion));

    return {
      consumption,
      mix: mix.slice(0, 16),
      source: {
        id: "openrouter-rankings",
        name: "OpenRouter rankings",
        kind: "live",
        category: "tokens",
        status: consumption.length ? "ok" : "degraded",
        url: "https://openrouter.ai/rankings",
        coverage:
          "Weekly token volume by model (prompt + completion), week-on-week change, and this week's mix",
        fetchedAt,
        quoteCount: consumption.length + mix.length,
        notes:
          "Source: OpenRouter (openrouter.ai/rankings). Public frontend rankings APIs. Incomplete trailing weeks and stub months are omitted. Tokenizers differ by provider.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError("openrouter-rankings", message);
  }
}
