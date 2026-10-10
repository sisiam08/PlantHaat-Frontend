import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComplaintNew } from "@/features/complaints/components/complaint-new";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("complaints");
  return { title: t("newTitle"), robots: { index: false } };
}

export default async function NewComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ shopOrderId?: string }>;
}) {
  const t = await getTranslations("complaints");
  const { shopOrderId } = await searchParams;

  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      {shopOrderId ? (
        <ComplaintNew shopOrderId={shopOrderId} />
      ) : (
        <p className="text-sm text-muted-foreground">{t("missingOrder")}</p>
      )}
    </main>
  );
}
