import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterSellerForm } from "@/features/auth/components/register-seller-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("sellerTitle") };
}

export default async function RegisterSellerPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("sellerTitle")} subtitle={t("sellerSubtitle")}>
      <RegisterSellerForm />
    </AuthCard>
  );
}
