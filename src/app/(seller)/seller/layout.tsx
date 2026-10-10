import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { VerificationBanner } from "@/features/auth/components/verification-banner";
import { requireSession } from "@/server/session";

export default async function SellerLayout({ children }: { children: ReactNode }) {
  await requireSession(["SELLER", "ADMIN"]);
  return (
    <DashboardShell role="seller" banner={<VerificationBanner />}>
      {children}
    </DashboardShell>
  );
}
