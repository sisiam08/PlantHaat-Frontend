"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { addressesApi, type CreateAddressInput } from "@/features/addresses/api";
import { toastApiError } from "@/features/auth/components/error-toast";
import { FormField } from "@/features/auth/components/form-field";
import { apiGet } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { District } from "@/lib/api/types";

export function AddressesClient() {
  const t = useTranslations("account.addresses");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();

  const list = useQuery({ queryKey: queryKeys.addresses, queryFn: addressesApi.list });
  const districts = useQuery({
    queryKey: queryKeys.catalog.districts,
    queryFn: () => apiGet<District[]>("/locations/districts").then((result) => result.data),
    staleTime: 60 * 60 * 1000,
  });

  const schema = z.object({
    recipientName: z.string().min(2, t("validation.name")),
    phone: z.string().min(6, t("validation.phone")),
    districtId: z.string().min(1, t("validation.district")),
    area: z.string().min(1, t("validation.required")),
    addressLine: z.string().min(3, t("validation.required")),
    postalCode: z.string().optional(),
    label: z.string().optional(),
    cityScope: z.enum(["CITY", "OUTSIDE", "NA"]).optional(),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipientName: "",
      phone: "",
      districtId: "",
      area: "",
      addressLine: "",
      postalCode: "",
      label: "",
      cityScope: "NA",
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.addresses });

  const create = useMutation({
    mutationFn: (input: CreateAddressInput) => addressesApi.create(input),
    onSuccess: async () => {
      form.reset();
      await invalidate();
      toast.success(t("created"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: invalidate,
    onError: (error) => toastApiError(error, tErrors),
  });

  const selectedDistrict = (districts.data ?? []).find(
    (district) => String(district.id) === form.watch("districtId"),
  );

  const setDefault = useMutation({
    mutationFn: (id: string) => addressesApi.setDefault(id),
    onSuccess: invalidate,
    onError: (error) => toastApiError(error, tErrors),
  });

  const onCreate = form.handleSubmit((values) => {
    create.mutate({
      recipientName: values.recipientName,
      phone: values.phone,
      districtId: Number(values.districtId),
      area: values.area,
      addressLine: values.addressLine,
      postalCode: values.postalCode || undefined,
      label: values.label || undefined,
      cityScope: values.cityScope,
    });
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        {list.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {list.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : null}
        {list.data?.map((address) => (
          <Card key={address.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div className="grid gap-1 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  {address.recipientName}
                  {address.isDefault ? <Badge>{t("default")}</Badge> : null}
                </div>
                <span className="text-muted-foreground">
                  {address.addressLine}, {address.area}, {address.district.name}
                </span>
                <span className="text-muted-foreground">{address.phone}</span>
              </div>
              <div className="flex flex-col gap-2">
                {!address.isDefault ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={setDefault.isPending}
                    onClick={() => setDefault.mutate(address.id)}
                  >
                    {t("setDefault")}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(address.id)}
                >
                  {t("remove")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-4 text-lg font-semibold">{t("addNew")}</h2>
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2" noValidate>
            <FormField
              label={t("recipientName")}
              error={form.formState.errors.recipientName?.message}
              {...form.register("recipientName")}
            />
            <FormField
              label={t("phone")}
              inputMode="tel"
              error={form.formState.errors.phone?.message}
              {...form.register("phone")}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="districtId">{t("district")}</Label>
              <select
                id="districtId"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("districtId")}
              >
                <option value="">{t("selectDistrict")}</option>
                {(districts.data ?? []).map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.districtId ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.districtId.message}
                </p>
              ) : null}
            </div>
            {selectedDistrict?.metro ? (
              <div className="grid gap-1.5">
                <Label htmlFor="cityScope">{t("cityScope")}</Label>
                <select
                  id="cityScope"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register("cityScope")}
                >
                  <option value="CITY">{t("insideCity")}</option>
                  <option value="OUTSIDE">{t("outsideCity")}</option>
                </select>
              </div>
            ) : null}
            <FormField
              label={t("area")}
              error={form.formState.errors.area?.message}
              {...form.register("area")}
            />
            <FormField
              label={t("addressLine")}
              className="sm:col-span-2"
              error={form.formState.errors.addressLine?.message}
              {...form.register("addressLine")}
            />
            <FormField
              label={t("postalCode")}
              error={form.formState.errors.postalCode?.message}
              {...form.register("postalCode")}
            />
            <FormField
              label={t("label")}
              error={form.formState.errors.label?.message}
              {...form.register("label")}
            />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={create.isPending}>
                {t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
