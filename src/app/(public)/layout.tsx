import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";

// Keep instant-navigation validation on the public catalog/auth-free routes.
// (Global validation is set to `manual-warning` so auth-gated redirects don't
// surface Next 16.4 false positives.)
export const instant = true;

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
