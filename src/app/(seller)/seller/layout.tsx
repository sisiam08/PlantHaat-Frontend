import type { ReactNode } from "react";

export default function SellerLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-1 flex-col bg-background">{children}</div>;
}
