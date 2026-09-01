"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { formatUsd, formatUsdSmart, MARKET_LABEL } from "@/lib/format";
import {
  isFrontier,
  matchAaModel,
  modelRows,
  unique,
  workloadCost,
} from "@/lib/stats";
import type { GpuQuote, OverviewPanel } from "@/lib/types";

const TOK_PER_SEC: Record<string, number> = {
  B200: 280,
  H200: 220,
  H100: 180,
  A100: 90,
  L40S: 70,
  "4090": 55,
};

function guessThroughput(gpu: string): number {
  const hit = Object.entries(TOK_PER_SEC).find(([k]) =>
    gpu.toUpperCase().includes(k.toUpperCase()),
  );
  return hit?.[1] ?? 80;
}

export function CompareView({ data }: { data: OverviewPanel }) {
  const models = useMemo(
    () =>
      modelRows(data.tokens.quotes.filter((q) => q.tier === "standard")).filter(
        (m) => m.prices.input != null && m.prices.output != null,
      ),
    [data.tokens.quotes],
  );

  const gpus = useMemo(
    () =>
      data.gpus.quotes
        .filter((q) => !q.gpu.includes("median"))
        .sort((a, b) => a.usdPerGpuHour - b.usdPerGpuHour),
    [data.gpus.quotes],
  );

  const notable = useMemo(() => {
    const frontier = models.filter((m) => isFrontier(m.modelId));
    const rest = models.filter((m) => !isFrontier(m.modelId));
    return [...frontier, ...rest].slice(0, 400);
  }, [models]);

  const [left, setLeft] = useState(notable[0]?.key ?? "");
  const [right, setRight] = useState(notable[1]?.key ?? notable[0]?.key ?? "");
  const [inputM, setInputM] = useState(2);
  const [outputM, setOutputM] = useState(0.4);
  const [cacheM, setCacheM] = useState(0);
  const [gpuId, setGpuId] = useState(gpus[0]?.id ?? "");
  const [hours, setHours] = useState(1);

  const leftRow = models.find((m) => m.key === left);
  const rightRow = models.find((m) => m.key === right);
  const leftAa = leftRow
    ? matchAaModel(data.analysis.models, leftRow.model, leftRow.modelId)
    : undefined;
  const rightAa = rightRow
    ? matchAaModel(data.analysis.models, rightRow.model, rightRow.modelId)
    : undefined;
  const gpu = gpus.find((g) => g.id === gpuId);

  const leftCost = leftRow
    ? workloadCost(leftRow, inputM, outputM, cacheM)
    : 0;
  const rightCost = rightRow
    ? workloadCost(rightRow, inputM, outputM, cacheM)
    : 0;

  const gpuCost = gpu ? gpu.usdPerGpuHour * hours : 0;
  const tokensOut = gpu ? guessThroughput(gpu.gpu) * 3600 * hours : 0;
  const apiForSameOut = leftRow
    ? workloadCost(leftRow, inputM * (hours > 0 ? hours : 1), tokensOut / 1e6, 0)
    : 0;

  const ranked = useMemo(() => {
    return models
      .map((m) => ({
        ...m,
        cost: workloadCost(m, inputM, outputM, cacheM),
      }))
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 12);
  }, [models, inputM, outputM, cacheM]);

  const gpuPeers = gpu
    ? gpus
        .filter((g) =>
          g.gpu
            .toUpperCase()
            .includes(gpu.gpu.replace(/ \(median\)/, "").split(" ")[0].toUpperCase()),
        )
        .slice(0, 10)
    : [];

  const providers = unique(gpus.map((g) => g.provider));

  return (
    <div>
      <PageHeader
        kicker="Scenario desk"
        title="Tokens against silicon."
        description="Price a prompt workload across models, then see how many generated tokens a rented GPU would need to emit before the API is cheaper. When Artificial Analysis has the model, decode speed and TTFT are their measured medians. GPU-side tokens/sec is still a conservative 70B-class estimate."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="font-heading text-2xl">
              Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Input (M tokens)"
              value={inputM}
              onChange={setInputM}
            />
            <Field
              label="Output (M tokens)"
              value={outputM}
              onChange={setOutputM}
            />
            <Field
              label="Cache read (M)"
              value={cacheM}
              onChange={setCacheM}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="font-heading text-2xl">
              Pair of models
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ModelSelect
              label="Left"
              value={left}
              onChange={setLeft}
              options={notable}
            />
            <ModelSelect
              label="Right"
              value={right}
              onChange={setRight}
              options={notable}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <CostCard
          title={leftRow?.model ?? "Left model"}
          hint={`${leftRow?.provider ?? "—"} · ${leftRow?.sourceId ?? ""}`}
          amount={leftCost}
          input={leftRow?.prices.input}
          output={leftRow?.prices.output}
          intelligence={leftAa?.intelligence}
          tokensPerSec={leftAa?.tokensPerSec}
          ttftSec={leftAa?.ttftSec}
        />
        <CostCard
          title={rightRow?.model ?? "Right model"}
          hint={`${rightRow?.provider ?? "—"} · ${rightRow?.sourceId ?? ""}`}
          amount={rightCost}
          input={rightRow?.prices.input}
          output={rightRow?.prices.output}
          intelligence={rightAa?.intelligence}
          tokensPerSec={rightAa?.tokensPerSec}
          ttftSec={rightAa?.ttftSec}
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="border-b">
          <CardTitle className="font-heading text-2xl">
            Cheapest models for this workload
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Workload</TableHead>
                <TableHead className="text-right">Input / 1M</TableHead>
                <TableHead className="text-right">Output / 1M</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="max-w-[280px] truncate font-medium">
                    {row.model}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.provider}
                  </TableCell>
                  <TableCell className="tabular text-right text-brass">
                    {formatUsd(row.cost)}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {formatUsdSmart(row.prices.input ?? 0, "usd_per_1m_tokens")}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {formatUsdSmart(row.prices.output ?? 0, "usd_per_1m_tokens")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="border-b">
          <CardTitle className="font-heading text-2xl">
            GPU versus the left-hand API
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {providers.length} rental sources on the panel. Decode estimate is
            tokens/sec for a mid-size chat model, not training FLOPs.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                GPU quote
              </label>
              <Select value={gpuId} onValueChange={(v) => setGpuId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a GPU" />
                </SelectTrigger>
                <SelectContent>
                  {gpus.slice(0, 120).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.provider} · {g.gpu} · {formatUsd(g.usdPerGpuHour)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Hours rented" value={hours} onChange={setHours} />
          </div>

          {gpu ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini
                label="Rental"
                value={formatUsd(gpuCost)}
                hint={`${MARKET_LABEL[gpu.market]} · ${gpu.live ? "live" : "catalog"}`}
              />
              <Mini
                label="Est. tokens out"
                value={tokensOut.toLocaleString()}
                hint={`${guessThroughput(gpu.gpu)} tok/s decode`}
              />
              <Mini
                label="Same output via API"
                value={formatUsd(apiForSameOut)}
                hint={leftRow?.model ?? "Select a model"}
              />
            </div>
          ) : null}

          {gpuPeers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nearby quotes</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead className="text-right">$/GPU-hour</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gpuPeers.map((row: GpuQuote) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {row.provider} · {row.gpu}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {MARKET_LABEL[row.market]}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {formatUsd(row.usdPerGpuHour)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <Input
        type="number"
        min={0}
        step="0.1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ModelSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ key: string; model: string; provider: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {options.map((m) => (
            <SelectItem key={m.key} value={m.key}>
              {m.provider} · {m.model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CostCard({
  title,
  hint,
  amount,
  input,
  output,
  intelligence,
  tokensPerSec,
  ttftSec,
}: {
  title: string;
  hint: string;
  amount: number;
  input?: number;
  output?: number;
  intelligence?: number | null;
  tokensPerSec?: number | null;
  ttftSec?: number | null;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {hint}
        </p>
        <p className="mt-2 truncate font-heading text-2xl">{title}</p>
        <p className="mt-3 font-heading text-4xl tabular text-brass">
          {formatUsd(amount)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {input != null
            ? `${formatUsdSmart(input, "usd_per_1m_tokens")} in`
            : "—"}{" "}
          ·{" "}
          {output != null
            ? `${formatUsdSmart(output, "usd_per_1m_tokens")} out`
            : "—"}
        </p>
        {intelligence != null || tokensPerSec != null || ttftSec != null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            AA
            {intelligence != null ? ` · intel ${intelligence.toFixed(1)}` : ""}
            {tokensPerSec != null
              ? ` · ${Math.round(tokensPerSec)} tok/s`
              : ""}
            {ttftSec != null
              ? ` · TTFT ${ttftSec >= 10 ? ttftSec.toFixed(0) : ttftSec.toFixed(1)}s`
              : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Mini({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl tabular">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
