import type { ReactNode } from "react";

import { VerificationBanner } from "@/features/auth/components/verification-banner";
import { SellerNav } from "@/features/seller/components/seller-nav";
import { requireSession } from "@/server/session";

export default async function SellerLayout({ children }: { children: ReactNode }) {
  await requireSession(["SELLER", "ADMIN"]);
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <VerificationBanner />
      <SellerNav />
      {children}
    </div>
  );
}
