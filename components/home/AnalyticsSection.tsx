import { AnalyticsView } from "@/components/home/AnalyticsView";
import { getAnalytics } from "@/lib/dune";

export async function AnalyticsSection() {
  const data = await getAnalytics();
  return <AnalyticsView data={data} />;
}
