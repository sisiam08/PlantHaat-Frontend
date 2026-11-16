import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthEntryGuard } from "@/features/auth/components/auth-entry-guard";
import { LoginForm } from "@/features/auth/components/login-form";
import { redirectIfAuthenticated } from "@/server/auth-entry";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; returnTo?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? params.returnTo ?? params.callbackUrl ?? null;
  await redirectIfAuthenticated(next);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      <AuthEntryGuard next={next} />
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}