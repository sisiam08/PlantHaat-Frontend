import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-skeleton";
import { AdvanceRefundsClient } from "@/features/payments/components/advance-refunds-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payments");
  return { title: t("refundQueueTitle"), robots: { index: false } };
}

export default function AdminAdvanceRefundsPage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <Suspense fallback={<PageLoading />}>
        <AdvanceRefundsClient />
      </Suspense>
    </main>
  );
}
