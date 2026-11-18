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
  searchParams: Promise<{
    next?: string;
    returnTo?: string;
    callbackUrl?: string;
    reason?: string;
  }>;
}) {
  const params = await searchParams;
  const next = params.next ?? params.returnTo ?? params.callbackUrl ?? null;
  await redirectIfAuthenticated(next);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      {params.reason === "session-expired" ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-border/70 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground"
        >
          {t("sessionExpired")}
        </p>
      ) : null}
      <AuthEntryGuard next={next} />
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}