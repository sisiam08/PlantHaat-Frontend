import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";

// The quick-view modal slot (`src/app/@modal`) now lives at the root level so
// intercepted product links open over any segment.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
