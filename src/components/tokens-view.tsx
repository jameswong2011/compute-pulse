"use client";

import { useMemo, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsumptionStackedCard } from "@/components/consumption-trend-card";
import { OrnnTokenCard } from "@/components/ornn-token-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { LiveBadge } from "@/components/source-pill";
import { mixShare } from "@/lib/charts";
import {
  formatTokens,
  formatUsdSmart,
  TIER_LABEL,
  TOKEN_KIND_LABEL,
  UNIT_LABEL,
} from "@/lib/format";
import { unique } from "@/lib/stats";
import type { PriceTier, TokenKind, TokenPanel, TokenQuote, TrendsPanel } from "@/lib/types";
import { TOKEN_KINDS, PRICE_TIERS } from "@/lib/types";

const PAGE_SIZE = 80;

export function TokensView({
  data,
  trends,
}: {
  data: TokenPanel;
  trends: TrendsPanel;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [tier, setTier] = useState<string>("standard");
  const [provider, setProvider] = useState<string>("all");
  const [sort, setSort] = useState<"usd" | "model">("usd");

  const providers = useMemo(
    () => unique(data.quotes.map((q) => q.provider)).sort(),
    [data.quotes],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.quotes.filter((row) => {
      if (kind !== "all" && row.kind !== kind) return false;
      if (source !== "all" && row.sourceId !== source) return false;
      if (tier !== "all" && row.tier !== tier) return false;
      if (provider !== "all" && row.provider !== provider) return false;
      if (!q) return true;
      return (
        row.model.toLowerCase().includes(q) ||
        row.modelId.toLowerCase().includes(q) ||
        row.provider.toLowerCase().includes(q)
      );
    });
    filtered.sort((a, b) =>
      sort === "model" ? a.model.localeCompare(b.model) : a.usd - b.usd,
    );
    return filtered;
  }, [data.quotes, query, kind, source, tier, provider, sort]);

  const shown = rows.slice(0, PAGE_SIZE);

  return (
    <div>
      <PageHeader
        kicker="Token markets"
        title="What was consumed, then what it costs."
        description="OpenRouter absolute token volume, Vercel AI Gateway share, and the Ornn token price index for four labs. This week's mix is still OpenRouter prompt, completion, and reasoning. The tape below is every billed form: cache, audio, image, embeddings, batch, flex, priority."
      />

      <div className="mb-6">
        <ConsumptionStackedCard
          points={trends.consumption}
          gatewayShare={trends.gatewayShare}
          gatewayLabs={trends.gatewayLabs}
        />
      </div>

      <div className="mb-6">
        <OrnnTokenCard points={trends.ornnTokenPrices} />
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="font-heading text-2xl">
              This week&apos;s mix
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Prompt vs completion vs reasoning tokens.
            </p>
          </CardHeader>
          <CardContent className="px-0">
            {trends.mix.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                Rankings mix did not load this refresh.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Think</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trends.mix.slice(0, 10).map((row) => {
                    const share = mixShare(row);
                    return (
                      <TableRow key={row.modelId}>
                        <TableCell className="max-w-[140px] truncate font-medium">
                          {row.model}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatTokens(share.total)}
                        </TableCell>
                        <TableCell className="tabular text-right text-muted-foreground">
                          {Math.round(share.prompt * 100)}%
                        </TableCell>
                        <TableCell className="tabular text-right text-muted-foreground">
                          {Math.round(share.completion * 100)}%
                        </TableCell>
                        <TableCell className="tabular text-right text-muted-foreground">
                          {Math.round(share.reasoning * 100)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search model, id, or provider"
        />
        <Select value={kind} onValueChange={(v) => setKind(v ?? "all")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Token form" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All token forms</SelectItem>
            {TOKEN_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {TOKEN_KIND_LABEL[k as TokenKind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tier} onValueChange={(v) => setTier(v ?? "all")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {PRICE_TIERS.map((t) => (
              <SelectItem key={t} value={t}>
                {TIER_LABEL[t as PriceTier]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(v) => setSource(v ?? "all")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {data.sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={provider} onValueChange={(v) => setProvider(v ?? "all")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers.slice(0, 80).map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          Showing {shown.length.toLocaleString()} of {rows.length.toLocaleString()}{" "}
          quotes · {data.quotes.length.toLocaleString()} on the tape
        </p>
        <button
          type="button"
          className="underline-offset-4 hover:underline"
          onClick={() => setSort(sort === "usd" ? "model" : "usd")}
        >
          Sort by {sort === "usd" ? "price" : "name"} · click to toggle
        </button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No quotes match."
          body="Broaden the token form, clear the search, or switch the source. Live catalogs sometimes omit a given unit."
        />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((row) => (
                <QuoteRow key={row.id} row={row} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function QuoteRow({ row }: { row: TokenQuote }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px]">
        <div className="truncate font-medium">{row.model}</div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">
          {row.modelId}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{row.provider}</TableCell>
      <TableCell>{TOKEN_KIND_LABEL[row.kind]}</TableCell>
      <TableCell className="text-muted-foreground">
        {TIER_LABEL[row.tier]}
      </TableCell>
      <TableCell className="tabular text-right text-brass">
        {formatUsdSmart(row.usd, row.unit)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {UNIT_LABEL[row.unit]}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{row.sourceId}</span>
          <LiveBadge live={row.live} />
        </div>
      </TableCell>
    </TableRow>
  );
}
