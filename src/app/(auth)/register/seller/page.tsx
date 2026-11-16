import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterSellerForm } from "@/features/auth/components/register-seller-form";
import { AuthEntryGuard } from "@/features/auth/components/auth-entry-guard";
import { redirectIfAuthenticated } from "@/server/auth-entry";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("sellerTitle") };
}

export default async function RegisterSellerPage() {
  await redirectIfAuthenticated(null);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("sellerTitle")} subtitle={t("sellerSubtitle")}>
      <AuthEntryGuard />
      <RegisterSellerForm />
    </AuthCard>
  );
}
