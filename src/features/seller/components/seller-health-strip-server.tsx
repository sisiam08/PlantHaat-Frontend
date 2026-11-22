import { presetBounds } from "@/components/dashboard/range";
import { getSellerPanelsServer } from "../server";
import { SellerHealthStrip, type SellerHealthSection } from "./seller-health-strip";

/** Server wrapper: paints the seller health strip's KPIs from the first HTML response. */
export async function SellerHealthStripServer({ section }: { section: SellerHealthSection }) {
  const range = presetBounds("30d");
  const initialPanels = await getSellerPanelsServer(range);
  return (
    <SellerHealthStrip
      section={section}
      initialPanels={initialPanels}
      initialRange={{ ...range, preset: "30d", compare: true }}
    />
  );
}
