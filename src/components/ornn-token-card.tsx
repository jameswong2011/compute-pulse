"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/trend-chart";
import { ornnTokenChart } from "@/lib/charts";
import { formatUsdSmart } from "@/lib/format";
import type { SeriesPoint } from "@/lib/types";

export function OrnnTokenCard({ points }: { points: SeriesPoint[] }) {
  const chart = ornnTokenChart(points);
  const latest = [...points].reverse()[0];
  const latestBits = latest
    ? Object.entries(latest.values)
        .filter(([, v]) => typeof v === "number")
        .map(
          ([lab, v]) =>
            `${lab} ${formatUsdSmart(v, "usd_per_1m_tokens")}`,
        )
        .join(" · ")
    : null;

  return (
    <Card className="overflow-visible">
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-2xl">
          Token price index · Ornn
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Daily volume-weighted USD per million tokens for the four public
          Ornn labs (Anthropic, OpenAI, Google, DeepSeek). Trailing month,
          Index tier, no key. This is a realized lab blend — not OpenRouter
          volume and not a model list price.
          {latestBits ? (
            <>
              {" "}
              Latest:{" "}
              <span className="text-foreground">{latestBits}</span>
            </>
          ) : null}
        </p>
      </CardHeader>
      <CardContent>
        {chart.data.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            No Ornn token-index rows in this refresh.
          </p>
        ) : (
          <TrendChart
            data={chart.data}
            series={chart.series}
            yFormat={(n) => formatUsdSmart(n, "usd_per_1m_tokens")}
            height={280}
          />
        )}
      </CardContent>
    </Card>
  );
}
