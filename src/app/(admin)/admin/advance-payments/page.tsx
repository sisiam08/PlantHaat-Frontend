import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-skeleton";
import { AdvancePaymentsClient } from "@/features/payments/components/advance-payments-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payments");
  return { title: t("adminQueueTitle"), robots: { index: false } };
}

export default function AdminAdvancePaymentsPage() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8">
      <Suspense fallback={<PageLoading />}>
        <AdvancePaymentsClient />
      </Suspense>
    </main>
  );
}
