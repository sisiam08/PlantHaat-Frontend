import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";
import { VerificationBanner } from "@/features/auth/components/verification-banner";
import { requireSession } from "@/server/session";

// Customer pages read the session cookie for auth and the locale cookie for
// translations at the page level; opt this segment out of instant-shell
// validation (see next docs on `instant`). Public catalog routes stay validated.
export const instant = false;

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return <SiteShell banner={<VerificationBanner />}>{children}</SiteShell>;
}
