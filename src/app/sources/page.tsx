import { SourcesView } from "@/components/sources-view";
import { loadOverview } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const data = await loadOverview();
  return <SourcesView data={data} />;
}
