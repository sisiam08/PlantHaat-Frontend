"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toastApiError } from "@/features/auth/components/error-toast";
import { useAuth } from "@/features/auth/auth-provider";
import { accountApi } from "../api";

const CATEGORIES = ["orders", "qna", "reviews", "complaints", "announcements"] as const;

export function NotificationPrefsCard() {
  const t = useTranslations("account.notifications");
  const tErrors = useTranslations("errors");
  const { user, refreshUser } = useAuth();

  const prefs = (user?.notificationPrefs ?? {}) as Record<string, unknown>;

  const toggle = async (key: string, value: boolean) => {
    try {
      await accountApi.updateNotificationPrefs({ [key]: value });
      await refreshUser();
    } catch (error) {
      toastApiError(error, tErrors);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1">
        <p className="pb-2 text-sm text-muted-foreground">{t("hint")}</p>
        {CATEGORIES.map((key) => {
          const checked = prefs[key] !== false;
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 border-t border-border/50 py-2.5 first:border-t-0"
            >
              <Label htmlFor={`pref-${key}`} className="text-sm font-normal">
                {t(key)}
              </Label>
              <Switch
                id={`pref-${key}`}
                checked={checked}
                onCheckedChange={(value) => void toggle(key, value)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
