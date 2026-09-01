"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/trend-chart";
import { consumptionStackedChart } from "@/lib/charts";
import { formatPercent, formatTokens } from "@/lib/format";
import type { SeriesPoint } from "@/lib/types";

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

export function ConsumptionStackedCard({
  points,
}: {
  points: SeriesPoint[];
}) {
  const chart = consumptionStackedChart(points);
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
          Cumulative token consumption
        </CardTitle>
        <p className="text-sm text-muted-foreground">
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
        </p>
      </CardHeader>
      <CardContent>
        <TrendChart
          variant="stacked-bar"
          data={chart.data}
          series={chart.series}
          overlay={chart.overlay}
          yFormat={formatTokens}
          overlayFormat={formatPercent}
          height={320}
        />
      </CardContent>
    </Card>
  );
}

export function ConsumptionTrendCard({
  points,
}: {
  points: SeriesPoint[];
}) {
  return <ConsumptionStackedCard points={points} />;
}
