import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";
import { VerificationBanner } from "@/features/auth/components/verification-banner";
import { requireSession } from "@/server/session";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return <SiteShell banner={<VerificationBanner />}>{children}</SiteShell>;
}
