import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ApplyWizard } from "@/features/seller/components/apply-wizard";
import { requireSession } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.apply");
  return { title: t("title"), robots: { index: false } };
}

// Route-level gate: any authenticated user (a customer applying to become a
// seller, or a seller resuming an application). This page deliberately lives
// outside the seller dashboard group so customers can reach it.
export default async function SellerApplyPage() {
  await requireSession();
  const t = await getTranslations("seller.apply");
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ApplyWizard />
    </main>
  );
}
