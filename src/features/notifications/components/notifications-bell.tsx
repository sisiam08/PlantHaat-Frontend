"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { formatCount } from "@/lib/format/number";
import { formatRelativeLatin } from "@/lib/format/date";
import { queryKeys } from "@/lib/api/query-keys";
import type { NotificationItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { notificationsApi } from "../api";
import { LOCALIZED_TYPES, notificationHref } from "../notification-content";
import { useUnreadCount } from "../use-unread-count";

function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return desktop;
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
}) {
  const t = useTranslations("notifications");
  const tTypes = useTranslations("notifications.types");
  const locale = useLocale();
  const localized = LOCALIZED_TYPES.has(item.type);
  const title = localized ? tTypes(`${item.type}.title`) : item.title;
  const body = localized ? tTypes(`${item.type}.body`) : item.body;
  const unread = item.readAt === null;

  return (
    <button
      type="button"
      data-notification-item
      onClick={() => onOpen(item)}
      className="relative grid w-full gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex items-start gap-2">
        {unread ? (
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-cta" />
        ) : null}
        <span className={cn("text-sm", unread && "font-semibold")}>{title}</span>
      </span>
      <span className="line-clamp-2 pl-4 text-xs text-muted-foreground">{body}</span>
      <span className="pl-4 text-xs text-muted-foreground">
        {formatRelativeLatin(item.createdAt, locale)}
      </span>
    </button>
  );
}

function PanelBody({ onClose }: { onClose: () => void }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);

  const list = useInfiniteQuery({
    queryKey: ["notifications", "panel"],
    queryFn: ({ pageParam }) => notificationsApi.list({ page: pageParam, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta && last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    refetchOnMount: "always",
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
  const markRead = useMutation({ mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: invalidate });

  const items = list.data?.pages.flatMap((page) => page.data) ?? [];

  const open = (item: NotificationItem) => {
    if (item.readAt === null) markRead.mutate(item.id);
    const href = notificationHref(item);
    if (href) {
      onClose();
      router.push(href);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const nodes = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-notification-item]") ?? [],
    );
    const current = nodes.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? current + 1 : current - 1;
    if (next >= 0 && next < nodes.length) {
      event.preventDefault();
      nodes[next].focus();
    }
  };

  return (
    <div className="grid min-h-0 gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          {t("markAllRead")}
        </Button>
      </div>

      <div ref={listRef} onKeyDown={onKeyDown} className="max-h-[60dvh] overflow-y-auto">
        {list.isLoading ? (
          <div className="grid gap-1">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : list.isError ? (
          <div className="grid gap-2 p-3 text-center">
            <p className="text-sm text-muted-foreground">{t("loadError")}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void list.refetch()}>
              {t("retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="grid gap-0.5">
            {items.map((item) => (
              <NotificationRow key={item.id} item={item} onOpen={open} />
            ))}
          </div>
        )}
        {list.hasNextPage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {t("loadMore")}
          </Button>
        ) : null}
      </div>

      <div className="border-t border-border/60 px-1 pt-2">
        <Link
          href="/notifications"
          onClick={onClose}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
        >
          {t("seeAll")}
        </Link>
      </div>
    </div>
  );
}

export function NotificationsBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const { user, isLoading, hasSessionHint } = useAuth();
  const unread = useUnreadCount(Boolean(user));
  const desktop = useDesktop();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Keep the slot (and its 44 px width) while the session resolves for a
  // returning signed-in visitor; guests have no bell and must not see a shift.
  if (isLoading && hasSessionHint) {
    return <span aria-hidden className="size-11 shrink-0 rounded-full bg-muted/40" />;
  }
  if (!user) return null;

  const count = unread.data ?? 0;
  const label =
    count > 0
      ? `${t("title")}, ${t("unread", { count: formatCount(count, locale) })}`
      : t("title");
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="relative"
      aria-label={label}
      aria-expanded={open}
      aria-controls={panelId}
      aria-haspopup="dialog"
    >
      <Bell aria-hidden />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] leading-4 font-semibold text-destructive-foreground tabular-nums">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Button>
  );

  if (desktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-96 p-3"
          id={panelId}
          aria-label={t("title")}
        >
          <PanelBody onClose={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        showCloseButton
        id={panelId}
        aria-label={t("title")}
        className="top-auto bottom-0 left-0 max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl p-4"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("title")}</DialogDescription>
        </DialogHeader>
        <PanelBody onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
