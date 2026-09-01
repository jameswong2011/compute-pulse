"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/trend-chart";
import { gpuCohorts, gpuLaneChart } from "@/lib/charts";
import { formatUsd } from "@/lib/format";
import type { GpuLanePoint } from "@/lib/types";

export function GpuTrendCard({ points }: { points: GpuLanePoint[] }) {
  const cohorts = useMemo(() => gpuCohorts(points), [points]);
  const [gpu, setGpu] = useState(cohorts.includes("H100") ? "H100" : (cohorts[0] ?? "H100"));
  const chart = useMemo(() => gpuLaneChart(points, gpu), [points, gpu]);
  const latest = chart.data.at(-1);

  return (
    <Card className="overflow-visible">
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-2xl">
          GPU price path · on-demand vs secure
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Daily median USD per GPU-hour for {gpu}. Teal is on-demand
          (including community and spot). Brass dashed is secure-cloud /
          reserved.
          {latest ? (
            <>
              {" "}
              Latest:{" "}
              <span className="text-live">
                {latest.onDemand != null ? formatUsd(Number(latest.onDemand)) : "—"}
              </span>
              {" / "}
              <span className="text-brass">
                {latest.secure != null ? formatUsd(Number(latest.secure)) : "—"}
              </span>
            </>
          ) : null}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cohorts.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === gpu}
              onClick={() => setGpu(c)}
              className={`rounded-md px-2 py-1 text-xs ring-1 transition-colors ${
                c === gpu
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "text-muted-foreground ring-border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <TrendChart data={chart.data} series={chart.series} yFormat={(n) => formatUsd(n)} />
      </CardContent>
    </Card>
  );
}
