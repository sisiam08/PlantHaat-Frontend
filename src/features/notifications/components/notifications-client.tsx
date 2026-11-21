"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format/number";
import { queryKeys } from "@/lib/api/query-keys";
import type { NotificationItem } from "@/lib/api/types";
import { LOCALIZED_TYPES, notificationHref } from "../notification-content";
import { notificationsApi } from "../api";
import { useUnreadCount } from "../use-unread-count";

export function NotificationsClient() {
  const t = useTranslations("notifications");
  const tTypes = useTranslations("notifications.types");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationsApi.list(),
  });
  const unread = useUnreadCount();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidate,
  });

  const open = (item: NotificationItem) => {
    if (item.readAt === null) {
      markRead.mutate(item.id);
    }
    const href = notificationHref(item);
    if (href) {
      router.push(href);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("unread", { count: formatCount(unread.data ?? 0, locale) })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={markAll.isPending || !list.data?.data.length}
          onClick={() => markAll.mutate()}
        >
          {t("markAllRead")}
        </Button>
      </div>

      {list.isLoading ? <Skeleton className="h-32 w-full" /> : null}
      {list.data?.data.length === 0 ? <EmptyState title={t("empty")} /> : null}

      <div className="grid gap-2">
        {list.data?.data.map((item) => {
          const isUnread = item.readAt === null;
          const localized = LOCALIZED_TYPES.has(item.type);
          const title = localized ? tTypes(`${item.type}.title`) : item.title;
          const body = localized ? tTypes(`${item.type}.body`) : item.body;
          const href = notificationHref(item);
          return (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  {href ? (
                    <Link
                      href={href}
                      onClick={() => open(item)}
                      className={cn(
                        "inline-flex min-h-11 items-center text-sm hover:underline",
                        isUnread && "font-semibold",
                      )}
                    >
                      {title}
                    </Link>
                  ) : (
                    <span className={cn("text-sm", isUnread && "font-semibold")}>{title}</span>
                  )}
                  <span className="text-sm text-muted-foreground">{body}</span>
                </div>
                {isUnread ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(item.id)}
                  >
                    {t("markRead")}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
