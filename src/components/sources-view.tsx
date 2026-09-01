import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SourcePill } from "@/components/source-pill";
import { formatRelativeTime } from "@/lib/format";
import type { OverviewPanel, SourceHealth } from "@/lib/types";

export function SourcesView({ data }: { data: OverviewPanel }) {
  const sources = [
    ...data.tokens.sources,
    ...data.gpus.sources,
    ...data.trends.sources,
    data.analysis.source,
  ];
  const live = sources.filter((s) => s.kind === "live");
  const catalog = sources.filter((s) => s.kind === "catalog");

  return (
    <div>
      <PageHeader
        kicker="Methodology"
        title="An exhaustive public panel."
        description="The Laniakea AI Research panel only quotes prices and volumes a researcher can retrieve without logging in, or that a vendor publishes as a rate card. Consumption series come from OpenRouter rankings (absolute tokens) and Vercel AI Gateway leaderboards (share of Gateway traffic). Ornn Data adds a public GPU transaction index and a four-lab token price index. Quality and speed come from Artificial Analysis. GPU listing paths stay on Hubbard and GPU Rental Prices."
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Live feeds
            </p>
            <p className="mt-2 font-heading text-3xl">{live.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rankings, Vercel Gateway, LiteLLM, RunPod, Vast, rental, Ornn
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Catalog cards
            </p>
            <p className="mt-2 font-heading text-3xl">{catalog.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hyperscalers and specialist GPU clouds
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Last refresh
            </p>
            <p className="mt-2 font-heading text-3xl">
              {formatRelativeTime(data.fetchedAt)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Server cache, five-minute TTL
            </p>
          </CardContent>
        </Card>
      </div>

      <Section title="Live sources" sources={live} />
      <Section title="Catalog rate cards" sources={catalog} />

      <Card className="mt-6">
        <CardHeader className="border-b">
          <CardTitle className="font-heading text-2xl">
            How to read the tape
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            <span className="text-foreground">Token forms.</span> A quote is one
            billed unit: input, output, cache read, cache write (5-minute and
            1-hour), reasoning, audio in/out/cache, image in/out/token, video,
            embeddings, rerank, OCR, web search, or a per-request surcharge.
            LiteLLM also splits batch, flex, priority, and long-context tiers.
          </p>
          <p>
            <span className="text-foreground">Units.</span> Token prices are
            normalized to USD per million tokens. Image, search, page, and
            request charges keep their native unit so a $0.014 web search is not
            mistaken for a token rate.
          </p>
          <p>
            <span className="text-foreground">Token consumption.</span> OpenRouter
            is the only public feed of absolute prompt and completion tokens
            over time. The stacked bars are that week&apos;s volume, split
            across the largest models, with week-on-week change overlaid. Vercel AI
            Gateway leaderboards (CC BY 4.0) add a second series: weekly-average
            share of Gateway text traffic by model and by lab. Shares are not
            absolute tokens and are not added to OpenRouter counts. Labs do not
            publish public consumption APIs. The mix table is still this
            week&apos;s OpenRouter prompt, completion, and reasoning split.
            Tokenizers differ by provider.
          </p>
          <p>
            <span className="text-foreground">Ornn Data.</span> The public
            Index tier at data.ornn.com needs no key. The GPU path toggle
            labeled Ornn index is their Compute Price Index (OCPI): a
            transaction-weighted USD/GPU-hour for H100 SXM, H200, B200, and
            A100 SXM4 over the trailing 3 months. The token price card is
            OTPI: a volume-weighted USD/million-tokens blend for Anthropic,
            OpenAI, Google, and DeepSeek over the trailing month. Neither
            series is mixed with Hubbard, GPU Rental Prices, or OpenRouter
            volume.
          </p>
          <p>
            <span className="text-foreground">Quality and speed.</span>{" "}
            Artificial Analysis (free language-model API) supplies the
            Intelligence, Coding, and Agentic indices, independent input/output
            list prices, median output tokens/sec, and time-to-first-token.
            Attribution:{" "}
            <a
              href="https://artificialanalysis.ai/"
              className="underline-offset-4 hover:underline"
            >
              artificialanalysis.ai
            </a>
            . This is not token consumption. A key is required; without it the
            desk stays empty, same pattern as Lambda.
          </p>
          <p>
            <span className="text-foreground">GPU hours.</span> Marketplace
            offers are reduced to USD per GPU-hour. The desk splits{" "}
            <span className="text-live">on-demand</span> (list, community, spot)
            from <span className="text-brass">secure</span> (secure-cloud and
            reserved). The GPU path card toggles three charts and only tracks
            H100, H200, B200, B200+, and A100 on listing ledgers. Hubbard GPU
            Price Tracker (CC BY 4.0) is the six-month listing median; that
            dataset has no files from 10 Mar–6 May 2026. GPU Rental Prices
            (CC BY 4.0) is its own on-demand vs secure path from the public
            snapshot window (currently 5 Jul–31 Aug 2026). Ornn OCPI is a
            third, transaction-weighted index over the trailing 3 months.
            Live quotes use the rental ledger. The three baskets are never
            mixed on one line.
          </p>
          <p>
            <span className="text-foreground">Catalog versus live.</span> Brass
            figures are copied from public vendor pages and dated. They are not
            capacity. Teal figures are asks or API list prices retrieved on this
            refresh. Lambda&apos;s instance-types API requires a key, so Lambda
            stays on the catalog until a key is provided.
          </p>
          <p>
            <span className="text-foreground">Not covered.</span> Private RFQs,
            committed-use discounts, and egress are out of scope. So are
            unpublished training-cluster deals. If a source disappears, the
            panel marks it error and keeps every other feed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  sources,
}: {
  title: string;
  sources: SourceHealth[];
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Quotes</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Fetched</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.id}>
                <TableCell>
                  <div className="font-medium">{source.name}</div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {source.url.replace(/^https?:\/\//, "").slice(0, 48)}
                  </a>
                </TableCell>
                <TableCell>
                  <SourcePill source={source} />
                  {source.error ? (
                    <p className="mt-1 text-[11px] text-destructive">
                      {source.error}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="tabular text-right">
                  {source.quoteCount.toLocaleString()}
                </TableCell>
                <TableCell className="max-w-[360px] text-muted-foreground">
                  {source.coverage}
                  <div className="mt-1 text-[11px]">{source.notes}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeTime(source.fetchedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
