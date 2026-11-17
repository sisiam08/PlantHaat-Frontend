"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryError } from "@/components/feedback/query-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { addressesApi, type CreateAddressInput } from "@/features/addresses/api";
import { FormField } from "@/features/auth/components/form-field";
import { toastApiError } from "@/features/auth/components/error-toast";
import { cartApi } from "@/features/cart/api";
import { clearGuestCart, markGuestCartHandled } from "@/features/cart/guest-cart";
import { queryKeys } from "@/lib/api/query-keys";
import { apiGet, toApiError } from "@/lib/api/client";
import type { District } from "@/lib/api/types";
import { Price } from "@/components/product/price";
import { cn } from "@/lib/utils";
import { checkoutApi } from "../api";
import { CheckoutSummary } from "./checkout-summary";

interface PriceChangeLine {
  variantId: string;
  productName: string;
  variantName: string;
  slug?: string;
  from: string;
  to: string;
}

interface PriceChangeDetails {
  expectedGrandTotal: string;
  subtotal: string;
  deliveryTotal: string;
  grandTotal: string;
  changedLines: PriceChangeLine[];
}

export function CheckoutClient() {
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const expectedGrandTotal = useRef<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priceChange, setPriceChange] = useState<PriceChangeDetails | null>(null);

  const addresses = useQuery({ queryKey: queryKeys.addresses, queryFn: addressesApi.list });
  const districts = useQuery({
    queryKey: queryKeys.catalog.districts,
    queryFn: () => apiGet<District[]>("/locations/districts").then((result) => result.data),
  });

  const list = addresses.data ?? [];
  const selectedAddress =
    list.find((address) => address.id === selectedId) ??
    list.find((address) => address.isDefault) ??
    list[0];

  const addressSchema = z.object({
    recipientName: z.string().trim().min(1, t("required")),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+?88)?01[3-9]\d{8}$/, t("invalidPhone")),
    districtId: z.string().min(1, t("required")),
    area: z.string().trim().min(1, t("required")),
    addressLine: z.string().trim().min(1, t("required")),
    postalCode: z.string().trim().max(10).optional(),
    cityScope: z.enum(["CITY", "OUTSIDE", "NA"]),
  });
  type AddressForm = z.infer<typeof addressSchema>;

  const form = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      recipientName: "",
      phone: "",
      districtId: "",
      area: "",
      addressLine: "",
      postalCode: "",
      cityScope: "NA",
    },
  });

  const formDistrictId = form.watch("districtId");

  const publicSettings = useQuery({
    queryKey: ["settings", "public"],
    queryFn: () =>
      apiGet<Record<string, unknown>>("/settings/public").then((result) => result.data),
    staleTime: 60_000,
  });

  const cart = useQuery({
    queryKey: [...queryKeys.cart, selectedAddress?.districtId ?? 0],
    queryFn: () => cartApi.get(selectedAddress?.districtId),
    enabled: Boolean(selectedAddress),
  });

  const createAddress = useMutation({
    mutationFn: (input: CreateAddressInput) => addressesApi.create(input),
    onSuccess: async (address) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
      setSelectedId(address.id);
      setShowForm(false);
      form.reset();
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const codEnabled = publicSettings.data?.["payment.cod.enabled"] !== false;
  const codMax = Number(publicSettings.data?.["order.codMaxAmount"] ?? 0);
  const codOverLimit = codMax > 0 && Number(cart.data?.grandTotal ?? 0) > codMax;
  const codBlocked = !codEnabled || codOverLimit;
  const advanceEnabled =
    publicSettings.data?.["payment.advance.enabled"] === true &&
    (publicSettings.data?.["payment.bkash.enabled"] === true ||
      publicSettings.data?.["payment.nagad.enabled"] === true);
  const [method, setMethod] = useState<"COD" | "ADVANCE">("COD");
  const effectiveMethod: "COD" | "ADVANCE" =
    method === "COD" && codBlocked && advanceEnabled ? "ADVANCE" : method;

  const placeOrder = useMutation({
    mutationFn: () =>
      checkoutApi.place(
        {
          addressId: selectedAddress!.id,
          paymentMethod: effectiveMethod,
          expectedGrandTotal: Number(expectedGrandTotal.current ?? cart.data?.grandTotal ?? 0),
        },
        idempotencyKey.current,
      ),
    onSuccess: async (order) => {
      clearGuestCart();
      markGuestCartHandled();
      queryClient.removeQueries({ queryKey: queryKeys.cart });
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success(t("orderPlaced"));
      router.push(
        effectiveMethod === "ADVANCE" ? `/checkout/payment/${order.id}` : `/orders/${order.id}`,
      );
    },
    onError: async (error) => {
      const apiError = toApiError(error);
      if (apiError.code === "PRICE_CHANGED" && apiError.details) {
        setPriceChange(apiError.details as PriceChangeDetails);
        await queryClient.invalidateQueries({ queryKey: queryKeys.cart });
        return;
      }
      toastApiError(error, tErrors);
    },
  });

  if (addresses.isError) {
    return (
      <QueryError message={tCommon("sectionLoadFailed")} onRetry={() => void addresses.refetch()} />
    );
  }

  const confirmPriceChange = () => {
    if (!priceChange) return;
    expectedGrandTotal.current = priceChange.grandTotal;
    setPriceChange(null);
    placeOrder.mutate();
  };

  const onSubmitAddress = form.handleSubmit((values) => {
    createAddress.mutate({
      recipientName: values.recipientName,
      phone: values.phone,
      districtId: Number(values.districtId),
      area: values.area,
      addressLine: values.addressLine,
      postalCode: values.postalCode || undefined,
      cityScope: values.cityScope,
      isDefault: list.length === 0,
    });
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="grid content-start gap-6 self-start">
        <section data-checkout-section className="grid content-start gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("address")}</h2>
            {list.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setShowForm((value) => !value)}>
                {t("addNewAddress")}
              </Button>
            ) : null}
          </div>

          <div data-section-cards className="grid gap-3">
            {list.length === 0 && !showForm ? (
              <Button variant="outline" onClick={() => setShowForm(true)}>
                {t("addNewAddress")}
              </Button>
            ) : null}

            {list.map((address) => (
              <div
                key={address.id}
                data-section-card
                className={cn(
                  "flex items-start gap-3 rounded-2xl border bg-card p-4",
                  selectedAddress?.id === address.id
                    ? "border-primary ring-1 ring-primary/20"
                    : "border-border",
                )}
              >
                <input
                  id={`address-${address.id}`}
                  type="radio"
                  name="address"
                  className="mt-1"
                  checked={selectedAddress?.id === address.id}
                  onChange={() => setSelectedId(address.id)}
                />
                <label
                  htmlFor={`address-${address.id}`}
                  className="min-w-0 flex-1 cursor-pointer text-sm"
                >
                  <span className="block font-medium">{address.recipientName}</span>
                  <span
                    className="line-clamp-2 block text-muted-foreground"
                    title={`${address.addressLine}, ${address.area}`}
                  >
                    {address.addressLine}, {address.area},{" "}
                    {locale === "bn" ? address.district.nameBn : address.district.name}
                  </span>
                  <span className="block text-muted-foreground">{address.phone}</span>
                </label>
                <Link
                  href="/account/addresses"
                  className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("edit")}
                </Link>
              </div>
            ))}

          {showForm || list.length === 0 ? (
            <Card data-section-card className="rounded-2xl [--card-spacing:0px]">
              <CardContent className="p-4">
                <form onSubmit={onSubmitAddress} className="grid gap-3" noValidate>
                  <FormField
                    label={t("recipientName")}
                    autoComplete="name"
                    error={form.formState.errors.recipientName?.message}
                    {...form.register("recipientName")}
                  />
                  <FormField
                    label={t("phone")}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    error={form.formState.errors.phone?.message}
                    {...form.register("phone")}
                  />
                  <div className="grid gap-1.5">
                    <Label htmlFor="districtId">{t("district")}</Label>
                    <select
                      id="districtId"
                      aria-invalid={form.formState.errors.districtId ? true : undefined}
                      aria-describedby={
                        form.formState.errors.districtId ? "districtId-error" : undefined
                      }
                      className="h-11 rounded-full border border-input bg-background px-4 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      {...form.register("districtId", {
                        onChange: () => form.setValue("cityScope", "CITY"),
                      })}
                    >
                      <option value="">{t("district")}</option>
                      {(districts.data ?? []).map((district) => (
                        <option key={district.id} value={district.id}>
                          {locale === "bn" ? district.nameBn : district.name}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.districtId ? (
                      <p id="districtId-error" className="text-sm text-destructive">
                        {form.formState.errors.districtId.message}
                      </p>
                    ) : null}
                  </div>
                  {(districts.data ?? []).find((district) => String(district.id) === formDistrictId)
                    ?.metro ? (
                    <div className="grid gap-1.5">
                      <Label htmlFor="cityScope">{t("cityScope")}</Label>
                      <select
                        id="cityScope"
                        className="h-11 rounded-full border border-input bg-background px-4 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        {...form.register("cityScope")}
                      >
                        <option value="NA" disabled>
                          {t("cityScope")}
                        </option>
                        <option value="CITY">{t("insideCity")}</option>
                        <option value="OUTSIDE">{t("outsideCity")}</option>
                      </select>
                    </div>
                  ) : null}
                  <FormField
                    label={t("area")}
                    autoComplete="address-level2"
                    error={form.formState.errors.area?.message}
                    {...form.register("area")}
                  />
                  <FormField
                    label={t("addressLine")}
                    autoComplete="street-address"
                    error={form.formState.errors.addressLine?.message}
                    {...form.register("addressLine")}
                  />
                  <FormField
                    label={t("postalCode")}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    error={form.formState.errors.postalCode?.message}
                    {...form.register("postalCode")}
                  />
                  <Button type="submit" variant="cta" disabled={createAddress.isPending}>
                    {t("saveAddress")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
          </div>
        </section>

        <section data-checkout-section className="grid content-start gap-3">
          <h2 className="text-lg font-semibold">{t("payment")}</h2>
          <div role="radiogroup" aria-label={t("payment")} className="grid gap-2">
            <label
              data-section-card
              data-payment-option="COD"
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-4",
                effectiveMethod === "COD"
                  ? "border-primary ring-1 ring-primary/20"
                  : "border-border",
                codBlocked && "opacity-60",
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                aria-label={t("cod")}
                checked={effectiveMethod === "COD"}
                onChange={() => setMethod("COD")}
                disabled={codBlocked}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="block font-medium">{t("cod")}</span>
                <span className="block text-sm text-muted-foreground">{t("codNote")}</span>
                {!codEnabled ? (
                  <span className="block text-sm text-destructive">{t("codUnavailable")}</span>
                ) : codOverLimit ? (
                  <span className="block text-sm text-destructive">
                    {t("codLimit")}{" "}
                    <Price value={codMax} locale={locale} size="sm" />.
                  </span>
                ) : null}
              </span>
            </label>

            {advanceEnabled ? (
              <label
                data-section-card
                data-payment-option="ADVANCE"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-4",
                  effectiveMethod === "ADVANCE"
                    ? "border-primary ring-1 ring-primary/20"
                    : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  aria-label={t("advance")}
                  checked={effectiveMethod === "ADVANCE"}
                  onChange={() => setMethod("ADVANCE")}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{t("advance")}</span>
                  <span className="block text-sm text-muted-foreground">{t("advanceNote")}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t("advanceAmount")}:</span>
                    <Price value={cart.data?.grandTotal} locale={locale} size="sm" />
                  </span>
                  <span className="mt-1 block text-xs font-medium text-primary">
                    {t("payNowAdvance")}
                  </span>
                </span>
              </label>
            ) : null}

            {!codEnabled && !advanceEnabled ? (
              <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                {t("orderingUnavailable")}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="min-w-0 self-start lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:flex lg:max-h-[calc(100vh-var(--header-h)-2rem)] lg:flex-col">
        {cart.isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : cart.isError ? (
          <QueryError message={tCommon("sectionLoadFailed")} onRetry={() => void cart.refetch()} />
        ) : cart.data ? (
          <CheckoutSummary
            view={cart.data}
            disabled={
              !selectedAddress ||
              cart.data.shops.length === 0 ||
              hasNotDelivering(cart.data) ||
              (effectiveMethod === "COD" ? codBlocked : !advanceEnabled) ||
              publicSettings.isLoading
            }
            pending={placeOrder.isPending}
            onPlaceOrder={() => placeOrder.mutate()}
            warning={hasNotDelivering(cart.data) ? t("notDeliveringBlocked") : undefined}
            note={
              effectiveMethod === "ADVANCE" ? t("summaryNoteAdvance") : t("summaryNote")
            }
          />
        ) : (
          <Button variant="cta" size="lg" disabled={true}>
            {t("placeOrder")}
          </Button>
        )}
      </div>

      <Dialog
        open={priceChange !== null}
        onOpenChange={(open) => {
          if (!open) setPriceChange(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("priceChangedTitle")}</DialogTitle>
            <DialogDescription>{t("priceChangedBody")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            {priceChange?.changedLines.map((line) => (
              <div key={line.variantId} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">
                  {line.productName} · {line.variantName}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  <Price value={line.from} locale={locale} size="sm" /> →{" "}
                  <Price value={line.to} locale={locale} size="sm" />
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>{t("newTotal")}</span>
              <span>
                {priceChange ? (
                  <Price value={priceChange.grandTotal} locale={locale} size="sm" />
                ) : (
                  ""
                )}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPriceChange(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="cta" onClick={confirmPriceChange}>
              {t("confirmNewPrice")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function hasNotDelivering(view: { shops: { deliverable?: boolean | null }[] }): boolean {
  return view.shops.some((shop) => shop.deliverable === false);
}
