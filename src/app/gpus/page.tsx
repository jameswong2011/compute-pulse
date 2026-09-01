import { GpusView } from "@/components/gpus-view";
import { loadGpuPanel, loadTrends } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function GpusPage() {
  const [data, trends] = await Promise.all([loadGpuPanel(), loadTrends()]);
  return <GpusView data={data} trends={trends} />;
}
