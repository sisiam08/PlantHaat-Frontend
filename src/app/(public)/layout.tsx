import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";

// The `@modal` parallel slot (quick-view) is disabled via `_modal_off` while
// the Pack roadmap is finished (FRONTEND_CONTEXT §12). Re-add the `modal`
// slot prop together with the slot folder when it returns.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
