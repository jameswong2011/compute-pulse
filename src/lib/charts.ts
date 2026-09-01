import { gpuPathWindow, observedGpuWindow } from "./dates";
import { gpuLane } from "./format";
import { PATH_GPUS } from "./lanes";
import type {
  ConsumptionMix,
  GpuLanePoint,
  GpuQuote,
  SeriesPoint,
} from "./types";

const COLORS = [
  "#e0b15a",
  "#3dceb0",
  "#7eb0e8",
  "#e89b4a",
  "#c88bb5",
  "#8fd18a",
  "#d97b7b",
  "#9b8cff",
  "#6ec9d4",
  "#e6c07b",
  "#b07c5a",
  "#7aa2c4",
  "#a89a86",
];

const MODEL_LIMIT = 12;
const WOW_KEY = "wow";
const WOW_COLOR = "#f4efe4";

function shortName(id: string): string {
  const bare = id.split(":")[0] ?? id;
  const name = bare.includes("/") ? (bare.split("/")[1] ?? bare) : bare;
  return name.replace(/-\d{8}$/, "").replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

function seriesLabels(keys: string[]): string[] {
  const raw = keys.map((key) => (key === "Others" ? "Others" : shortName(key)));
  const counts = new Map<string, number>();
  for (const label of raw) counts.set(label, (counts.get(label) ?? 0) + 1);
  return keys.map((key, i) => {
    const label = raw[i];
    if ((counts.get(label) ?? 0) < 2 || key === "Others") return label;
    const stamp = key.match(/(\d{4}-\d{2}-\d{2}|\d{8})/)?.[1]?.replace(/-/g, "");
    if (!stamp || stamp.length < 8) return `${label} · ${i + 1}`;
    return `${label} · ${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
  });
}

export function weekTotal(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, n) => sum + n, 0);
}

function rankedKeys(points: SeriesPoint[], limit = MODEL_LIMIT): string[] {
  const recent = points.slice(-12);
  const totals = new Map<string, number>();
  for (const point of recent) {
    for (const [key, value] of Object.entries(point.values)) {
      if (key.toLowerCase() === "others") continue;
      totals.set(key, (totals.get(key) ?? 0) + value);
    }
  }
  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
  return [...top, "Others"];
}

function weekByKeys(
  point: SeriesPoint,
  keys: string[],
): Record<string, number> {
  const named = new Set(keys.filter((k) => k !== "Others"));
  const row: Record<string, number> = { Others: 0 };
  for (const key of named) row[key] = 0;
  for (const [key, value] of Object.entries(point.values)) {
    if (named.has(key)) row[key] = (row[key] ?? 0) + value;
    else row.Others += value;
  }
  return row;
}

/** Running total of every token, stacked by model, plus week-on-week flow change. */
export function consumptionStackedChart(points: SeriesPoint[]) {
  const keys = rankedKeys(points);
  const othersIndex = keys.length - 1;
  const acc: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  const flows = points.map((point) => weekTotal(point.values));
  const data = points.map((point, i) => {
    const flow = weekByKeys(point, keys);
    for (const key of keys) acc[key] += flow[key] ?? 0;
    const prev = i > 0 ? flows[i - 1] : 0;
    const wow = prev > 0 ? (flows[i] - prev) / prev : null;
    const row: Record<string, string | number | null> = {
      date: point.date.slice(5),
      [WOW_KEY]: wow,
    };
    for (const key of keys) row[key] = acc[key];
    return row;
  });
  const labels = seriesLabels(keys);
  const series = keys.map((key, i) => ({
    key,
    label: labels[i],
    color: i === othersIndex ? COLORS[COLORS.length - 1] : COLORS[i % (COLORS.length - 1)],
  }));
  const overlay = [
    {
      key: WOW_KEY,
      label: "Week on week",
      color: WOW_COLOR,
      fill: false,
    },
  ];
  return { data, series, overlay };
}

export function consumptionChart(points: SeriesPoint[]) {
  return consumptionStackedChart(points);
}

/** Stacked share of a window (0–1), not a running total. */
export function shareStackedChart(points: SeriesPoint[]) {
  const keys = rankedKeys(points);
  const othersIndex = keys.length - 1;
  const data = points.map((point) => {
    const flow = weekByKeys(point, keys);
    const row: Record<string, string | number | null> = {
      date: point.date.slice(5),
    };
    for (const key of keys) row[key] = flow[key] ?? 0;
    return row;
  });
  const labels = seriesLabels(keys);
  const series = keys.map((key, i) => ({
    key,
    label: labels[i],
    color: i === othersIndex ? COLORS[COLORS.length - 1] : COLORS[i % (COLORS.length - 1)],
  }));
  return { data, series, overlay: [] };
}

export function ornnTokenChart(points: SeriesPoint[]) {
  const keys = ["anthropic", "openai", "google", "deepseek"];
  const labels = ["Anthropic", "OpenAI", "Google", "DeepSeek"];
  const data = points.map((point) => {
    const row: Record<string, string | number | null> = {
      date: point.date.slice(5),
    };
    for (const key of keys) row[key] = point.values[key] ?? null;
    return row;
  });
  const series = keys.map((key, i) => ({
    key,
    label: labels[i],
    color: COLORS[i % COLORS.length],
  }));
  return { data, series };
}

export function gpuLaneChart(
  points: GpuLanePoint[],
  gpu: string,
  now?: Date,
  options?: {
    fitObserved?: boolean;
    onDemandLabel?: string;
    secureLabel?: string;
    indexOnly?: boolean;
  },
) {
  const scoped = points.filter((p) => p.gpu === gpu);
  const window = options?.fitObserved
    ? observedGpuWindow(scoped, now)
    : gpuPathWindow(now);
  const byDate = new Map(
    scoped.filter((p) => p.date >= window.start).map((p) => [p.date, p]),
  );
  const data = window.dates.map((date) => {
    const row = byDate.get(date);
    return {
      date: date.slice(5),
      onDemand: row?.onDemand ?? null,
      secure: row?.secure ?? null,
    };
  });
  const series: Array<{
    key: string;
    label: string;
    color: string;
    dashed?: boolean;
  }> = [
    {
      key: "onDemand",
      label: options?.onDemandLabel ?? "On-demand",
      color: "#3dceb0",
    },
  ];
  if (!options?.indexOnly) {
    series.push({
      key: "secure",
      label: options?.secureLabel ?? "Secure",
      color: "#e0b15a",
      dashed: true,
    });
  }
  return { data, series };
}

export function gpuCohorts(points: GpuLanePoint[], now?: Date): string[] {
  const { start } = gpuPathWindow(now);
  const present = new Set(
    points.filter((p) => p.date >= start).map((p) => p.gpu),
  );
  return PATH_GPUS.filter((gpu) => present.has(gpu));
}

export function splitByLane(quotes: GpuQuote[]) {
  const onDemand = quotes.filter((q) => gpuLane(q.market) === "on_demand");
  const secure = quotes.filter((q) => gpuLane(q.market) === "secure");
  return { onDemand, secure };
}

export function mixShare(row: ConsumptionMix) {
  const total = row.prompt + row.completion + row.reasoning;
  if (total <= 0) return { prompt: 0, completion: 0, reasoning: 0, total: 0 };
  return {
    prompt: row.prompt / total,
    completion: row.completion / total,
    reasoning: row.reasoning / total,
    total,
  };
}
