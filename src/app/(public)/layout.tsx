import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";

export default function PublicLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <SiteShell>
      {children}
      {modal}
    </SiteShell>
  );
}
