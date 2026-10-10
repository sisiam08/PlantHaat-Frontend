import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComplaintDetail } from "@/features/complaints/components/complaint-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("complaints");
  return { title: t("title"), robots: { index: false } };
}

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-8">
      <ComplaintDetail id={id} />
    </main>
  );
}
