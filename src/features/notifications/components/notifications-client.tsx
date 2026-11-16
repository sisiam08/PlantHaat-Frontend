"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format/number";
import { queryKeys } from "@/lib/api/query-keys";
import type { NotificationItem } from "@/lib/api/types";
import { notificationsApi } from "../api";
import { useUnreadCount } from "../use-unread-count";

const LOCALIZED_TYPES = new Set([
  "QUESTION_ASKED",
  "QUESTION_ANSWERED",
  "REPLY_RECEIVED",
  "ORDER_DELAYED",
  "REPLACEMENT_CREATED",
]);

function notificationHref(item: NotificationItem): string | null {
  const data = (item.data ?? {}) as Record<string, unknown>;
  const slug = typeof data.productSlug === "string" ? data.productSlug : null;
  if (item.type === "QUESTION_ASKED") return "/seller/questions";
  if (item.type === "QUESTION_ANSWERED" && slug) return `/products/${slug}?tab=qa`;
  if (item.type === "REPLY_RECEIVED" && typeof data.reviewId === "string" && slug) {
    return `/products/${slug}?tab=reviews`;
  }
  if (item.type === "REPLY_RECEIVED" && slug) return `/products/${slug}?tab=qa`;
  if (
    (item.type === "ORDER_DELAYED" || item.type === "REPLACEMENT_CREATED") &&
    typeof data.orderId === "string"
  ) {
    return `/orders/${data.orderId}`;
  }
  if (typeof data.orderId === "string" && typeof data.intentId === "string") {
    const status = typeof data.status === "string" ? data.status : "";
    if (status === "UNDERPAID" || status === "REJECTED") {
      return `/checkout/payment/${data.orderId}`;
    }
    return `/orders/${data.orderId}`;
  }
  return null;
}

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
      {list.data?.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

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
                      className={cn("text-sm hover:underline", isUnread && "font-semibold")}
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
