import { mondayOfIso } from "../dates";
import { fetchJson, nowIso, SourceError } from "../http";
import type { SeriesPoint, SourceHealth } from "../types";

const EXPORT_URL = "https://vercel.com/api/ai/leaderboard-export";
const EARLIEST = "2025-10-01";
const SOURCE_ID = "vercel-ai-gateway";

interface ExportRow {
  date?: string;
  name?: string;
  metric?: string;
  share_percent?: number;
}

interface ExportEnvelope {
  rows?: ExportRow[];
  from?: string;
  to?: string;
}

function weeklySharePoints(rows: ExportRow[]): SeriesPoint[] {
  const weeks = new Map<string, Map<string, { sum: number; n: number }>>();
  for (const row of rows) {
    if (row.metric !== "tokens" || !row.date || !row.name) continue;
    const share = Number(row.share_percent);
    if (!Number.isFinite(share) || share < 0) continue;
    const week = mondayOfIso(row.date);
    const names = weeks.get(week) ?? new Map();
    const prev = names.get(row.name) ?? { sum: 0, n: 0 };
    names.set(row.name, { sum: prev.sum + share / 100, n: prev.n + 1 });
    weeks.set(week, names);
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, names]) => {
      const values: Record<string, number> = {};
      for (const [name, { sum, n }] of names) {
        values[name] = n > 0 ? sum / n : 0;
      }
      return { date, values };
    });
}

async function exportDataset(dataset: "models" | "labs"): Promise<ExportRow[]> {
  const url = `${EXPORT_URL}?dataset=${dataset}&modality=text&format=json&from=${EARLIEST}`;
  const body = await fetchJson<ExportEnvelope>(url, {
    timeoutMs: 25_000,
    headers: { accept: "application/json" },
  });
  return body.rows ?? [];
}

export async function fetchVercelGatewayConsumption(): Promise<{
  models: SeriesPoint[];
  labs: SeriesPoint[];
  source: SourceHealth;
}> {
  const fetchedAt = nowIso();
  try {
    const [modelRows, labRows] = await Promise.all([
      exportDataset("models"),
      exportDataset("labs"),
    ]);
    const models = weeklySharePoints(modelRows);
    const labs = weeklySharePoints(labRows);
    const quoteCount = models.length + labs.length;

    return {
      models,
      labs,
      source: {
        id: SOURCE_ID,
        name: "Vercel AI Gateway",
        kind: "live",
        category: "tokens",
        status: quoteCount ? "ok" : "degraded",
        url: "https://vercel.com/ai-gateway/leaderboards/models",
        coverage:
          "Weekly-average share of text token volume on AI Gateway, by model and by lab (CC BY 4.0). Shares, not absolute tokens.",
        fetchedAt,
        quoteCount,
        notes:
          "Source: Vercel AI Gateway leaderboards (CC BY 4.0). Public export of anonymized daily share. Absolute volumes are not published. Do not add these shares to OpenRouter token counts — different traffic.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SourceError(SOURCE_ID, message);
  }
}
