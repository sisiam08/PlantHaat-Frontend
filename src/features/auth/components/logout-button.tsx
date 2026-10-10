"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useAuth } from "../auth-provider";

export function LogoutButton() {
  const t = useTranslations("nav");
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      onClick={async () => {
        await logout();
        router.push("/");
      }}
    >
      {t("logout")}
    </Button>
  );
}
