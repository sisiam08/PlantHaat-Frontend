import type { ReactNode } from "react";

import { VerificationBanner } from "@/features/auth/components/verification-banner";
import { requireSession } from "@/server/session";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <VerificationBanner />
      {children}
    </div>
  );
}
