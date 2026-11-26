"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import type { AdminOverrideInput } from "../types";

const SOURCES = ["", "LIVE", "IMPORTED", "ADMIN"] as const;

export function DeliveryRatesClient() {
  const t = useTranslations("admin.deliveryRates");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [source, setSource] = useState<string>("");
  const [staleOnly, setStaleOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [override, setOverride] = useState<AdminOverrideInput>({
    fromSteadfastId: 1,
    toSteadfastId: 1,
    weightStep: 0.5,
    charge: 0,
    available: true,
    lane: "",
  });
  const [csv, setCsv] = useState("");
  const [importErrors, setImportErrors] = useState<{ line: number; error: string }[]>([]);
  const [shopId, setShopId] = useState("");

  const health = useQuery({
    queryKey: ["admin", "delivery-rates", "health"],
    queryFn: adminApi.deliveryHealth,
    refetchInterval: 30_000,
  });
  const cache = useQuery({
    queryKey: ["admin", "delivery-rates", "cache", from, to, source, staleOnly, page],
    queryFn: () =>
      adminApi.deliveryCache({
        ...(from ? { from: Number(from) } : {}),
        ...(to ? { to: Number(to) } : {}),
        ...(source ? { source } : {}),
        ...(staleOnly ? { stale: true } : {}),
        page,
        limit: 20,
      }),
  });
  const mapping = useQuery({
    queryKey: ["admin", "delivery-rates", "mapping"],
    queryFn: adminApi.deliveryMapping,
  });
  const thanas = useQuery({
    queryKey: ["admin", "delivery-rates", "thanas"],
    queryFn: () => adminApi.deliveryThanas(),
  });
  const overrides = useQuery({
    queryKey: ["admin", "delivery-rates", "overrides"],
    queryFn: adminApi.deliveryOverrides,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "delivery-rates"] });

  const saveOverride = useMutation({
    mutationFn: () => adminApi.upsertDeliveryOverride(override),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("overrideSaved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });
  const removeOverride = useMutation({
    mutationFn: (id: string) => adminApi.deleteDeliveryOverride(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("overrideDeleted"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });
  const updateMapping = useMutation({
    mutationFn: ({
      districtId,
      locationId,
    }: {
      districtId: number;
      locationId: number | null;
    }) => adminApi.updateDeliveryMapping(districtId, locationId),
    onSuccess: async () => {
      await mapping.refetch();
      toast.success(t("mappingSaved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });
  const updateThana = useMutation({
    mutationFn: ({
      id,
      zone,
      selectableByCustomer,
    }: {
      id: string;
      zone: "CITY" | "SUBURBAN";
      selectableByCustomer?: boolean;
    }) =>
      adminApi.updateDeliveryThana(id, {
        dhakaZone: zone,
        ...(selectableByCustomer !== undefined ? { selectableByCustomer } : {}),
      }),
    onSuccess: async () => {
      await thanas.refetch();
      toast.success(t("zoneSaved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });
  const runImport = useMutation({
    mutationFn: (dryRun: boolean) => adminApi.importDeliveryOverrides(csv, dryRun),
    onSuccess: async (result) => {
      setImportErrors(result.errors);
      if (result.dryRun) {
        toast.success(t("dryRunResult", { count: result.valid ?? 0 }));
      } else {
        await invalidate();
        toast.success(t("imported", { count: result.imported ?? 0 }));
      }
    },
    onError: (error) => toastApiError(error, tErrors),
  });
  const warmUp = useMutation({
    mutationFn: () => adminApi.warmUpDeliveryPickup(shopId.trim()),
    onSuccess: (result) => {
      toast.success(
        result.liveEnabled
          ? t("warmUpQueued", { count: result.queued })
          : t("warmUpLiveOff"),
      );
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const download = async () => {
    const value = await adminApi.exportDeliveryOverrides();
    const blob = new Blob([value], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "courier-overrides.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const h = health.data;
  const rows = cache.data?.data ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((cache.data?.meta?.total ?? rows.length) / 20),
  );

  return (
    <div className="grid gap-6">
      <Card className="rounded-2xl">
        <CardHeader className="gap-1">
          <CardTitle>{t("healthTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("healthHint")}</p>
        </CardHeader>
        <CardContent>
          {health.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : h ? (
            <>
              {!h.liveEnabled && h.fallbackInside <= 0 && h.fallbackOutside <= 0 ? (
                <p className="mb-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                  {t("noRateSource", {
                    cache: h.cached + h.stale,
                    overrides: h.overrides,
                  })}
                </p>
              ) : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label={t("liveSwitch")}
                value={h.liveEnabled ? t("on") : t("off")}
                tone={h.liveEnabled ? "warn" : "ok"}
              />
              <Metric
                label={t("circuit")}
                value={h.circuitState}
                tone={h.circuitState === "OPEN" ? "bad" : "ok"}
              />
              <Metric label={t("requestsToday")} value={String(h.requestsToday)} />
              <Metric
                label={t("cache")}
                value={t("cacheCounts", {
                  fresh: h.cached,
                  stale: h.stale,
                  overrides: h.overrides,
                })}
              />
              <div className="text-xs text-muted-foreground sm:col-span-2">
                {t("lastSuccess")}:{" "}
                {h.lastSuccessAt ? formatLatinDateTime(h.lastSuccessAt, locale) : t("never")}
              </div>
              <div className="text-xs text-muted-foreground sm:col-span-2">
                {t("lastError")}: {h.lastError ?? t("none")}
              </div>
              {h.cooldownUntil ? (
                <p className="text-xs text-warning-foreground sm:col-span-4">
                  {t("cooldown", {
                    until: formatLatinDateTime(h.cooldownUntil, locale),
                  })}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground sm:col-span-4">
                {t("fallbacks", {
                  inside: h.fallbackInside > 0 ? h.fallbackInside : t("unset"),
                  outside: h.fallbackOutside > 0 ? h.fallbackOutside : t("unset"),
                })}
              </p>
            </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("loadError")}</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="gap-1">
          <CardTitle>{t("cacheTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("cacheHint")}</p>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <Label htmlFor="cache-from">{t("from")}</Label>
              <Input
                id="cache-from"
                className="w-24"
                inputMode="numeric"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cache-to">{t("to")}</Label>
              <Input
                id="cache-to"
                className="w-24"
                inputMode="numeric"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cache-source">{t("source")}</Label>
              <select
                id="cache-source"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                value={source}
                onChange={(event) => {
                  setSource(event.target.value);
                  setPage(1);
                }}
              >
                {SOURCES.map((value) => (
                  <option key={value} value={value}>
                    {value || t("all")}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={staleOnly}
                onChange={(event) => {
                  setStaleOnly(event.target.checked);
                  setPage(1);
                }}
              />
              {t("staleOnly")}
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void cache.refetch()}
            >
              <RefreshCw aria-hidden className="size-4" />
              {t("refresh")}
            </Button>
          </div>

          {cache.isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("from")}</th>
                    <th className="px-3 py-2">{t("to")}</th>
                    <th className="px-3 py-2 text-right">{t("weight")}</th>
                    <th className="px-3 py-2 text-right">{t("charge")}</th>
                    <th className="px-3 py-2">{t("source")}</th>
                    <th className="px-3 py-2">{t("fetched")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="px-3 py-2">
                        {row.fromSteadfastId} {row.fromName ? `· ${row.fromName}` : ""}
                      </td>
                      <td className="px-3 py-2">
                        {row.toSteadfastId} {row.toName ? `· ${row.toName}` : ""}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.weightStep}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.charge ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={row.isOverride ? "default" : "outline"}>
                            {row.isOverride ? t("override") : row.source}
                          </Badge>
                          {row.stale ? <Badge variant="secondary">{t("stale")}</Badge> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {formatLatinDateTime(row.fetchedAt, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {!cache.isLoading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : null}
          <div className="flex items-center justify-between text-sm">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              {t("previous")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("pageOf", { page, total: totalPages })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="gap-1">
          <CardTitle>{t("overrideTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("overrideHint")}</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <NumberField
              label={t("from")}
              value={override.fromSteadfastId}
              onChange={(value) => setOverride((prev) => ({ ...prev, fromSteadfastId: value }))}
            />
            <NumberField
              label={t("to")}
              value={override.toSteadfastId}
              onChange={(value) => setOverride((prev) => ({ ...prev, toSteadfastId: value }))}
            />
            <NumberField
              label={t("weight")}
              step={0.5}
              value={override.weightStep}
              onChange={(value) => setOverride((prev) => ({ ...prev, weightStep: value }))}
            />
            <NumberField
              label={t("charge")}
              value={override.charge}
              onChange={(value) => setOverride((prev) => ({ ...prev, charge: value }))}
            />
            <div className="grid gap-1">
              <Label htmlFor="override-lane">{t("lane")}</Label>
              <Input
                id="override-lane"
                value={override.lane ?? ""}
                onChange={(event) =>
                  setOverride((prev) => ({ ...prev, lane: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={override.available ?? true}
                onChange={(event) =>
                  setOverride((prev) => ({ ...prev, available: event.target.checked }))
                }
              />
              {t("available")}
            </label>
            <Button
              type="button"
              variant="cta"
              disabled={saveOverride.isPending}
              onClick={() => saveOverride.mutate()}
            >
              {t("saveOverride")}
            </Button>
          </div>

          {overrides.data && overrides.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{t("from")}</th>
                    <th className="px-3 py-2">{t("to")}</th>
                    <th className="px-3 py-2 text-right">{t("weight")}</th>
                    <th className="px-3 py-2 text-right">{t("charge")}</th>
                    <th className="px-3 py-2">{t("lane")}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {overrides.data.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="px-3 py-2">{row.fromSteadfastId}</td>
                      <td className="px-3 py-2">{row.toSteadfastId}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.weightStep}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.charge}</td>
                      <td className="px-3 py-2">{row.lane ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={removeOverride.isPending}
                          onClick={() => removeOverride.mutate(row.id)}
                        >
                          {t("delete")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="override-csv">{t("csvTitle")}</Label>
            <textarea
              id="override-csv"
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              rows={4}
              placeholder="from,to,weightStep,charge,available,lane"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void download()}>
                <Download aria-hidden className="size-4" />
                {t("export")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!csv.trim() || runImport.isPending}
                onClick={() => runImport.mutate(true)}
              >
                {t("dryRun")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!csv.trim() || runImport.isPending}
                onClick={() => runImport.mutate(false)}
              >
                <Upload aria-hidden className="size-4" />
                {t("applyImport")}
              </Button>
            </div>
            {importErrors.length > 0 ? (
              <ul className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {importErrors.map((error) => (
                  <li key={`${error.line}-${error.error}`}>
                    {t("lineError", { line: error.line, error: error.error })}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="gap-1">
          <CardTitle>{t("thanaTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("thanaHint")}</p>
        </CardHeader>
        <CardContent>
          {thanas.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="sticky top-0 bg-secondary/80 text-left text-xs text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-3 py-2">{t("thanaId")}</th>
                    <th className="px-3 py-2">{t("thana")}</th>
                    <th className="px-3 py-2">{t("zone")}</th>
                    <th className="px-3 py-2">{t("selectable")}</th>
                    <th className="px-3 py-2">{t("classification")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(thanas.data ?? []).map((thana) => (
                    <tr
                      key={thana.id}
                      className={
                        thana.selectableByCustomer
                          ? "border-t border-border/60"
                          : "border-t border-warning/40 bg-warning/5"
                      }
                    >
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {thana.steadfastPoliceStationId ?? "-"}
                      </td>
                      <td className="px-3 py-2">{thana.name}</td>
                      <td className="px-3 py-2">
                        <select
                          className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                          value={thana.dhakaZone ?? "CITY"}
                          disabled={updateThana.isPending}
                          onChange={(event) =>
                            updateThana.mutate({
                              id: thana.id,
                              zone: event.target.value as "CITY" | "SUBURBAN",
                            })
                          }
                        >
                          <option value="CITY">{t("city")}</option>
                          <option value="SUBURBAN">{t("suburban")}</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={thana.selectableByCustomer}
                            disabled={updateThana.isPending}
                            onChange={(event) =>
                              updateThana.mutate({
                                id: thana.id,
                                zone: thana.dhakaZone ?? "CITY",
                                selectableByCustomer: event.target.checked,
                              })
                            }
                          />
                          {thana.selectableByCustomer ? t("yes") : t("no")}
                        </label>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {thana.classificationSource === "DEFAULT_UNVERIFIED" ? (
                          <Badge variant="secondary">{t("defaultUnverified")}</Badge>
                        ) : (
                          t("adminVerified")
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="gap-1">
          <CardTitle>{t("mappingTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("mappingHint")}</p>
        </CardHeader>
        <CardContent>
          {mapping.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : mapping.data ? (
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="sticky top-0 bg-secondary/80 text-left text-xs text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-3 py-2">{t("district")}</th>
                    <th className="px-3 py-2">{t("steadfastLocation")}</th>
                    <th className="px-3 py-2">{t("thanas")}</th>
                  </tr>
                </thead>
                <tbody>
                  {mapping.data.districts.map((district) => (
                    <tr
                      key={district.id}
                      className={
                        district.mapped
                          ? "border-t border-border/60"
                          : "border-t border-warning/40 bg-warning/5"
                      }
                    >
                      <td className="px-3 py-2">
                        {district.name}
                        {district.isDhaka ? (
                          <Badge variant="outline" className="ml-2">
                            {t("dhakaSpecial")}
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {district.isDhaka ? (
                          <span className="text-xs text-muted-foreground">
                            {t("dhakaMappingNote")}
                          </span>
                        ) : (
                          <select
                            className="h-9 max-w-[260px] rounded-lg border border-input bg-background px-2 text-sm"
                            value={district.steadfastLocationId ?? ""}
                            disabled={updateMapping.isPending}
                            onChange={(event) =>
                              updateMapping.mutate({
                                districtId: district.id,
                                locationId: event.target.value
                                  ? Number(event.target.value)
                                  : null,
                              })
                            }
                          >
                            <option value="">{t("unmapped")}</option>
                            {mapping.data.locations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.id} · {location.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {district.thanaCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("loadError")}</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="gap-1">
          <CardTitle>{t("warmUpTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("warmUpHint")}</p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="warmup-shop">{t("shopId")}</Label>
            <Input
              id="warmup-shop"
              className="w-72"
              value={shopId}
              onChange={(event) => setShopId(event.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!shopId.trim() || warmUp.isPending}
            onClick={() => warmUp.mutate()}
          >
            {t("warmUp")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <div className="grid gap-0.5 rounded-xl border border-border/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={
          tone === "bad"
            ? "font-medium text-destructive"
            : tone === "warn"
              ? "font-medium text-warning-foreground"
              : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-label={label}
        inputMode={step ? "decimal" : "numeric"}
        step={step}
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}




