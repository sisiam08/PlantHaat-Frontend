import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { VerifyEmailClient } from "@/features/auth/components/verify-email-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("verifyTitle") };
}

export default async function VerifyEmailPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("verifyTitle")}>
      <Suspense>
        <VerifyEmailClient />
      </Suspense>
    </AuthCard>
  );
}
