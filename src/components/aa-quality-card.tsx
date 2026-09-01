"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUsdSmart } from "@/lib/format";
import type { AaPanel } from "@/lib/types";

function score(value: number | null): string {
  return value == null ? "—" : value.toFixed(1);
}

function tokS(value: number | null): string {
  return value == null ? "—" : `${Math.round(value)}/s`;
}

function seconds(value: number | null): string {
  if (value == null) return "—";
  return value >= 10 ? `${value.toFixed(0)}s` : `${value.toFixed(1)}s`;
}

export function AaQualityCard({ analysis }: { analysis: AaPanel }) {
  const ranked = [...analysis.models]
    .filter((m) => m.intelligence != null)
    .sort((a, b) => (b.intelligence ?? 0) - (a.intelligence ?? 0))
    .slice(0, 16);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-2xl">
          Quality vs price · Artificial Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Independent Intelligence Index
          {analysis.indexVersion != null ? ` v${analysis.indexVersion}` : ""}{" "}
          against AA&apos;s own input/output list (USD / 1M tokens), plus
          measured decode speed and time-to-first-token. This is not
          consumption and not the OpenRouter tape.
          {ranked[0] ? (
            <>
              {" "}
              Lead:{" "}
              <span className="text-foreground">{ranked[0].name}</span>
              {" · "}
              <span className="text-live">{score(ranked[0].intelligence)}</span>
            </>
          ) : null}
        </p>
      </CardHeader>
      <CardContent className="px-0">
        {ranked.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            {analysis.source.error
              ? analysis.source.error
              : "No Intelligence Index rows in this refresh."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead className="text-right">Intel</TableHead>
                <TableHead className="text-right">Code</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">tok/s</TableHead>
                <TableHead className="text-right">TTFT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[240px] truncate font-medium">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.creator}
                  </TableCell>
                  <TableCell className="tabular text-right text-live">
                    {score(row.intelligence)}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {score(row.coding)}
                  </TableCell>
                  <TableCell className="tabular text-right text-brass">
                    {row.inputUsd != null
                      ? formatUsdSmart(row.inputUsd, "usd_per_1m_tokens")
                      : "—"}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {row.outputUsd != null
                      ? formatUsdSmart(row.outputUsd, "usd_per_1m_tokens")
                      : "—"}
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {tokS(row.tokensPerSec)}
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {seconds(row.ttftSec)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          Source:{" "}
          <a
            href="https://artificialanalysis.ai/"
            className="underline-offset-4 hover:underline"
          >
            Artificial Analysis
          </a>
          . Free API, attribution required.
        </p>
      </CardContent>
    </Card>
  );
}
