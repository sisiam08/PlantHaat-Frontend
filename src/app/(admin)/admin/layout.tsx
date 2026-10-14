import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireSession } from "@/server/session";

// Dashboard routes read the session cookie for auth and the locale cookie for
// translations at the page level; opt this segment out of instant-shell
// validation (see next docs on `instant`). Public catalog routes stay validated.
export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSession(["ADMIN"]);
  return <DashboardShell role="admin">{children}</DashboardShell>;
}
