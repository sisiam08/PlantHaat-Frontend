import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
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
    <main id="main" className="flex-1">
      <PageContainer width="form">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <ApplyWizard />
      </PageContainer>
    </main>
  );
}
