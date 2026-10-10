import type { ReactNode } from "react";

import { AdminNav } from "@/features/admin/components/admin-nav";
import { requireSession } from "@/server/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSession(["ADMIN"]);
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <AdminNav />
      {children}
    </div>
  );
}
