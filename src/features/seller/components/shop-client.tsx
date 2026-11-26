"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { FormField } from "@/features/auth/components/form-field";
import { uploadsApi } from "@/features/uploads/api";
import { apiGet } from "@/lib/api/client";
import type { District } from "@/lib/api/types";
import { locationsApi, selectableThanas } from "@/features/locations/api";
import { ApiError } from "@/lib/api/common";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { sellerApi } from "../api";
import type { SellerShop } from "../types";

export function ShopClient() {
  const t = useTranslations("seller.shop");
  const query = useQuery({
    queryKey: queryKeys.seller.shop,
    queryFn: sellerApi.getShop,
    retry: false,
  });

  if (query.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.code === "NOT_FOUND";
    return (
      <Alert>
        <AlertTitle>{t("title")}</AlertTitle>
        <AlertDescription className="grid gap-3">
          <span>{missing ? t("unavailable") : t("loadError")}</span>
          <Link href="/seller/apply" className="font-medium text-primary hover:underline">
            {t("goToApply")}
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (!query.data) {
    return null;
  }

  return <ShopForm shop={query.data} />;
}

function ShopForm({ shop }: { shop: SellerShop }) {
  const t = useTranslations("seller.shop");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);

  const schema = z.object({
    name: z.string().min(2, t("validation.name")),
    description: z.string().optional(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
    phone: z.string().optional(),
    district: z.string().optional(),
    pickupDistrictId: z.string(),
    pickupThanaId: z.string(),
    address: z.string().optional(),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: shop.name,
      description: shop.description ?? "",
      logoUrl: shop.logoUrl ?? "",
      bannerUrl: shop.bannerUrl ?? "",
      phone: shop.phone ?? "",
      district: shop.district ?? "",
      pickupDistrictId: shop.pickupDistrictId ? String(shop.pickupDistrictId) : "",
      pickupThanaId: shop.pickupThanaId ?? "",
      address: shop.address ?? "",
    },
  });

  const upload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    purpose: "shop-logo" | "shop-banner",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(purpose === "shop-logo" ? "logo" : "banner");
    try {
      const stored = await uploadsApi.image(file, purpose);
      form.setValue(purpose === "shop-logo" ? "logoUrl" : "bannerUrl", stored.url, {
        shouldValidate: true,
      });
    } catch (error) {
      toastApiError(error, tErrors);
    } finally {
      setUploading(null);
    }
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.seller.shop });

  const save = useMutation({
    mutationFn: (values: Values) =>
      sellerApi.updateShop({
        name: values.name,
        description: values.description || undefined,
        logoUrl: values.logoUrl || undefined,
        bannerUrl: values.bannerUrl || undefined,
        phone: values.phone || undefined,
        district: values.district || undefined,
        pickupDistrictId: values.pickupDistrictId
          ? Number(values.pickupDistrictId)
          : undefined,
        pickupThanaId: values.pickupThanaId || undefined,
        address: values.address || undefined,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("saved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const onSubmit = form.handleSubmit((values) => save.mutate(values));
  const logoUrl = useWatch({ control: form.control, name: "logoUrl" });
  const bannerUrl = useWatch({ control: form.control, name: "bannerUrl" });
  const districts = useQuery({
    queryKey: queryKeys.catalog.districts,
    queryFn: () =>
      apiGet<(District & { requiresThana?: boolean; insideDhaka?: boolean })[]>(
        "/locations/districts",
      ).then((result) => result.data),
    staleTime: 60 * 60 * 1000,
  });
  const pickupDistrictId = useWatch({ control: form.control, name: "pickupDistrictId" });
  const pickupThanaId = useWatch({ control: form.control, name: "pickupThanaId" });
  const selectedDistrict = districts.data?.find(
    (district) => String(district.id) === pickupDistrictId,
  );
  const requiresThana = Boolean(selectedDistrict?.requiresThana);
  const thanas = useQuery({
    queryKey: ["locations", "thanas", "shop", pickupDistrictId],
    queryFn: () => locationsApi.thanas(Number(pickupDistrictId)),
    enabled: requiresThana && pickupDistrictId !== "",
    staleTime: 60 * 60 * 1000,
  });
  useEffect(() => {
    if (
      shop.pickupThanaId &&
      thanas.data?.some((thana) => thana.id === shop.pickupThanaId)
    ) {
      form.setValue("pickupThanaId", shop.pickupThanaId);
    }
  }, [shop.pickupThanaId, thanas.data, form]);

  const pickupIncomplete =
    !pickupDistrictId || (requiresThana && !pickupThanaId);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("detailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <FormField
              label={t("name")}
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" rows={3} {...form.register("description")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("phone")} inputMode="tel" {...form.register("phone")} />
              <div className="grid gap-1.5">
                <Label htmlFor="pickupDistrictId">{t("district")}</Label>
                <select
                  id="pickupDistrictId"
                  className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
                  value={pickupDistrictId}
                  onChange={(event) => {
                    const id = event.target.value;
                    const name =
                      districts.data?.find((district) => String(district.id) === id)
                        ?.name ?? "";
                    form.setValue("pickupDistrictId", id);
                    form.setValue("pickupThanaId", "");
                    form.setValue("district", name);
                  }}
                >
                  <option value="">{t("selectDistrict")}</option>
                  {(districts.data ?? []).map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {requiresThana ? (
              <div className="grid gap-1.5">
                <Label htmlFor="pickupThanaId">{t("pickupThana")}</Label>
                <select
                  id="pickupThanaId"
                  className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
                  {...form.register("pickupThanaId")}
                >
                  <option value="">{t("selectThana")}</option>
                  {selectableThanas(thanas.data ?? []).map((thana) => (
                    <option key={thana.id} value={thana.id}>
                      {thana.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {pickupIncomplete ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                {requiresThana ? t("pickupThanaWarning") : t("pickupDistrictWarning")}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">{t("quoteUnavailableNote")}</p>
            <FormField label={t("address")} {...form.register("address")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <FormField label={t("logoUrl")} {...form.register("logoUrl")} />
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => upload(event, "shop-logo")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading !== null}
                  onClick={() => logoRef.current?.click()}
                >
                  {uploading === "logo" ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus aria-hidden className="size-4" />
                  )}
                  {uploading === "logo" ? t("uploading") : t("uploadLogo")}
                </Button>
              </div>
              <div className="grid gap-1.5">
                <FormField label={t("bannerUrl")} {...form.register("bannerUrl")} />
                <input
                  ref={bannerRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => upload(event, "shop-banner")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading !== null}
                  onClick={() => bannerRef.current?.click()}
                >
                  {uploading === "banner" ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus aria-hidden className="size-4" />
                  )}
                  {uploading === "banner" ? t("uploading") : t("uploadBanner")}
                </Button>
              </div>
            </div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : null}
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerUrl} alt="" className="h-20 w-full rounded-xl object-cover" />
            ) : null}
            <div>
              <Button type="submit" disabled={save.isPending}>
                {t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <VacationCard shop={shop} />
    </div>
  );
}

function VacationCard({ shop }: { shop: SellerShop }) {
  const t = useTranslations("seller.shop");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(shop.vacationMessage ?? "");
  const [until, setUntil] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.seller.shop });

  const enable = useMutation({
    mutationFn: () =>
      sellerApi.setVacation({
        message: message || undefined,
        until: until ? new Date(until).toISOString() : undefined,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("vacationUpdated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const disable = useMutation({
    mutationFn: () => sellerApi.clearVacation(),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("vacationUpdated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("vacation")}
          <Badge variant={shop.isOnVacation ? "secondary" : "outline"}>
            {shop.isOnVacation ? t("vacationOn") : t("vacationOff")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {shop.isOnVacation ? (
          <>
            <div className="grid gap-1 text-sm">
              {shop.vacationMessage ? (
                <span className="text-muted-foreground">
                  {t("vacationMessage")}: {shop.vacationMessage}
                </span>
              ) : null}
              {shop.vacationUntil ? (
                <span className="text-muted-foreground">
                  {t("vacationUntil")}: {formatLatinDateTime(shop.vacationUntil)}
                </span>
              ) : null}
            </div>
            <Separator />
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={disable.isPending}
                onClick={() => disable.mutate()}
              >
                {t("disableVacation")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="vacationMessage">{t("vacationMessage")}</Label>
                <Input
                  id="vacationMessage"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vacationUntil">{t("vacationUntil")}</Label>
                <Input
                  id="vacationUntil"
                  type="date"
                  value={until}
                  onChange={(event) => setUntil(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="cta"
                disabled={enable.isPending}
                onClick={() => enable.mutate()}
              >
                {t("enableVacation")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}











