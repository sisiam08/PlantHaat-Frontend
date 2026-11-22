import { presetBounds } from "@/components/dashboard/range";
import { getAdminPanelsServer } from "../server";
import { AnalyticsStrip, type AnalyticsSection } from "./analytics-strip";

/**
 * Server wrapper that paints the health strip's KPIs/chart from the first HTML
 * response. It falls back to the client query when the prefetch fails, so the
 * page keeps its loading/error states.
 */
export async function AnalyticsStripServer({ section }: { section: AnalyticsSection }) {
  const range = presetBounds("30d");
  const initialPanels = await getAdminPanelsServer(range);
  return (
    <AnalyticsStrip
      section={section}
      initialPanels={initialPanels}
      initialRange={{ ...range, preset: "30d", compare: true }}
    />
  );
}
