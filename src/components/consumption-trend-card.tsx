"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/trend-chart";
import { consumptionStackedChart, shareStackedChart } from "@/lib/charts";
import { formatPercent, formatShare, formatTokens } from "@/lib/format";
import type { SeriesPoint } from "@/lib/types";

type View = "openrouter" | "vercel-models" | "vercel-labs";

function latestTotal(
  data: Array<Record<string, string | number | null>>,
  keys: string[],
): number | null {
  const row = data.at(-1);
  if (!row) return null;
  return keys.reduce((sum, key) => {
    const v = row[key];
    return sum + (typeof v === "number" && Number.isFinite(v) ? v : 0);
  }, 0);
}

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "openrouter", label: "OpenRouter volume" },
  { id: "vercel-models", label: "Vercel models" },
  { id: "vercel-labs", label: "Vercel labs" },
];

export function ConsumptionStackedCard({
  points,
  gatewayShare = [],
  gatewayLabs = [],
}: {
  points: SeriesPoint[];
  gatewayShare?: SeriesPoint[];
  gatewayLabs?: SeriesPoint[];
}) {
  const available = useMemo(
    () =>
      VIEWS.filter((view) => {
        if (view.id === "openrouter") return points.length > 0;
        if (view.id === "vercel-models") return gatewayShare.length > 0;
        return gatewayLabs.length > 0;
      }),
    [points.length, gatewayShare.length, gatewayLabs.length],
  );
  const [view, setView] = useState<View>(available[0]?.id ?? "openrouter");
  const active = available.some((v) => v.id === view) ? view : (available[0]?.id ?? "openrouter");
  const isShare = active !== "openrouter";
  const seriesPoints =
    active === "vercel-labs"
      ? gatewayLabs
      : active === "vercel-models"
        ? gatewayShare
        : points;
  const chart = isShare
    ? shareStackedChart(seriesPoints)
    : consumptionStackedChart(seriesPoints);
  const total = latestTotal(
    chart.data,
    chart.series.map((s) => s.key),
  );
  const lastWow = chart.data.at(-1)?.wow;
  const wow = typeof lastWow === "number" ? lastWow : null;

  return (
    <Card className="overflow-visible">
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-2xl">
          {isShare
            ? "Token share · Vercel AI Gateway"
            : "Cumulative token consumption"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {active === "openrouter" ? (
            <>
              Running total of every prompt and completion token on OpenRouter,
              stacked across the largest models. The cream line is week-on-week
              change in that week&apos;s volume (right axis). The current
              incomplete week is held back.
              {total != null ? (
                <>
                  {" "}
                  Through the last complete week:{" "}
                  <span className="text-foreground">{formatTokens(total)}</span>
                  {wow != null ? (
                    <>
                      {", "}
                      <span className={wow >= 0 ? "text-live" : "text-destructive"}>
                        {formatPercent(wow)}
                      </span>{" "}
                      week on week
                    </>
                  ) : null}
                  .
                </>
              ) : null}{" "}
              Source: OpenRouter rankings.
            </>
          ) : (
            <>
              Weekly-average share of text token volume routed through Vercel AI
              Gateway, stacked by {active === "vercel-labs" ? "lab" : "model"}.
              These are shares of Gateway traffic, not absolute tokens — they
              cannot be added to OpenRouter counts.
              {total != null ? (
                <>
                  {" "}
                  Latest week accounted:{" "}
                  <span className="text-foreground">{formatShare(total)}</span>.
                </>
              ) : null}{" "}
              Source: Vercel AI Gateway leaderboards, CC BY 4.0.
            </>
          )}
        </p>
        {available.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {available.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === active}
                onClick={() => setView(item.id)}
                className={`rounded-md px-2 py-1 text-xs ring-1 transition-colors ${
                  item.id === active
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "text-muted-foreground ring-border hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <TrendChart
          variant="stacked-bar"
          data={chart.data}
          series={chart.series}
          overlay={chart.overlay}
          yFormat={isShare ? formatShare : formatTokens}
          overlayFormat={formatPercent}
          height={320}
        />
      </CardContent>
    </Card>
  );
}

export function ConsumptionTrendCard({
  points,
  gatewayShare,
  gatewayLabs,
}: {
  points: SeriesPoint[];
  gatewayShare?: SeriesPoint[];
  gatewayLabs?: SeriesPoint[];
}) {
  return (
    <ConsumptionStackedCard
      points={points}
      gatewayShare={gatewayShare}
      gatewayLabs={gatewayLabs}
    />
  );
}
