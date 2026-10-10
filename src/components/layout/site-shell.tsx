import type { ReactNode } from "react";

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
      <div id="main" className="flex flex-1 flex-col pb-20 md:pb-0">
        {children}
      </div>
      <SiteFooter />
      <MobileBottomNav />
    </div>
  );
}
