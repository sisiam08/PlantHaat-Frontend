"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "../auth-provider";
import { authApi } from "../api";

export function VerifyEmailClient() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { refreshUser } = useAuth();

  const verification = useQuery({
    queryKey: ["auth", "verify-email", token],
    queryFn: async () => {
      const result = await authApi.verifyEmail(token);
      await refreshUser();
      return result;
    },
    enabled: token.length > 0,
    retry: false,
    staleTime: Infinity,
  });

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("verifyFailed")}</AlertDescription>
      </Alert>
    );
  }

  if (verification.isLoading) {
    return <Alert>
      <AlertDescription>{t("verifying")}</AlertDescription>
    </Alert>;
  }

  if (verification.isError) {
    return (
      <div className="grid gap-4">
        <Alert variant="destructive">
          <AlertDescription>{t("verifyFailed")}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Alert>
        <AlertDescription>{t("verifySuccess")}</AlertDescription>
      </Alert>
      <Button asChild variant="cta">
        <Link href="/">{t("loginTitle")}</Link>
      </Button>
    </div>
  );
}
