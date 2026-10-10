"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { adminApi } from "../api";
import type { AdminHomepageSection, HomepageSectionType } from "../types";

const TYPES: HomepageSectionType[] = [
  "FEATURED_CATEGORIES",
  "FEATURED_PRODUCTS",
  "FEATURED_SHOPS",
  "NEW_ARRIVALS",
  "BANNER_STRIP",
];

interface FormState {
  key: string;
  title: string;
  titleBn: string;
  type: HomepageSectionType;
  itemIds: string;
  sortOrder: string;
  isActive: boolean;
}

const empty: FormState = {
  key: "",
  title: "",
  titleBn: "",
  type: "FEATURED_PRODUCTS",
  itemIds: "",
  sortOrder: "0",
  isActive: true,
};

export function HomepageSectionsClient() {
  const t = useTranslations("admin.content");
  const tType = useTranslations("admin.sectionType");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.admin.homepageSections,
    queryFn: adminApi.listHomepageSections,
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.homepageSections });

  const toInput = () => ({
    key: form.key.trim(),
    title: form.title.trim(),
    titleBn: form.titleBn.trim() || undefined,
    type: form.type,
    itemIds: form.itemIds
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    isActive: form.isActive,
  });

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? adminApi.updateHomepageSection(editingId, toInput())
        : adminApi.createHomepageSection(toInput()),
    onSuccess: async () => {
      setForm(empty);
      setEditingId(null);
      await invalidate();
      toast.success(t("saved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.removeHomepageSection(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const startEdit = (section: AdminHomepageSection) => {
    setEditingId(section.id);
    setForm({
      key: section.key,
      title: section.title,
      titleBn: section.titleBn ?? "",
      type: section.type,
      itemIds: section.itemIds.join(", "),
      sortOrder: String(section.sortOrder),
      isActive: section.isActive,
    });
  };

  const items = query.data ?? [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        {query.isLoading ? <Skeleton className="h-20 w-full" /> : null}
        {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
        {!query.isLoading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSections")}</p>
        ) : null}
        {items.map((section) => (
          <Card key={section.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{section.title}</span>
                  {section.titleBn ? (
                    <span className="text-muted-foreground">{section.titleBn}</span>
                  ) : null}
                  <Badge variant="outline">{tType(section.type)}</Badge>
                  <Badge variant={section.isActive ? "default" : "outline"}>
                    {section.isActive ? t("active") : t("inactive")}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {section.key} · {t("itemsCount", { count: section.itemIds.length })}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(section)}
                >
                  {tCommon("edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(t("removeConfirm"))) remove.mutate(section.id);
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
            {editingId ? t("editSection") : t("addSection")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sectionKey">{t("key")}</Label>
              <Input
                id="sectionKey"
                value={form.key}
                onChange={(event) => setForm({ ...form, key: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sectionType">{t("type")}</Label>
              <select
                id="sectionType"
                className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as HomepageSectionType })
                }
              >
                {TYPES.map((value) => (
                  <option key={value} value={value}>
                    {tType(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sectionTitle">{t("title")}</Label>
              <Input
                id="sectionTitle"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sectionTitleBn">{t("titleBn")}</Label>
              <Input
                id="sectionTitleBn"
                value={form.titleBn}
                onChange={(event) => setForm({ ...form, titleBn: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="sectionItems">{t("itemIds")}</Label>
              <Input
                id="sectionItems"
                value={form.itemIds}
                onChange={(event) => setForm({ ...form, itemIds: event.target.value })}
              />
              <span className="text-xs text-muted-foreground">{t("itemIdsHint")}</span>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sectionSort">{t("sortOrder")}</Label>
              <Input
                id="sectionSort"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sectionActive"
                checked={form.isActive}
                onCheckedChange={(value) => setForm({ ...form, isActive: value === true })}
              />
              <Label htmlFor="sectionActive">{t("active")}</Label>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="cta"
                disabled={save.isPending || !form.key.trim() || !form.title.trim()}
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
