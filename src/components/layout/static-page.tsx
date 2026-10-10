import type { ReactNode } from "react";

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
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 md:py-16">
      <header className="grid max-w-3xl gap-3">
        <h1 className="font-heading text-3xl leading-tight font-bold md:text-5xl">{title}</h1>
        {lead ? <p className="text-lg text-muted-foreground">{lead}</p> : null}
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      </header>
      {children}
    </div>
  );
}
