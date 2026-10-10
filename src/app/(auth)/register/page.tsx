import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("registerTitle") };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("registerTitle")} subtitle={t("registerSubtitle")}>
      <RegisterForm />
    </AuthCard>
  );
}
