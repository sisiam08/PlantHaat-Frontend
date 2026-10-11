"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { FormField } from "@/features/auth/components/form-field";
import { uploadsApi } from "@/features/uploads/api";
import { queryKeys } from "@/lib/api/query-keys";
import { adminApi } from "../api";
import type { AdminCategory } from "../types";

export function CategoriesClient() {
  const t = useTranslations("admin.categories");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: adminApi.listCategories,
    retry: false,
  });

  const schema = z
    .object({
      name: z.string().min(2, t("validation.name")),
      nameBn: z.string().optional(),
      slug: z.string().optional(),
      parentId: z.string().optional(),
      imageUrl: z.string().optional(),
      sortOrder: z.string().optional(),
      isActive: z.boolean(),
    })
    .superRefine((values, ctx) => {
      // The backend keeps imageUrl optional, but creating a category requires it.
      if (!editingId && !values.imageUrl) {
        ctx.addIssue({ code: "custom", path: ["imageUrl"], message: t("imageRequired") });
      }
    });
  type Values = z.infer<typeof schema>;

  const empty: Values = {
    name: "",
    nameBn: "",
    slug: "",
    parentId: "",
    imageUrl: "",
    sortOrder: "0",
    isActive: true,
  };

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const isActive = useWatch({ control: form.control, name: "isActive" });
  const imageUrl = useWatch({ control: form.control, name: "imageUrl" });
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const stored = await uploadsApi.image(file, "category");
      form.setValue("imageUrl", stored.url, { shouldValidate: true });
    } catch (error) {
      toastApiError(error, tErrors);
    } finally {
      setUploading(false);
    }
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories });

  const toInput = (values: Values) => ({
    name: values.name,
    nameBn: values.nameBn || undefined,
    slug: values.slug || undefined,
    parentId: values.parentId || undefined,
    imageUrl: values.imageUrl || undefined,
    sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
    isActive: values.isActive,
  });

  const save = useMutation({
    mutationFn: (values: Values) =>
      editingId
        ? adminApi.updateCategory(editingId, toInput(values))
        : adminApi.createCategory(toInput(values)),
    onSuccess: async () => {
      form.reset(empty);
      setEditingId(null);
      await invalidate();
      toast.success(editingId ? t("saved") : t("created"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.removeCategory(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const startEdit = (category: AdminCategory) => {
    setEditingId(category.id);
    form.reset({
      name: category.name,
      nameBn: category.nameBn ?? "",
      slug: category.slug,
      parentId: category.parentId ?? "",
      imageUrl: category.imageUrl ?? "",
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
    });
  };

  const items = query.data ?? [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        {query.isLoading ? <Skeleton className="h-20 w-full" /> : null}
        {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
        {!query.isLoading && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : null}
        {items.map((category) => (
          <Card key={category.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  {category.nameBn ? (
                    <span className="text-muted-foreground">{category.nameBn}</span>
                  ) : null}
                  <Badge variant={category.isActive ? "default" : "outline"}>
                    {category.isActive ? t("active") : t("inactive")}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  /{category.slug} · {t("productsCount", { count: category._count.products })} ·{" "}
                  {t("childrenCount", { count: category._count.children })}
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(category)}>
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(t("removeConfirm"))) remove.mutate(category.id);
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
          <h2 className="mb-4 text-lg font-semibold">{editingId ? t("editTitle") : t("add")}</h2>
          <form
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <FormField
              label={t("name")}
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />
            <FormField label={t("nameBn")} {...form.register("nameBn")} />
            <FormField label={t("slug")} {...form.register("slug")} />
            <div className="grid gap-1.5">
              <Label htmlFor="parentId">{t("parent")}</Label>
              <select
                id="parentId"
                className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                {...form.register("parentId")}
              >
                <option value="">{t("noParent")}</option>
                {items
                  .filter((category) => category.id !== editingId)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>{t("image")}</Label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/40 ring-1 ring-border/40">
                  {imageUrl ? (
                    <Image src={imageUrl} alt="" fill sizes="80px" className="object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                    <label className="cursor-pointer">
                      <ImagePlus aria-hidden />
                      {uploading ? t("uploading") : imageUrl ? t("replaceImage") : t("uploadImage")}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => void uploadImage(event)}
                      />
                    </label>
                  </Button>
                  {imageUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => form.setValue("imageUrl", "", { shouldValidate: true })}
                    >
                      <Trash2 aria-hidden />
                      {t("removeImage")}
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("imageHint")}</p>
              {form.formState.errors.imageUrl ? (
                <p className="text-sm text-destructive">{form.formState.errors.imageUrl.message}</p>
              ) : null}
            </div>
            <FormField label={t("sortOrder")} inputMode="numeric" {...form.register("sortOrder")} />
            <div className="flex items-center gap-2">
              <Checkbox
                id="categoryActive"
                checked={isActive}
                onCheckedChange={(value) => form.setValue("isActive", value === true)}
              />
              <Label htmlFor="categoryActive">{t("active")}</Label>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" variant="cta" disabled={save.isPending}>
                {tCommon("save")}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    form.reset(empty);
                  }}
                >
                  {tCommon("cancel")}
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
