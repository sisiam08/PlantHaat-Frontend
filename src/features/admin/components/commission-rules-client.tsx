"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
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
import { formatCount } from "@/lib/format/number";
import { adminApi } from "../api";
import type { CommissionScope } from "../types";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const SCOPES: ("ALL" | CommissionScope)[] = ["ALL", "GLOBAL", "CATEGORY", "SELLER"];

export function CommissionRulesClient({
  initialScope,
  initialPage,
}: {
  initialScope: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.commissionRules");
  const tScope = useTranslations("admin.commissionScope");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [scope, setScope] = useState<CommissionScope>("GLOBAL");
  const [categoryId, setCategoryId] = useState("");
  const [sellerProfileId, setSellerProfileId] = useState("");
  const [ratePercent, setRatePercent] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editFor, setEditFor] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");

  const activeScope = SCOPES.includes(initialScope as "ALL" | CommissionScope)
    ? (initialScope as "ALL" | CommissionScope)
    : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.commissionRules({ scope: activeScope, page }),
    queryFn: () =>
      adminApi.listCommissionRules({
        scope: activeScope === "ALL" ? undefined : activeScope,
        page,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });
  const effective = useQuery({
    queryKey: ["admin", "commission-rules", "effective"],
    queryFn: adminApi.getEffectiveCommission,
    retry: false,
  });

  const go = (nextScope: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextScope !== "ALL") params.set("scope", nextScope);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/admin/commission-rules?${qs}` : "/admin/commission-rules");
  };

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.commissionRules() }),
      queryClient.invalidateQueries({ queryKey: ["admin", "commission-rules", "effective"] }),
    ]);

  const create = useMutation({
    mutationFn: () =>
      adminApi.createCommissionRule({
        scope,
        categoryId: scope === "CATEGORY" ? categoryId.trim() : undefined,
        sellerProfileId: scope === "SELLER" ? sellerProfileId.trim() : undefined,
        ratePercent: Number(ratePercent),
        effectiveFrom: effectiveFrom || undefined,
        isActive,
      }),
    onSuccess: async () => {
      setRatePercent("");
      setCategoryId("");
      setSellerProfileId("");
      setEffectiveFrom("");
      setIsActive(true);
      await invalidate();
      toast.success(t("created"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const update = useMutation({
    mutationFn: (id: string) => adminApi.updateCommissionRule(id, { ratePercent: Number(editRate) }),
    onSuccess: async () => {
      setEditFor(null);
      setEditRate("");
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.removeCommissionRule(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-1">
        {SCOPES.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={activeScope === filter ? "secondary" : "ghost"}
            onClick={() => go(filter, 1)}
          >
            {filter === "ALL" ? tCommon("all") : tScope(filter)}
          </Button>
        ))}
      </div>

      <Card data-effective-commission className="rounded-2xl">
        <CardContent className="grid gap-1 text-sm">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="font-medium">{t("effectiveDefault")}</span>
            <strong className="text-lg" data-effective-value>
              {formatCount(effective.data?.effectivePercent ?? 0, locale)}%
            </strong>
          </p>
          <p className="text-xs text-muted-foreground">
            {effective.data?.source === "GLOBAL_RULE"
              ? t("effectiveFromRule")
              : t("effectiveFromSetting", {
                  value: formatCount(effective.data?.settingPercent ?? 0, locale),
                })}
          </p>
          <Link
            href="/admin/settings"
            className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-primary hover:underline"
          >
            {t("settingsFallback")}
          </Link>
        </CardContent>
      </Card>

      {query.isLoading ? <Skeleton className="h-20 w-full" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((rule) => (
          <Card key={rule.id} className="rounded-2xl">
            <CardContent className="grid gap-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{tScope(rule.scope)}</Badge>
                    <span className="font-medium">
                      {Number(rule.ratePercent).toFixed(2)}%
                    </span>
                    <Badge variant={rule.isActive ? "default" : "outline"}>
                      {rule.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {rule.category?.name ?? rule.sellerProfile?.businessName ?? "-"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditRate(String(rule.ratePercent));
                      setEditFor(rule.id);
                    }}
                  >
                    {tCommon("edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(t("removeConfirm"))) remove.mutate(rule.id);
                    }}
                  >
                    {t("remove")}
                  </Button>
                </div>
              </div>
              {editFor === rule.id ? (
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`rate-${rule.id}`}>{t("ratePercent")}</Label>
                    <Input
                      id={`rate-${rule.id}`}
                      inputMode="decimal"
                      value={editRate}
                      onChange={(event) => setEditRate(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="cta"
                    disabled={update.isPending || editRate.trim() === ""}
                    onClick={() => update.mutate(rule.id)}
                  >
                    {tCommon("save")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditFor(null)}>
                    {tCommon("cancel")}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? (
        <Pager page={meta.page} totalPages={meta.totalPages} onPage={(p) => go(activeScope, p)} />
      ) : null}

      <Card className="rounded-2xl">
        <CardContent>
          <h2 className="mb-4 text-lg font-semibold">{t("add")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="scope">{t("scope")}</Label>
              <select
                id="scope"
                className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                value={scope}
                onChange={(event) => setScope(event.target.value as CommissionScope)}
              >
                {(["GLOBAL", "CATEGORY", "SELLER"] as CommissionScope[]).map((value) => (
                  <option key={value} value={value}>
                    {tScope(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ratePercent">{t("ratePercent")}</Label>
              <Input
                id="ratePercent"
                inputMode="decimal"
                value={ratePercent}
                onChange={(event) => setRatePercent(event.target.value)}
              />
            </div>
            {scope === "CATEGORY" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="categoryId">{t("categoryId")}</Label>
                <Input
                  id="categoryId"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                />
              </div>
            ) : null}
            {scope === "SELLER" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="sellerProfileId">{t("sellerProfileId")}</Label>
                <Input
                  id="sellerProfileId"
                  value={sellerProfileId}
                  onChange={(event) => setSellerProfileId(event.target.value)}
                />
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="effectiveFrom">{t("effectiveFrom")}</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ruleActive"
                checked={isActive}
                onCheckedChange={(value) => setIsActive(value === true)}
              />
              <Label htmlFor="ruleActive">{t("active")}</Label>
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="cta"
                disabled={
                  create.isPending ||
                  !(Number(ratePercent) >= 0) ||
                  ratePercent.trim() === "" ||
                  (scope === "CATEGORY" && categoryId.trim() === "") ||
                  (scope === "SELLER" && sellerProfileId.trim() === "")
                }
                onClick={() => create.mutate()}
              >
                {tCommon("save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
