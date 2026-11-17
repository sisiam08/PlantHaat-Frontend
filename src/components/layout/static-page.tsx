import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export function StaticPage({
  title,
  lead,
  meta,
  children,
}: {
  title: string;
  lead?: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <PageContainer width="wide" className="gap-10 py-10 lg:py-16">
      <div className="grid max-w-3xl gap-3">
        <PageHeader title={title} />
        {lead ? <p className="text-lg text-muted-foreground">{lead}</p> : null}
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      {children}
    </PageContainer>
  );
}
