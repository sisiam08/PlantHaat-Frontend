"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useUnreadCount } from "@/features/notifications/use-unread-count";

export function NotificationsBell() {
  const t = useTranslations("shell");
  const { user } = useAuth();
  const unread = useUnreadCount(Boolean(user));

  if (!user) {
    return null;
  }

  const count = unread.data ?? 0;
  const label = count > 0 ? `${t("notifications")} (${count})` : t("notifications");

  return (
    <Button asChild variant="ghost" size="icon-lg" className="relative" aria-label={label}>
      <Link href="/notifications">
        <Bell aria-hidden />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] leading-4 font-semibold text-destructive-foreground tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

