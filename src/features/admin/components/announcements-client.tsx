"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import type { AdminAnnouncement, AnnouncementAudience } from "../types";
import { Pager } from "./pager";

const AUDIENCES: AnnouncementAudience[] = ["ALL", "CUSTOMERS", "SELLERS"];

interface FormState {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  publishedAt: string;
  expiresAt: string;
}

const empty: FormState = { title: "", body: "", audience: "ALL", publishedAt: "", expiresAt: "" };

export function AnnouncementsClient({ initialPage }: { initialPage: number }) {
  const t = useTranslations("admin.announcements");
  const tAudience = useTranslations("admin.audience");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const queryClient = useQueryClient();
  const page = Math.max(1, initialPage);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.admin.announcements({ page }),
    queryFn: () => adminApi.listAnnouncements({ page, limit: 20 }),
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements() });

  const toInput = () => ({
    title: form.title.trim(),
    body: form.body.trim(),
    audience: form.audience,
    publishedAt: form.publishedAt || undefined,
    expiresAt: form.expiresAt || undefined,
  });

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? adminApi.updateAnnouncement(editingId, toInput())
        : adminApi.createAnnouncement(toInput()),
    onSuccess: async () => {
      setForm(empty);
      setEditingId(null);
      await invalidate();
      toast.success(t("saved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.removeAnnouncement(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const startEdit = (announcement: AdminAnnouncement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      publishedAt: announcement.publishedAt ? announcement.publishedAt.slice(0, 10) : "",
      expiresAt: announcement.expiresAt ? announcement.expiresAt.slice(0, 10) : "",
    });
  };

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        {query.isLoading ? <Skeleton className="h-20 w-full" /> : null}
        {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
        {!query.isLoading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : null}
        {items.map((announcement) => (
          <Card key={announcement.id} className="rounded-2xl">
            <CardContent className="grid gap-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{announcement.title}</span>
                  <Badge variant="outline">{tAudience(announcement.audience)}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {announcement.publishedAt
                    ? formatLatinDateTime(announcement.publishedAt)
                    : t("notPublished")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">{announcement.body}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(announcement)}
                >
                  {tCommon("edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(t("removeConfirm"))) remove.mutate(announcement.id);
                  }}
                >
                  {t("remove")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? (
        <Pager
          page={meta.page}
          totalPages={meta.totalPages}
          onPage={(p) => router.push(p > 1 ? `/admin/announcements?page=${p}` : "/admin/announcements")}
        />
      ) : null}

      <Card className="rounded-2xl">
        <CardContent>
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? t("editTitle") : t("add")}
          </h2>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="announcementTitle">{t("title")}</Label>
              <Input
                id="announcementTitle"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="announcementBody">{t("body")}</Label>
              <Textarea
                id="announcementBody"
                rows={3}
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="announcementAudience">{t("audience")}</Label>
                <select
                  id="announcementAudience"
                  className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                  value={form.audience}
                  onChange={(event) =>
                    setForm({ ...form, audience: event.target.value as AnnouncementAudience })
                  }
                >
                  {AUDIENCES.map((value) => (
                    <option key={value} value={value}>
                      {tAudience(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="announcementPublished">{t("publishedAt")}</Label>
                <Input
                  id="announcementPublished"
                  type="date"
                  value={form.publishedAt}
                  onChange={(event) => setForm({ ...form, publishedAt: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="announcementExpires">{t("expiresAt")}</Label>
                <Input
                  id="announcementExpires"
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="cta"
                disabled={
                  save.isPending || form.title.trim().length < 2 || form.body.trim().length < 2
                }
                onClick={() => save.mutate()}
              >
                {tCommon("save")}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setForm(empty);
                  }}
                >
                  {tCommon("cancel")}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
