"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/trend-chart";
import { gpuCohorts, gpuLaneChart } from "@/lib/charts";
import { formatUsd } from "@/lib/format";
import type { GpuLanePoint } from "@/lib/types";

type GpuSource = "hubbard" | "rental" | "ornn";

const SOURCES: Array<{
  id: GpuSource;
  label: string;
  onDemandLabel: string;
  secureLabel: string;
  fitObserved: boolean;
  indexOnly?: boolean;
}> = [
  {
    id: "hubbard",
    label: "Hubbard listings",
    onDemandLabel: "All listings",
    secureLabel: "Firm",
    fitObserved: false,
  },
  {
    id: "rental",
    label: "GPU Rental Prices",
    onDemandLabel: "On-demand",
    secureLabel: "Secure",
    fitObserved: true,
  },
  {
    id: "ornn",
    label: "Ornn index",
    onDemandLabel: "Index",
    secureLabel: "Index",
    fitObserved: true,
    indexOnly: true,
  },
];

function pickGpu(cohorts: string[], preferred: string): string {
  if (cohorts.includes(preferred)) return preferred;
  if (cohorts.includes("H100")) return "H100";
  return cohorts[0] ?? "H100";
}

export function GpuTrendCard({
  points,
  ledgerPoints = [],
  ornnPoints = [],
}: {
  points: GpuLanePoint[];
  ledgerPoints?: GpuLanePoint[];
  ornnPoints?: GpuLanePoint[];
}) {
  const available = useMemo(
    () =>
      SOURCES.filter((source) => {
        if (source.id === "hubbard") return points.length > 0;
        if (source.id === "rental") return ledgerPoints.length > 0;
        return ornnPoints.length > 0;
      }),
    [points.length, ledgerPoints.length, ornnPoints.length],
  );
  const [sourceId, setSourceId] = useState<GpuSource>(
    available[0]?.id ?? "hubbard",
  );
  const [gpu, setGpu] = useState("H100");
  const activeMeta =
    available.find((s) => s.id === sourceId) ?? available[0] ?? SOURCES[0];
  const activePoints =
    activeMeta.id === "rental"
      ? ledgerPoints
      : activeMeta.id === "ornn"
        ? ornnPoints
        : points;
  const cohorts = useMemo(() => gpuCohorts(activePoints), [activePoints]);
  const selectedGpu = pickGpu(cohorts, gpu);
  const chart = useMemo(
    () =>
      gpuLaneChart(activePoints, selectedGpu, undefined, {
        fitObserved: activeMeta.fitObserved,
        onDemandLabel: activeMeta.onDemandLabel,
        secureLabel: activeMeta.secureLabel,
        indexOnly: activeMeta.indexOnly,
      }),
    [activePoints, selectedGpu, activeMeta],
  );
  const latest = [...chart.data]
    .reverse()
    .find((row) => row.onDemand != null || row.secure != null);

  return (
    <Card className="overflow-visible">
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-2xl">
          {activeMeta.id === "rental"
            ? "GPU price path · GPU Rental Prices"
            : activeMeta.id === "ornn"
              ? "GPU price path · Ornn index"
              : "GPU price path · last 6 months"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {activeMeta.id === "hubbard" ? (
            <>
              Daily median USD per GPU-hour for {selectedGpu} from the Hubbard
              GPU Price Tracker (CC BY 4.0). Tracked SKUs are H100, H200,
              B200, B200+, and A100. Teal is all listings, including spot.
              Brass dashed is firm (non-spot). That ledger has no files from
              10 Mar–6 May 2026, so the line breaks there.
            </>
          ) : activeMeta.id === "ornn" ? (
            <>
              Ornn Compute Price Index for {selectedGpu}: a
              transaction-weighted market rate in USD per GPU-hour (H100 is
              their H100 SXM print; A100 is A100 SXM4). Public Index window
              is the trailing 3 months, daily. This is not a listing median
              and is not mixed with Hubbard or GPU Rental Prices.
            </>
          ) : (
            <>
              Daily median USD per GPU-hour for {selectedGpu} from GPU Rental
              Prices (CC BY 4.0). Same SKU set: H100, H200, B200, B200+, and
              A100. Teal is on-demand. Brass dashed is secure. Public
              snapshots start 5 Jul 2026 and currently end 31 Aug — this is
              a different basket from Hubbard and is not mixed onto that
              line.
            </>
          )}
          {latest ? (
            activeMeta.id === "ornn" ? (
              <>
                {" "}
                Latest:{" "}
                <span className="text-live">
                  {latest.onDemand != null
                    ? formatUsd(Number(latest.onDemand))
                    : "—"}
                </span>
              </>
            ) : (
              <>
                {" "}
                Latest:{" "}
                <span className="text-live">
                  {latest.onDemand != null
                    ? formatUsd(Number(latest.onDemand))
                    : "—"}
                </span>
                {" / "}
                <span className="text-brass">
                  {latest.secure != null
                    ? formatUsd(Number(latest.secure))
                    : "—"}
                </span>
              </>
            )
          ) : null}
        </p>
        {available.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {available.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === activeMeta.id}
                onClick={() => setSourceId(item.id)}
                className={`rounded-md px-2 py-1 text-xs ring-1 transition-colors ${
                  item.id === activeMeta.id
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "text-muted-foreground ring-border hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cohorts.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === selectedGpu}
              onClick={() => setGpu(c)}
              className={`rounded-md px-2 py-1 text-xs ring-1 transition-colors ${
                c === selectedGpu
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
        <TrendChart
          data={chart.data}
          series={chart.series}
          yFormat={(n) => formatUsd(n)}
        />
      </CardContent>
    </Card>
  );
}
