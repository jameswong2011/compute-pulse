import { OverviewView } from "@/components/overview-view";
import { loadOverview } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadOverview();
  return <OverviewView data={data} />;
}
