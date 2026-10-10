"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { addressesApi, type CreateAddressInput } from "@/features/addresses/api";
import { toastApiError } from "@/features/auth/components/error-toast";
import { cartApi } from "@/features/cart/api";
import { queryKeys } from "@/lib/api/query-keys";
import { apiGet } from "@/lib/api/client";
import type { District } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";
import { checkoutApi } from "../api";

export function CheckoutClient() {
  const t = useTranslations("checkout");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const placeOrder = useMutation({
    mutationFn: () =>
      checkoutApi.place(
        { addressId: selectedAddress!.id, paymentMethod: "COD" },
        idempotencyKey.current,
      ),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success(t("orderPlaced"));
      router.push(`/orders/${order.id}`);
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const onSubmitAddress = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createAddress.mutate({
      recipientName: String(form.get("recipientName") ?? ""),
      phone: String(form.get("phone") ?? ""),
      districtId: Number(form.get("districtId")),
      area: String(form.get("area") ?? ""),
      addressLine: String(form.get("addressLine") ?? ""),
      postalCode: String(form.get("postalCode") ?? "") || undefined,
      isDefault: list.length === 0,
    });
  };

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
                <form onSubmit={onSubmitAddress} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="recipientName">{t("recipientName")}</Label>
                    <Input id="recipientName" name="recipientName" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone">{t("phone")}</Label>
                    <Input id="phone" name="phone" inputMode="tel" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="districtId">{t("district")}</Label>
                    <select
                      id="districtId"
                      name="districtId"
                      required
                      className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                    >
                      <option value="">{t("district")}</option>
                      {(districts.data ?? []).map((district) => (
                        <option key={district.id} value={district.id}>
                          {locale === "bn" ? district.nameBn : district.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="area">{t("area")}</Label>
                    <Input id="area" name="area" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="addressLine">{t("addressLine")}</Label>
                    <Input id="addressLine" name="addressLine" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="postalCode">{t("postalCode")}</Label>
                    <Input id="postalCode" name="postalCode" inputMode="numeric" />
                  </div>
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

      <Card className="h-fit rounded-2xl border border-border/60 shadow-sm lg:sticky lg:top-24">
        <CardContent className="grid gap-3">
          <h2 className="font-semibold">{t("summary")}</h2>
          {cart.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : cart.data ? (
            <>
              {cart.data.shops.map((shop) => (
                <div key={shop.shopId} className="grid gap-1 text-sm">
                  <p className="font-medium">{shop.shopName}</p>
                  {shop.items.map((item) => (
                    <div key={item.variantId} className="flex justify-between text-muted-foreground">
                      <span className="truncate pr-2">
                        {item.productName} × {item.quantity}
                      </span>
                      <span>{formatBdt(item.lineTotal, locale)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span>{t("delivery")}</span>
                    <span>{formatBdt(shop.deliveryCharge ?? "0", locale)}</span>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{t("total")}</span>
                <span>{formatBdt(cart.data.grandTotal, locale)}</span>
              </div>
            </>
          ) : null}
          <Button
            variant="cta"
            size="lg"
            disabled={!selectedAddress || placeOrder.isPending || (cart.data?.shops.length ?? 0) === 0}
            onClick={() => placeOrder.mutate()}
          >
            {placeOrder.isPending ? t("submitting") : t("placeOrder")}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/cart">{t("backToCart")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
