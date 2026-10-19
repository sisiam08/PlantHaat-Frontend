"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toastApiError } from "@/features/auth/components/error-toast";
import { ApiError } from "@/lib/api/common";
import { apiGet } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { District } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";
import { sellerApi } from "../api";
import type { DeliveryZone, DeliveryZoneInput } from "../types";

export function DeliveryZonesClient() {
  const t = useTranslations("seller.zones");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<DeliveryZone | "new" | null>(null);

  const zones = useQuery({
    queryKey: queryKeys.seller.deliveryZones,
    queryFn: sellerApi.listZones,
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (id: string) => sellerApi.removeZone(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.deliveryZones });
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (zones.isError) {
    const missing = zones.error instanceof ApiError && zones.error.code === "SELLER_APPLICATION_INCOMPLETE";
    return (
      <p className="text-sm text-muted-foreground">{missing ? t("needsShop") : t("loadError")}</p>
    );
  }

  const items = zones.data ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button
          type="button"
          variant="cta"
          size="sm"
          onClick={() => setEditing("new")}
        >
          {t("add")}
        </Button>
      </div>

      {zones.isLoading ? <Skeleton className="h-24 w-full" /> : null}
      {!zones.isLoading && items.length === 0 && editing === null ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((zone) => (
          <Card key={zone.id}>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{zone.name}</span>
                {zone.isNationwide ? (
                  <Badge variant="secondary">{t("nationwideBadge")}</Badge>
                ) : null}
                <Badge variant="outline">
                  {t("chargeBadge", { amount: formatBdt(zone.charge, locale) })}
                </Badge>
                {zone.freeDeliveryAbove != null ? (
                  <Badge variant="outline">
                    {t("freeBadge", { amount: formatBdt(zone.freeDeliveryAbove, locale) })}
                  </Badge>
                ) : null}
                <Badge variant="outline">
                  {t("etaBadge", { min: zone.estimatedDaysMin, max: zone.estimatedDaysMax })}
                </Badge>
              </div>
              {!zone.isNationwide ? (
                <span className="text-muted-foreground">
                  {zone.districts.length > 0
                    ? zone.districts
                        .map((district) => {
                          const name = locale === "bn" ? district.nameBn : district.name;
                          const scope = district.areaScope;
                          if (!scope || scope === "ALL") return name;
                          return `${name} (${scope === "CITY" ? t("scopeCity") : t("scopeOutside")})`;
                        })
                        .join(", ")
                    : t("noneSelected")}
                </span>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(zone)}
                >
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(zone.id)}
                >
                  {t("remove")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing !== null ? (
        <Card>
          <CardContent>
            <h2 className="mb-4 text-lg font-semibold">
              {editing === "new" ? t("formTitle") : t("editTitle")}
            </h2>
            <ZoneForm
              zone={editing === "new" ? undefined : editing}
              onDone={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ZoneForm({
  zone,
  onDone,
  onCancel,
}: {
  zone?: DeliveryZone;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("seller.zones");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const districts = useQuery({
    queryKey: queryKeys.catalog.districts,
    queryFn: () => apiGet<District[]>("/locations/districts").then((result) => result.data),
    staleTime: 60 * 60 * 1000,
  });

  const [name, setName] = useState(zone?.name ?? "");
  const [nationwide, setNationwide] = useState(zone?.isNationwide ?? false);
  const [districtIds, setDistrictIds] = useState<number[]>(
    zone?.districts.map((district) => district.id) ?? [],
  );
  const [districtScopes, setDistrictScopes] = useState<
    Record<number, "ALL" | "CITY" | "OUTSIDE">
  >(
    Object.fromEntries(
      (zone?.districts ?? []).map((district) => [
        district.id,
        (district.areaScope as "ALL" | "CITY" | "OUTSIDE" | undefined) ?? "ALL",
      ]),
    ),
  );
  const [charge, setCharge] = useState(zone ? String(zone.charge) : "");
  const [freeAbove, setFreeAbove] = useState(
    zone?.freeDeliveryAbove != null ? String(zone.freeDeliveryAbove) : "",
  );
  const [etaMin, setEtaMin] = useState(String(zone?.estimatedDaysMin ?? 1));
  const [etaMax, setEtaMax] = useState(String(zone?.estimatedDaysMax ?? 3));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (input: DeliveryZoneInput) =>
      zone ? sellerApi.updateZone(zone.id, input) : sellerApi.createZone(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.deliveryZones });
      toast.success(zone ? t("saved") : t("created"));
      onDone();
    },
    onError: (mutationError) => toastApiError(mutationError, tErrors),
  });

  const toggleDistrict = (id: number, checked: boolean) => {
    setDistrictIds((current) =>
      checked ? [...current, id] : current.filter((value) => value !== id),
    );
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chargeNumber = Number(charge);
    const min = Number(etaMin);
    const max = Number(etaMax);
    if (!name.trim()) {
      setError(t("validation.zoneName"));
      return;
    }
    if (!nationwide && districtIds.length === 0) {
      setError(t("validation.districtsRequired"));
      return;
    }
    if (charge.trim() === "" || !Number.isFinite(chargeNumber) || chargeNumber < 0) {
      setError(t("validation.charge"));
      return;
    }
    if (
      !Number.isInteger(min) ||
      min < 0 ||
      !Number.isInteger(max) ||
      max < 0 ||
      max < min
    ) {
      setError(t("validation.etaRange"));
      return;
    }
    setError(null);
    save.mutate({
      name: name.trim(),
      isNationwide: nationwide,
      districtIds: nationwide ? [] : districtIds,
      districtAreaScopes: nationwide
        ? []
        : districtIds.map((districtId) => ({
            districtId,
            areaScope: districtScopes[districtId] ?? "ALL",
          })),
      charge: chargeNumber,
      freeDeliveryAbove: freeAbove.trim() === "" ? undefined : Number(freeAbove),
      estimatedDaysMin: min,
      estimatedDaysMax: max,
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="zoneName">{t("name")}</Label>
        <Input
          id="zoneName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch id="zoneNationwide" checked={nationwide} onCheckedChange={setNationwide} />
        <Label htmlFor="zoneNationwide">{t("nationwide")}</Label>
      </div>

      {!nationwide ? (
        <div className="grid gap-1.5">
          <Label>{t("districts")}</Label>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border p-2">
            {(districts.data ?? []).map((district) => {
              const checked = districtIds.includes(district.id);
              return (
                <div
                  key={district.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleDistrict(district.id, value === true)}
                  />
                  <span className="flex-1">
                    {locale === "bn" ? district.nameBn : district.name}
                  </span>
                  {checked ? (
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={districtScopes[district.id] ?? "ALL"}
                      onChange={(event) =>
                        setDistrictScopes((current) => ({
                          ...current,
                          [district.id]: event.target.value as
                            | "ALL"
                            | "CITY"
                            | "OUTSIDE",
                        }))
                      }
                      aria-label={t("areaScope")}
                    >
                      <option value="ALL">{t("scopeAll")}</option>
                      <option value="CITY">{t("scopeCity")}</option>
                      <option value="OUTSIDE">{t("scopeOutside")}</option>
                    </select>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="zoneCharge">{t("charge")}</Label>
          <Input
            id="zoneCharge"
            inputMode="decimal"
            value={charge}
            onChange={(event) => setCharge(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="zoneFreeAbove">{t("freeAbove")}</Label>
          <Input
            id="zoneFreeAbove"
            inputMode="decimal"
            value={freeAbove}
            onChange={(event) => setFreeAbove(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="zoneEtaMin">{t("etaMin")}</Label>
          <Input
            id="zoneEtaMin"
            inputMode="numeric"
            value={etaMin}
            onChange={(event) => setEtaMin(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="zoneEtaMax">{t("etaMax")}</Label>
          <Input
            id="zoneEtaMax"
            inputMode="numeric"
            value={etaMax}
            onChange={(event) => setEtaMax(event.target.value)}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {t("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
