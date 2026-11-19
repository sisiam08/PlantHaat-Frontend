"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { uploadsApi } from "@/features/uploads/api";
import { queryKeys } from "@/lib/api/query-keys";
import { adminApi } from "../api";
import type { AdminBanner } from "../types";

interface FormState {
  title: string;
  imageUrl: string;
  linkUrl: string;
  placement: string;
  sortOrder: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

const empty: FormState = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  placement: "HOME_HERO",
  sortOrder: "0",
  isActive: true,
  startsAt: "",
  endsAt: "",
};

export function BannersClient() {
  const t = useTranslations("admin.content");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const stored = await uploadsApi.image(file, "banner");
      setForm((current) => ({ ...current, imageUrl: stored.url }));
    } catch (error) {
      toastApiError(error, tErrors);
    } finally {
      setUploading(false);
    }
  };

  const query = useQuery({
    queryKey: queryKeys.admin.banners,
    queryFn: adminApi.listBanners,
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.banners });

  const toInput = () => ({
    title: form.title.trim() || undefined,
    imageUrl: form.imageUrl.trim(),
    linkUrl: form.linkUrl.trim() || undefined,
    placement: form.placement.trim() || undefined,
    sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    isActive: form.isActive,
    startsAt: form.startsAt || undefined,
    endsAt: form.endsAt || undefined,
  });

  const save = useMutation({
    mutationFn: () =>
      editingId ? adminApi.updateBanner(editingId, toInput()) : adminApi.createBanner(toInput()),
    onSuccess: async () => {
      setForm(empty);
      setEditingId(null);
      await invalidate();
      toast.success(t("saved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.removeBanner(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const startEdit = (banner: AdminBanner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title ?? "",
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl ?? "",
      placement: banner.placement,
      sortOrder: String(banner.sortOrder),
      isActive: banner.isActive,
      startsAt: banner.startsAt ? banner.startsAt.slice(0, 10) : "",
      endsAt: banner.endsAt ? banner.endsAt.slice(0, 10) : "",
    });
  };

  const items = query.data ?? [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        {query.isLoading ? <Skeleton className="h-20 w-full" /> : null}
        {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
        {!query.isLoading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noBanners")}</p>
        ) : null}
        {items.map((banner) => (
          <Card key={banner.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.imageUrl}
                alt={banner.title ?? ""}
                className="h-14 w-24 shrink-0 rounded-xl object-cover"
              />
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{banner.title ?? "-"}</span>
                  <Badge variant="outline">{banner.placement}</Badge>
                  <Badge variant={banner.isActive ? "default" : "outline"}>
                    {banner.isActive ? t("active") : t("inactive")}
                  </Badge>
                </div>
                {banner.linkUrl ? (
                  <span className="truncate text-xs text-muted-foreground">{banner.linkUrl}</span>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(banner)}>
                  {tCommon("edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(t("removeConfirm"))) remove.mutate(banner.id);
                  }}
                >
                  {t("remove")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardContent>
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? t("editBanner") : t("addBanner")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bannerTitle">{t("title")}</Label>
              <Input
                id="bannerTitle"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bannerImage">{t("imageUrl")}</Label>
              <div className="flex gap-2">
                <Input
                  id="bannerImage"
                  value={form.imageUrl}
                  onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus aria-hidden className="size-4" />
                  )}
                  {uploading ? t("uploading") : t("uploadImage")}
                </Button>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bannerLink">{t("linkUrl")}</Label>
              <Input
                id="bannerLink"
                value={form.linkUrl}
                onChange={(event) => setForm({ ...form, linkUrl: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bannerPlacement">{t("placement")}</Label>
              <Input
                id="bannerPlacement"
                value={form.placement}
                onChange={(event) => setForm({ ...form, placement: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bannerSort">{t("sortOrder")}</Label>
              <Input
                id="bannerSort"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bannerStarts">{t("startsAt")}</Label>
              <Input
                id="bannerStarts"
                type="date"
                value={form.startsAt}
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bannerEnds">{t("endsAt")}</Label>
              <Input
                id="bannerEnds"
                type="date"
                value={form.endsAt}
                onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="bannerActive"
                checked={form.isActive}
                onCheckedChange={(value) => setForm({ ...form, isActive: value === true })}
              />
              <Label htmlFor="bannerActive">{t("active")}</Label>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="cta"
                disabled={save.isPending || form.imageUrl.trim() === ""}
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
