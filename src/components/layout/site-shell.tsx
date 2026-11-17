import type { ReactNode } from "react";

import { CardActionsLayer } from "@/features/catalog/components/card-actions-layer";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function SiteShell({
  children,
  banner,
}: {
  children: ReactNode;
  banner?: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      {banner}
      <main id="main" className="flex flex-1 flex-col pb-24 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <MobileBottomNav />
      <CardActionsLayer />
    </div>
  );
}
