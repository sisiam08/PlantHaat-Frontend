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
import { CartSummaryBox } from "@/features/cart/components/cart-summary";
import { queryKeys } from "@/lib/api/query-keys";
import { apiGet, toApiError } from "@/lib/api/client";
import type { District } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";
import { formatCount } from "@/lib/format/number";
import { checkoutApi } from "../api";

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

  const placeOrder = useMutation({
    mutationFn: () =>
      checkoutApi.place(
        {
          addressId: selectedAddress!.id,
          paymentMethod: "COD",
          expectedGrandTotal: Number(
            expectedGrandTotal.current ?? cart.data?.grandTotal ?? 0,
          ),
        },
        idempotencyKey.current,
      ),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success(t("orderPlaced"));
      router.push(`/orders/${order.id}`);
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
      <QueryError
        message={tCommon("sectionLoadFailed")}
        onRetry={() => void addresses.refetch()}
      />
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
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-5">
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("address")}</h2>
            {list.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setShowForm((value) => !value)}>
                {t("addNewAddress")}
              </Button>
            ) : null}
          </div>

          {list.length === 0 && !showForm ? (
            <Button variant="outline" onClick={() => setShowForm(true)}>
              {t("addNewAddress")}
            </Button>
          ) : null}

          {list.map((address) => (
            <label
              key={address.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <input
                type="radio"
                name="address"
                className="mt-1"
                checked={selectedAddress?.id === address.id}
                onChange={() => setSelectedId(address.id)}
              />
              <span className="grid gap-0.5 text-sm">
                <span className="font-medium">{address.recipientName}</span>
                <span className="text-muted-foreground">
                  {address.addressLine}, {address.area}, {locale === "bn" ? address.district.nameBn : address.district.name}
                </span>
                <span className="text-muted-foreground">{address.phone}</span>
              </span>
            </label>
          ))}

          {showForm || list.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent>
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
                  {(districts.data ?? []).find(
                    (district) => String(district.id) === formDistrictId,
                  )?.metro ? (
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
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">{t("payment")}</h2>
          <Card className="rounded-2xl">
            <CardContent className="flex items-center gap-3">
              <input type="radio" checked readOnly />
              <div>
                <p className="font-medium">{t("cod")}</p>
                <p className="text-sm text-muted-foreground">{t("codNote")}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="grid gap-4 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
        {cart.isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : cart.isError ? (
          <QueryError
            message={tCommon("sectionLoadFailed")}
            onRetry={() => void cart.refetch()}
          />
        ) : cart.data ? (
          <div className="grid gap-4">
            {cart.data.shops.map((shop) => (
              <Card key={shop.shopId} className="rounded-2xl">
                <CardContent className="grid gap-1 text-sm">
                  <p className="font-medium">{shop.shopName}</p>
                  {shop.items.map((item) => (
                    <div key={item.variantId} className="flex justify-between text-muted-foreground">
                      <span className="truncate pr-2">
                        {item.productName} Ã— {formatCount(item.quantity, locale)}
                      </span>
                      <span>{formatBdt(item.lineTotal, locale)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-1">
                    <span>{t("itemsSubtotal")}</span>
                    <span>{formatBdt(shop.subtotal, locale)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("delivery")}</span>
                    <span className={shop.deliverable === false ? "text-warning-foreground" : undefined}>
                      {shop.deliveryCharge != null
                        ? formatBdt(shop.deliveryCharge, locale)
                        : shop.deliverable === false
                          ? t("notDelivering")
                          : t("selectToSee")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <CartSummaryBox view={cart.data} fixedOnMobile={false} />
            {hasNotDelivering(cart.data) ? (
              <p className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
                {t("notDeliveringBlocked")}
              </p>
            ) : null}
            <Button
              variant="cta"
              size="lg"
              disabled={
                !selectedAddress ||
                placeOrder.isPending ||
                cart.data.shops.length === 0 ||
                hasNotDelivering(cart.data)
              }
              onClick={() => placeOrder.mutate()}
            >
              {placeOrder.isPending ? t("submitting") : t("placeOrder")}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cart">{t("backToCart")}</Link>
            </Button>
          </div>
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
                  {line.productName} Â· {line.variantName}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {formatBdt(line.from, locale)} â†’ {formatBdt(line.to, locale)}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>{t("newTotal")}</span>
              <span>{priceChange ? formatBdt(priceChange.grandTotal, locale) : ""}</span>
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

function hasNotDelivering(view: {
  shops: { deliverable?: boolean | null }[];
}): boolean {
  return view.shops.some((shop) => shop.deliverable === false);
}

