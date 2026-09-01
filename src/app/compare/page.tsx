import { CompareView } from "@/components/compare-view";
import { loadOverview } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const data = await loadOverview();
  return <CompareView data={data} />;
}
