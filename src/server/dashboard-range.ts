import "server-only";

import { connection } from "next/server";

import { presetBounds, type DateRange, type RangePreset } from "@/components/dashboard/range";

/**
 * Resolve a dashboard period at request time. Reading the current clock during
 * prerender trips Next 16 Cache Components ("blocking route: new Date()"), so a
 * dynamic connection is requested first. Client components keep using
 * `presetBounds` directly; this helper is for Server Components only.
 */
export async function resolveDashboardRange(
  preset: Exclude<RangePreset, "custom"> = "30d",
): Promise<DateRange> {
  await connection();
  return presetBounds(preset);
}
