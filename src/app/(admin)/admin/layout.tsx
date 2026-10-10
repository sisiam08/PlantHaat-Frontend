import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireSession } from "@/server/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSession(["ADMIN"]);
  return <DashboardShell role="admin">{children}</DashboardShell>;
}
