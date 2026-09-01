import { TokensView } from "@/components/tokens-view";
import { loadTokenPanel, loadTrends } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const [data, trends] = await Promise.all([loadTokenPanel(), loadTrends()]);
  return <TokensView data={data} trends={trends} />;
}
