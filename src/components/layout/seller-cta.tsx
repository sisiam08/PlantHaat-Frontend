"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

function useShowSellerCta(): boolean {
  const { user, isLoading, hasSessionHint } = useAuth();
  if (isLoading && hasSessionHint) return false;
  return user?.role !== "SELLER" && user?.role !== "ADMIN";
}

export function SellerCta({ variant = "header" }: { variant?: "header" | "footer" }) {
  const t = useTranslations("home");
  const show = useShowSellerCta();
  if (!show) return null;

  if (variant === "header") {
    return (
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="hidden shrink-0 text-xs text-muted-foreground xl:inline-flex"
      >
        <Link href="/register/seller">{t("sellerCtaButton")}</Link>
      </Button>
    );
  }

  return (
    <div className="grid gap-2.5 pt-1">
      <p className="text-sm font-medium text-foreground">{t("sellerCtaTitle")}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{t("sellerCtaBody")}</p>
      <Button asChild variant="cta" size="sm" className="w-fit">
        <Link href="/register/seller">{t("sellerCtaButton")}</Link>
      </Button>
    </div>
  );
}
