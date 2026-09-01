import { Badge } from "@/components/ui/badge";
import type { SourceHealth } from "@/lib/types";

export function SourcePill({ source }: { source: SourceHealth }) {
  const tone =
    source.status === "ok"
      ? "bg-live/15 text-live border-live/30"
      : source.status === "catalog"
        ? "bg-brass/10 text-brass border-brass/30"
        : source.status === "degraded"
          ? "bg-amber-500/10 text-amber-200 border-amber-500/30"
          : "bg-destructive/10 text-destructive border-destructive/30";

  return (
    <Badge variant="outline" className={tone}>
      <span
        className={`size-1.5 rounded-full ${
          source.status === "ok"
            ? "bg-live"
            : source.status === "error"
              ? "bg-destructive"
              : "bg-brass"
        }`}
      />
      {source.name}
    </Badge>
  );
}

export function LiveBadge({ live }: { live: boolean }) {
  return live ? (
    <Badge variant="outline" className="border-live/30 bg-live/10 text-live">
      Live
    </Badge>
  ) : (
    <Badge variant="outline" className="border-brass/30 bg-brass/10 text-brass">
      Catalog
    </Badge>
  );
}
