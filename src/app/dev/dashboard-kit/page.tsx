import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DashboardKitPreview } from "./preview-client";

export const metadata: Metadata = {
  title: "Dashboard kit preview",
  robots: { index: false, follow: false },
};

/**
 * Development/test-only preview for the shared dashboard primitives. The route
 * is compiled but never served in production: it returns 404 and is disallowed
 * in robots.txt, so no public bundle imports the kit.
 */
export default function DashboardKitPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <header className="grid gap-1">
        <h1 className="font-heading text-2xl font-bold">Dashboard kit preview</h1>
        <p className="text-sm text-muted-foreground">
          Dev/test only. Review every primitive at 360 and 1280 before using it in admin or
          seller pages.
        </p>
      </header>
      <DashboardKitPreview />
    </main>
  );
}
