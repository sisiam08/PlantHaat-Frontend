import type { ReactNode } from "react";

import { requireSession } from "@/server/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSession(["ADMIN"]);
  return <div className="flex min-h-dvh flex-1 flex-col bg-background">{children}</div>;
}
