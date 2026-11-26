"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Price } from "@/components/product/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { FormField } from "@/features/auth/components/form-field";
import { uploadsApi } from "@/features/uploads/api";
import { apiGet } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { CategoryNode } from "@/lib/api/types";
import { sellerApi } from "../api";
import { productStatusVariant } from "../status";
import type {
  CareDifficulty,
  CreateProductInput,
  LightRequirement,
  SellerProductView,
  SellerVariantView,
  UpdateVariantInput,
  WateringFrequency,
} from "../types";

const LIGHT = ["FULL_SUN", "PARTIAL_SHADE", "SHADE", "BRIGHT_INDIRECT", "LOW_LIGHT"] as const;
const WATERING = ["DAILY", "EVERY_2_3_DAYS", "WEEKLY", "FORTNIGHTLY", "MINIMAL"] as const;
const DIFFICULTY = ["EASY", "MODERATE", "HARD"] as const;

function flattenCategories(nodes: CategoryNode[]): { id: string; label: string }[] {
  const options: { id: string; label: string }[] = [];
  for (const node of nodes) {
    options.push({ id: node.id, label: node.name });
    for (const child of node.children) {
      options.push({ id: child.id, label: `— ${child.name}` });
    }
  }
  return options;
}

/* ───────────────────────── create ───────────────────────── */

export function ProductForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("seller.products");
  const tErrors = useTranslations("errors");

  const create = useMutation({
    mutationFn: (input: CreateProductInput) => sellerApi.createProduct(input),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.products() });
      toast.success(t("created"));
      router.replace(`/seller/products/${product.id}`);
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  return (
    <ProductBasicsForm onSubmit={(input) => create.mutate(input)} pending={create.isPending} />
  );
}

/* ───────────────────────── edit ───────────────────────── */

export function ProductEditor({ id }: { id: string }) {
  const t = useTranslations("seller.products");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();

  const product = useQuery({
    queryKey: queryKeys.seller.product(id),
    queryFn: () => sellerApi.getProduct(id),
    retry: false,
  });

  const update = useMutation({
    mutationFn: (input: CreateProductInput) => sellerApi.updateProduct(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.product(id) });
      toast.success(t("saved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (product.isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }
  if (product.isError || !product.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const data = product.data;

  return (
    <div className="grid gap-6">
      <ProductBasicsForm
        product={data}
        onSubmit={(input) => update.mutate(input)}
        pending={update.isPending}
      />
      <StatusCard product={data} />
      <VariantsCard product={data} />
      <ImagesCard product={data} />
    </div>
  );
}

/* ───────────────────────── shared basics form ───────────────────────── */

function ProductBasicsForm({
  product,
  onSubmit,
  pending,
}: {
  product?: SellerProductView;
  onSubmit: (input: CreateProductInput) => void;
  pending: boolean;
}) {
  const t = useTranslations("seller.products");
  const categories = useQuery({
    queryKey: queryKeys.catalog.categories,
    queryFn: () => apiGet<CategoryNode[]>("/categories").then((result) => result.data),
    staleTime: 60 * 60 * 1000,
  });

  const schema = z.object({
    categoryId: z.string().min(1, t("validation.category")),
    name: z.string().min(2, t("validation.name")).max(200),
    nameBn: z.string().max(200),
    scientificName: z.string().max(200),
    description: z.string().min(1, t("validation.description")).max(5000),
    careInstructions: z.string().max(5000),
    lightRequirement: z.string(),
    wateringFrequency: z.string(),
    careDifficulty: z.string(),
    isIndoor: z.boolean(),
    isPetSafe: z.boolean(),
    matureHeightCm: z.string(),
    weightKg: z.string().refine(
      (value) => value.trim() === "" || (Number(value) > 0 && Number(value) <= 600),
      "weightKg",
    ),
    extraChargeAfterQty: z.string().refine(
      (value) =>
        value.trim() === "" ||
        (Number.isInteger(Number(value)) && Number(value) >= 1),
      "extraChargeAfterQty",
    ),
    extraChargePerUnit: z.string().refine(
      (value) =>
        value.trim() === "" ||
        (Number.isInteger(Number(value)) && Number(value) >= 0),
      "extraChargePerUnit",
    ),
    tags: z.string(),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: product?.category?.id ?? "",
      name: product?.name ?? "",
      nameBn: product?.nameBn ?? "",
      scientificName: product?.scientificName ?? "",
      description: product?.description ?? "",
      careInstructions: product?.careInstructions ?? "",
      lightRequirement: product?.lightRequirement ?? "",
      wateringFrequency: product?.wateringFrequency ?? "",
      careDifficulty: product?.careDifficulty ?? "",
      isIndoor: product?.isIndoor ?? false,
      isPetSafe: product?.isPetSafe ?? false,
      matureHeightCm: product?.matureHeightCm != null ? String(product.matureHeightCm) : "",
      weightKg: product?.weightKg != null ? String(product.weightKg) : "",
      extraChargeAfterQty:
        product?.extraChargeAfterQty != null ? String(product.extraChargeAfterQty) : "",
      extraChargePerUnit:
        product?.extraChargePerUnit != null ? String(product.extraChargePerUnit) : "",
      tags: product?.tags?.join(", ") ?? "",
    },
  });

  const isIndoor = useWatch({ control: form.control, name: "isIndoor" });
  const isPetSafe = useWatch({ control: form.control, name: "isPetSafe" });
  const extraAfter = Number(
    useWatch({ control: form.control, name: "extraChargeAfterQty" }) || 0,
  );
  const extraPerUnit = Number(
    useWatch({ control: form.control, name: "extraChargePerUnit" }) || 0,
  );

  const submit = form.handleSubmit((values) => {
    const height = Number(values.matureHeightCm);
    const input: CreateProductInput = {
      categoryId: values.categoryId,
      name: values.name.trim(),
      description: values.description.trim(),
      nameBn: values.nameBn.trim() || undefined,
      scientificName: values.scientificName.trim() || undefined,
      careInstructions: values.careInstructions.trim() || undefined,
      lightRequirement: (values.lightRequirement || undefined) as LightRequirement | undefined,
      wateringFrequency: (values.wateringFrequency || undefined) as WateringFrequency | undefined,
      careDifficulty: (values.careDifficulty || undefined) as CareDifficulty | undefined,
      isIndoor: values.isIndoor,
      isPetSafe: values.isPetSafe,
      matureHeightCm: values.matureHeightCm.trim() && Number.isFinite(height) ? height : undefined,
      weightKg:
        values.weightKg.trim() && Number.isFinite(Number(values.weightKg))
          ? Number(values.weightKg)
          : undefined,
      extraChargeAfterQty: values.extraChargeAfterQty.trim()
        ? Number(values.extraChargeAfterQty)
        : undefined,
      extraChargePerUnit: values.extraChargePerUnit.trim()
        ? Number(values.extraChargePerUnit)
        : undefined,
      tags: values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    onSubmit(input);
  });

  const options = flattenCategories(categories.data ?? []);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{t("basics")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="categoryId">{t("category")}</Label>
            <select
              id="categoryId"
              className="h-10 rounded-full border border-input bg-background px-4 text-sm"
              {...form.register("categoryId")}
            >
              <option value="">{t("selectCategory")}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {form.formState.errors.categoryId ? (
              <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("name")}
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />
            <FormField label={t("nameBn")} {...form.register("nameBn")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("scientificName")} {...form.register("scientificName")} />
            <FormField
              label={t("matureHeightCm")}
              inputMode="numeric"
              {...form.register("matureHeightCm")}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea id="description" rows={4} {...form.register("description")} />
            {form.formState.errors.description ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="careInstructions">{t("careInstructions")}</Label>
            <Textarea id="careInstructions" rows={3} {...form.register("careInstructions")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="lightRequirement">{t("light")}</Label>
              <select
                id="lightRequirement"
                className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                {...form.register("lightRequirement")}
              >
                <option value="">{t("unspecified")}</option>
                {LIGHT.map((value) => (
                  <option key={value} value={value}>
                    {t(`lightOptions.${value}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wateringFrequency">{t("watering")}</Label>
              <select
                id="wateringFrequency"
                className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                {...form.register("wateringFrequency")}
              >
                <option value="">{t("unspecified")}</option>
                {WATERING.map((value) => (
                  <option key={value} value={value}>
                    {t(`wateringOptions.${value}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="careDifficulty">{t("difficulty")}</Label>
              <select
                id="careDifficulty"
                className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                {...form.register("careDifficulty")}
              >
                <option value="">{t("unspecified")}</option>
                {DIFFICULTY.map((value) => (
                  <option key={value} value={value}>
                    {t(`difficultyOptions.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Switch
                id="isIndoor"
                checked={isIndoor}
                onCheckedChange={(checked) => form.setValue("isIndoor", checked)}
              />
              <Label htmlFor="isIndoor">{t("indoor")}</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isPetSafe"
                checked={isPetSafe}
                onCheckedChange={(checked) => form.setValue("isPetSafe", checked)}
              />
              <Label htmlFor="isPetSafe">{t("petSafe")}</Label>
            </div>
          </div>

          <FormField label={t("tags")} placeholder={t("tagsHint")} {...form.register("tags")} />

          <div className="grid gap-4 rounded-xl border border-border/60 p-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="weightKg">{t("weightKg")}</Label>
              <Input
                id="weightKg"
                inputMode="decimal"
                placeholder="1.2"
                {...form.register("weightKg")}
              />
              <p className="text-xs text-muted-foreground">{t("weightKgHint")}</p>
              {form.formState.errors.weightKg ? (
                <p className="text-xs text-destructive">{t("validation.weightKg")}</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="extraChargeAfterQty">{t("extraChargeAfterQty")}</Label>
              <Input
                id="extraChargeAfterQty"
                inputMode="numeric"
                placeholder="10"
                {...form.register("extraChargeAfterQty")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="extraChargePerUnit">{t("extraChargePerUnit")}</Label>
              <Input
                id="extraChargePerUnit"
                inputMode="numeric"
                placeholder="10"
                {...form.register("extraChargePerUnit")}
              />
            </div>
            <p className="self-end rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              {t("extraExample", {
                qty: 13,
                extraQty: Math.max(0, 13 - (extraAfter || 10)),
                unit: extraPerUnit || 10,
                total: Math.max(0, 13 - (extraAfter || 10)) * (extraPerUnit || 10),
              })}
            </p>
          </div>
          <div>
            <Button type="submit" variant="cta" disabled={pending}>
              {product ? t("save") : t("create")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── status ───────────────────────── */

function StatusCard({ product }: { product: SellerProductView }) {
  const t = useTranslations("seller.products");
  const tStatus = useTranslations("seller.productStatus");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();

  const setStatus = useMutation({
    mutationFn: (status: "ACTIVE" | "INACTIVE") => sellerApi.setProductStatus(product.id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.product(product.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.products() });
      toast.success(t("statusUpdated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("statusTitle")}
          <Badge variant={productStatusVariant(product.status)}>{tStatus(product.status)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {product.rejectionReason ? (
          <p className="text-destructive">
            {t("rejectionReason", { reason: product.rejectionReason })}
          </p>
        ) : null}
        <p className="text-muted-foreground">{t("statusHint")}</p>
        <div className="flex flex-wrap gap-2">
          {product.status !== "ACTIVE" ? (
            <Button
              type="button"
              variant="cta"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate("ACTIVE")}
            >
              {t("activate")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate("INACTIVE")}
            >
              {t("deactivate")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── images ───────────────────────── */

function ImagesCard({ product }: { product: SellerProductView }) {
  const t = useTranslations("seller.products");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.seller.product(product.id) });

  const makePrimary = useMutation({
    mutationFn: (imageId: string) =>
      sellerApi.updateImage(product.id, imageId, { isPrimary: true }),
    onSuccess: refresh,
    onError: (error) => toastApiError(error, tErrors),
  });

  const removeImage = useMutation({
    mutationFn: (imageId: string) => sellerApi.removeImage(product.id, imageId),
    onSuccess: refresh,
    onError: (error) => toastApiError(error, tErrors),
  });

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const stored = await uploadsApi.image(file, "product");
      await sellerApi.addImage(product.id, {
        url: stored.url,
        isPrimary: product.images.length === 0,
        sortOrder: product.images.length,
      });
      await refresh();
      toast.success(t("imageAdded"));
    } catch (error) {
      toastApiError(error, tErrors);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{t("imagesTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t("imagesHint")}</p>
        <div className="flex flex-wrap gap-3">
          {product.images.map((image) => (
            <div key={image.id} className="grid gap-1">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="h-24 w-24 rounded-xl border border-border object-cover"
                />
                {image.isPrimary ? (
                  <Badge className="absolute left-1 top-1" variant="secondary">
                    {t("primary")}
                  </Badge>
                ) : null}
              </div>
              <div className="flex gap-1">
                {!image.isPrimary ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={makePrimary.isPending}
                    onClick={() => makePrimary.mutate(image.id)}
                  >
                    {t("makePrimary")}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={removeImage.isPending}
                  onClick={() => removeImage.mutate(image.id)}
                >
                  {t("removeImage")}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? t("uploading") : t("uploadImage")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── variants ───────────────────────── */

function VariantsCard({ product }: { product: SellerProductView }) {
  const t = useTranslations("seller.products");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SellerVariantView | "new" | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.seller.product(product.id) });

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t("variantsTitle")}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing("new")}>
            {t("addVariant")}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {product.variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noVariants")}</p>
        ) : (
          product.variants.map((variant) => (
            <VariantRow
              key={variant.id}
              productId={product.id}
              variant={variant}
              locale={locale}
              onEdit={() => setEditing(variant)}
            />
          ))
        )}

        {editing !== null ? (
          <VariantForm
            productId={product.id}
            variant={editing === "new" ? undefined : editing}
            onDone={async () => {
              setEditing(null);
              await refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function VariantRow({
  productId,
  variant,
  locale,
  onEdit,
}: {
  productId: string;
  variant: SellerVariantView;
  locale: string;
  onEdit: () => void;
}) {
  const t = useTranslations("seller.products");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [stock, setStock] = useState(String(variant.stockQty));

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.seller.product(productId) });

  const remove = useMutation({
    mutationFn: () => sellerApi.removeVariant(productId, variant.id),
    onSuccess: async () => {
      await refresh();
      toast.success(t("variantRemoved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const adjust = useMutation({
    mutationFn: (value: number) =>
      sellerApi.adjustStock(variant.id, { set: value, reason: "ADJUSTMENT" }),
    onSuccess: async () => {
      await refresh();
      toast.success(t("stockUpdated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const low = variant.stockQty <= variant.lowStockThreshold;

  return (
    <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_auto]">
      <div className="grid gap-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{variant.name}</span>
          {variant.isActive ? (
            <Badge variant="secondary">{t("variantActive")}</Badge>
          ) : (
            <Badge variant="outline">{t("variantInactive")}</Badge>
          )}
          {low ? <Badge variant="destructive">{t("lowStock")}</Badge> : null}
        </div>
        <span className="flex flex-wrap items-center gap-1 text-muted-foreground">
          <Price value={variant.price} locale={locale} size="sm" />
          {variant.compareAtPrice != null ? (
            <>
              <span aria-hidden>·</span>
              <span>{t("compareAt")}</span>
              <Price value={variant.compareAtPrice} locale={locale} size="sm" />
            </>
          ) : null}
        </span>
        <span className="text-muted-foreground">
          {t("stockLabel")}: {variant.stockQty} · {t("threshold")}: {variant.lowStockThreshold}
          {variant.sizeLabel ? ` · ${variant.sizeLabel}` : ""}
          {variant.potType ? ` · ${variant.potType}` : ""}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-20"
          inputMode="numeric"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          aria-label={t("setStock")}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={adjust.isPending}
          onClick={() => {
            const value = Number(stock);
            if (Number.isInteger(value) && value >= 0) adjust.mutate(value);
          }}
        >
          {t("setStock")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          {t("edit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          {t("remove")}
        </Button>
      </div>
    </div>
  );
}

function VariantForm({
  productId,
  variant,
  onDone,
  onCancel,
}: {
  productId: string;
  variant?: SellerVariantView;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("seller.products");
  const tErrors = useTranslations("errors");
  const [name, setName] = useState(variant?.name ?? "");
  const [price, setPrice] = useState(variant ? String(variant.price) : "");
  const [compareAt, setCompareAt] = useState(
    variant?.compareAtPrice != null ? String(variant.compareAtPrice) : "",
  );
  const [stock, setStock] = useState(String(variant?.stockQty ?? 0));
  const [threshold, setThreshold] = useState(String(variant?.lowStockThreshold ?? 3));
  const [sizeLabel, setSizeLabel] = useState(variant?.sizeLabel ?? "");
  const [potType, setPotType] = useState(variant?.potType ?? "");
  const [isActive, setIsActive] = useState(variant?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const base = {
        name: name.trim(),
        price: Number(price),
        compareAtPrice: compareAt.trim() === "" ? undefined : Number(compareAt),
        lowStockThreshold: Number(threshold),
        sizeLabel: sizeLabel.trim() || undefined,
        potType: potType.trim() || undefined,
        isActive,
      } satisfies UpdateVariantInput;
      if (variant) {
        return sellerApi.updateVariant(productId, variant.id, base);
      }
      return sellerApi.addVariant(productId, {
        ...base,
        stockQty: Number(stock),
        sortOrder: 0,
      });
    },
    onSuccess: () => {
      toast.success(variant ? t("variantSaved") : t("variantAdded"));
      onDone();
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("validation.variantName"));
      return;
    }
    if (price.trim() === "" || !Number.isFinite(Number(price)) || Number(price) < 0) {
      setError(t("validation.price"));
      return;
    }
    if (!Number.isInteger(Number(threshold)) || Number(threshold) < 0) {
      setError(t("validation.threshold"));
      return;
    }
    setError(null);
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border p-3" noValidate>
      <h3 className="font-medium">{variant ? t("editVariant") : t("newVariant")}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label={t("variantName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FormField
          label={t("price")}
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <FormField
          label={t("compareAt")}
          inputMode="decimal"
          value={compareAt}
          onChange={(e) => setCompareAt(e.target.value)}
        />
        {!variant ? (
          <FormField
            label={t("initialStock")}
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        ) : null}
        <FormField
          label={t("threshold")}
          inputMode="numeric"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
        <FormField
          label={t("sizeLabel")}
          value={sizeLabel}
          onChange={(e) => setSizeLabel(e.target.value)}
        />
        <FormField
          label={t("potType")}
          value={potType}
          onChange={(e) => setPotType(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} id="variantActive" />
        <Label htmlFor="variantActive">{t("variantActive")}</Label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="cta" disabled={save.isPending}>
          {t("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}


