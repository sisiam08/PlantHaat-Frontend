"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "../auth-provider";
import { authApi } from "../api";
import { toastApiError } from "./error-toast";

export function VerificationBanner() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const { user } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const id = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (!user || user.emailVerifiedAt) {
    return null;
  }

  const resend = async () => {
    setPending(true);
    try {
      const result = await authApi.resendVerification();
      if (result.sent) {
        setCooldown(60);
        toast.success(t("resendEmail"));
      }
    } catch (error) {
      toastApiError(error, tErrors);
    } finally {
      setPending(false);
    }
  };

  return (
    <Alert className="rounded-none border-x-0 border-t-0">
      <AlertTitle>{t("verifyTitle")}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>{t("verificationBanner")}</span>
        <Button
          type="button"
          size="sm"
          variant="cta"
          disabled={pending || cooldown > 0}
          onClick={() => void resend()}
        >
          {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resendEmail")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
