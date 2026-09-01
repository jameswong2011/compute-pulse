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
import { EmptyState } from "@/components/empty-state";
import { GpuTrendCard } from "@/components/gpu-trend-card";
import { PageHeader } from "@/components/page-header";
import { LiveBadge } from "@/components/source-pill";
import { splitByLane } from "@/lib/charts";
import { formatUsd, gpuLane, MARKET_LABEL } from "@/lib/format";
import { unique } from "@/lib/stats";
import type { GpuPanel, GpuQuote, TrendsPanel } from "@/lib/types";

export function GpusView({
  data,
  trends,
}: {
  data: GpuPanel;
  trends: TrendsPanel;
}) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [family, setFamily] = useState("all");

  const providers = useMemo(
    () => unique(data.quotes.map((q) => q.provider)).sort(),
    [data.quotes],
  );
  const families = useMemo(
    () => unique(data.quotes.map((q) => q.family)).sort(),
    [data.quotes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.quotes.filter((row) => {
      if (provider !== "all" && row.provider !== provider) return false;
      if (family !== "all" && row.family !== family) return false;
      if (!q) return true;
      return (
        row.gpu.toLowerCase().includes(q) ||
        row.provider.toLowerCase().includes(q) ||
        (row.region ?? "").toLowerCase().includes(q)
      );
    });
  }, [data.quotes, query, provider, family]);

  const { onDemand, secure } = splitByLane(filtered);
  const sortedOn = [...onDemand].sort((a, b) => a.usdPerGpuHour - b.usdPerGpuHour);
  const sortedSecure = [...secure].sort((a, b) => a.usdPerGpuHour - b.usdPerGpuHour);

  return (
    <div>
      <PageHeader
        kicker="GPU rentals"
        title="On-demand and secure, on two rails."
        description="The same SKU, two markets. On-demand is self-serve list, community, and spot. Secure is datacenter isolation and reserved capacity. The path above the tables is six months of daily medians from public listing history."
      />

      <div className="mb-6">
        <GpuTrendCard points={trends.gpuLanes} />
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GPU, provider, region"
        />
        <Select value={provider} onValueChange={(v) => setProvider(v ?? "all")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={family} onValueChange={(v) => setFamily(v ?? "all")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Family" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All families</SelectItem>
            {families.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LaneTable
          title="On-demand"
          hint={`${sortedOn.length} quotes · community, spot, and list`}
          rows={sortedOn}
        />
        <LaneTable
          title="Secure"
          hint={`${sortedSecure.length} quotes · secure cloud and reserved`}
          rows={sortedSecure}
        />
      </div>
    </div>
  );
}

function LaneTable({
  title,
  hint,
  rows,
}: {
  title: string;
  hint: string;
  rows: GpuQuote[];
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-2xl">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              title="No quotes on this rail."
              body="Clear the search or switch family. Secure coverage is thinner than on-demand."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GPU</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Market</TableHead>
                <TableHead className="text-right">$/GPU-hr</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 40).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.gpu}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {row.vramGb ? `${row.vramGb} GB` : row.family}
                    </div>
                  </TableCell>
                  <TableCell>{row.provider}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {MARKET_LABEL[row.market]}
                  </TableCell>
                  <TableCell
                    className={`tabular text-right ${
                      gpuLane(row.market) === "secure" ? "text-brass" : "text-live"
                    }`}
                  >
                    {formatUsd(row.usdPerGpuHour)}
                  </TableCell>
                  <TableCell>
                    <LiveBadge live={row.live} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
