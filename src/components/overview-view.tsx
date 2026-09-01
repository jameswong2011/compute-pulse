import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConsumptionStackedCard } from "@/components/consumption-trend-card";
import { AaQualityCard } from "@/components/aa-quality-card";
import { GpuTrendCard } from "@/components/gpu-trend-card";
import { OrnnTokenCard } from "@/components/ornn-token-card";
import { PageHeader } from "@/components/page-header";
import { SourcePill } from "@/components/source-pill";
import {
  formatUsd,
  formatUsdSmart,
  TOKEN_KIND_LABEL,
} from "@/lib/format";
import { splitByLane } from "@/lib/charts";
import {
  gpuMatrix,
  isFrontier,
  kindCoverage,
  modelRows,
} from "@/lib/stats";
import type { OverviewPanel } from "@/lib/types";

const MATRIX_GPUS = ["H100", "H200", "B200", "B200+", "A100"];
const MATRIX_PROVIDERS = [
  "RunPod",
  "Vast.ai",
  "Lambda",
  "AWS",
  "GCP",
  "CoreWeave",
  "Crusoe",
  "Nebius",
];

export function OverviewView({ data }: { data: OverviewPanel }) {
  const tokenQuotes = data.tokens.quotes;
  const gpuQuotes = data.gpus.quotes;
  const models = modelRows(
    tokenQuotes.filter((q) => q.tier === "standard"),
  );
  const frontier = models
    .filter((m) => isFrontier(m.modelId) && m.prices.input && m.prices.output)
    .sort((a, b) => (a.prices.input ?? 99) - (b.prices.input ?? 99))
    .slice(0, 10);

  const coverage = kindCoverage(tokenQuotes);
  const liveSources = [...data.tokens.sources, ...data.gpus.sources].filter(
    (s) => s.status === "ok",
  ).length;
  const catalogSources = [...data.tokens.sources, ...data.gpus.sources].filter(
    (s) => s.kind === "catalog",
  ).length;
  const cells = gpuMatrix(gpuQuotes, MATRIX_GPUS, MATRIX_PROVIDERS);

  const cheapestGpu = [...gpuQuotes]
    .filter((q) => /H100/i.test(q.gpu) && !q.gpu.includes("median"))
    .sort((a, b) => a.usdPerGpuHour - b.usdPerGpuHour)[0];
  const lanes = splitByLane(gpuQuotes);
  const h100 = data.trends.gpuLanes.filter((p) => p.gpu === "H100");
  const latestH100 = h100.at(-1);

  return (
    <div>
      <PageHeader
        kicker="Public markets · observed over time"
        title="Consumption and rental paths, not just the print."
        description="The Laniakea AI Research panel tracks the running pile of tokens consumed on OpenRouter, share of Vercel AI Gateway traffic, Ornn's public GPU and token-price indices, Artificial Analysis quality and speed, and how GPU rentals move when you split on-demand from secure capacity. Spot quotes are still on the tape."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ...data.tokens.sources,
          ...data.gpus.sources,
          ...data.trends.sources,
          data.analysis.source,
        ]
          .filter((s) => s.kind === "live" || s.quoteCount > 0)
          .slice(0, 14)
          .map((source) => (
            <SourcePill key={source.id} source={source} />
          ))}
        <Link
          href="/sources"
          className="self-center text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Full source panel
        </Link>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Token quotes"
          value={tokenQuotes.length.toLocaleString()}
          hint={`${models.length.toLocaleString()} model-tier rows`}
        />
        <Stat
          label="GPU quotes"
          value={gpuQuotes.length.toLocaleString()}
          hint={`${new Set(gpuQuotes.map((g) => g.provider)).size} providers`}
        />
        <Stat
          label="Live sources"
          value={String(liveSources)}
          hint={`${catalogSources} catalog rate cards`}
        />
        <Stat
          label="H100 on-demand / secure"
          value={
            latestH100
              ? `${latestH100.onDemand != null ? formatUsd(latestH100.onDemand) : "—"} / ${latestH100.secure != null ? formatUsd(latestH100.secure) : "—"}`
              : cheapestGpu
                ? formatUsd(cheapestGpu.usdPerGpuHour)
                : "—"
          }
          hint={`${lanes.onDemand.length.toLocaleString()} on-demand · ${lanes.secure.length.toLocaleString()} secure quotes`}
        />
      </div>

      <div className="mb-8">
        <ConsumptionStackedCard
          points={data.trends.consumption}
          gatewayShare={data.trends.gatewayShare}
          gatewayLabs={data.trends.gatewayLabs}
        />
      </div>

      <div className="mb-8">
        <GpuTrendCard
          points={data.trends.gpuLanes}
          ledgerPoints={data.trends.gpuLedgerLanes}
          ornnPoints={data.trends.ornnGpuLanes}
        />
      </div>

      <div className="mb-8">
        <OrnnTokenCard points={data.trends.ornnTokenPrices} />
      </div>

      <div className="mb-8">
        <AaQualityCard analysis={data.analysis} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="border-b">
            <CardTitle className="font-heading text-2xl">
              Frontier token desk
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Standard-tier input and output, USD per million tokens. Cache and
              reasoning appear when the source publishes them.
            </p>
          </CardHeader>
          <CardContent className="px-0">
            {frontier.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                No frontier quotes in this refresh. Open the Tokens desk to
                inspect the full tape.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">Cache</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frontier.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {row.model}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.provider}
                      </TableCell>
                      <TableCell className="tabular text-right text-brass">
                        {row.prices.input != null
                          ? formatUsdSmart(row.prices.input, "usd_per_1m_tokens")
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular text-right">
                        {row.prices.output != null
                          ? formatUsdSmart(row.prices.output, "usd_per_1m_tokens")
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular text-right text-muted-foreground">
                        {row.prices.cache_read != null
                          ? formatUsdSmart(
                              row.prices.cache_read,
                              "usd_per_1m_tokens",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.sourceId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="font-heading text-2xl">
              Token forms observed
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              How many quotes exist for each billed unit of usage.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {coverage.slice(0, 12).map((row) => (
              <div
                key={row.kind}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{TOKEN_KIND_LABEL[row.kind]}</span>
                <span className="tabular text-muted-foreground">
                  {row.count.toLocaleString()}
                </span>
              </div>
            ))}
            <Link
              href="/tokens"
              className="inline-block pt-2 text-sm text-brass underline-offset-4 hover:underline"
            >
              Open the token tape
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="border-b">
          <CardTitle className="font-heading text-2xl">
            GPU rental cross-section
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Lowest observed USD per GPU-hour for each provider × SKU. Live
            marketplace floors sit next to hyperscaler list prices.
          </p>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                {MATRIX_GPUS.map((gpu) => (
                  <TableHead key={gpu} className="text-right">
                    {gpu}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MATRIX_PROVIDERS.map((provider) => (
                <TableRow key={provider}>
                  <TableCell className="font-medium">{provider}</TableCell>
                  {MATRIX_GPUS.map((gpu) => {
                    const cell = cells[`${provider}::${gpu}`];
                    return (
                      <TableCell key={gpu} className="tabular text-right">
                        {cell ? (
                          <span
                            className={cell.live ? "text-live" : "text-brass"}
                          >
                            {formatUsd(cell.usdPerGpuHour)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            Teal is a live ask. Brass is a published list price.{" "}
            <Link href="/gpus" className="underline-offset-4 hover:underline">
              Full GPU tape
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 font-heading text-3xl tabular">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
