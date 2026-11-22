import "server-only";

import { serverGet } from "@/server/backend";
import { readAuthCookies } from "@/server/cookies";
import { resolveDashboardRange } from "@/server/dashboard-range";
import type { DateRange } from "@/components/dashboard/range";
import type { AdminComplaintView, AdminPanels } from "./types";

async function token(): Promise<string | undefined> {
  return (await readAuthCookies()).accessToken;
}

/**
 * Server first paint for the admin dashboard/health strips. Returns `undefined`
 * on any failure so the client query still owns loading/error states; this is a
 * paint optimisation, never a second source of truth.
 */
export async function getAdminPanelsServer(
  range?: DateRange,
): Promise<AdminPanels | undefined> {
  const resolved = range ?? (await resolveDashboardRange("30d"));
  const accessToken = await token();
  if (!accessToken) return undefined;
  const params = new URLSearchParams({ from: resolved.from, to: resolved.to });
  try {
    const result = await serverGet<AdminPanels>(`/admin/analytics/panels?${params.toString()}`, {
      token: accessToken,
    });
    return result.data;
  } catch {
    return undefined;
  }
}

export async function getAdminComplaintsServer(params: {
  status?: string;
  page: number;
  limit: number;
}): Promise<{ data: AdminComplaintView[]; meta?: unknown } | undefined> {
  const accessToken = await token();
  if (!accessToken) return undefined;
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  try {
    const result = await serverGet<AdminComplaintView[]>(`/admin/complaints?${query.toString()}`, {
      token: accessToken,
    });
    return { data: result.data, meta: result.meta };
  } catch {
    return undefined;
  }
}
