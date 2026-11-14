"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { formatDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { Pager } from "./pager";

const STATUSES = ["", "OK", "WATCH", "RESTRICTED", "BLOCKED"] as const;
const PAGE_SIZE = 20;

export function CodRiskClient() {
  const t = useTranslations("admin.codRisk");
  const tStatus = useTranslations("admin.codRiskStatus");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ["admin", "cod-risk", status, q, page],
    queryFn: () =>
      adminApi.listCodRisk({
        ...(status ? { status } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
        page,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "cod-risk"] });

  const setRiskStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) =>
      adminApi.setCodRiskStatus(id, { status: next }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const whitelist = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      adminApi.setCodRiskWhitelist(id, { whitelisted: next }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const rows = list.data?.data ?? [];
  const total = list.data?.meta?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder={t("searchPlaceholder")}
          className="max-w-xs"
        />
        <select
          className="h-10 rounded-full border border-input bg-background px-4 text-sm"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value ? tStatus(value) : t("all")}
            </option>
          ))}
        </select>
      </div>

      <p className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
        {t("unverifiedNote")}
      </p>

      {list.isLoading ? <Skeleton className="h-48 w-full rounded-2xl" /> : null}
      {list.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!list.isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      {rows.length > 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("phone")}</th>
                  <th className="px-3 py-2 text-right">{t("failed")}</th>
                  <th className="px-3 py-2 text-right">{t("delivered")}</th>
                  <th className="px-3 py-2">{t("status")}</th>
                  <th className="px-3 py-2">{t("lastEvent")}</th>
                  <th className="px-3 py-2">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">
                      {row.phoneNormalized}
                      {row.isWhitelisted ? (
                        <Badge variant="outline" className="ml-2">
                          {t("whitelisted")}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.failedCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.deliveredCount}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          row.status === "BLOCKED"
                            ? "destructive"
                            : row.status === "RESTRICTED"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {tStatus(row.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {row.lastEventAt ? formatDateTime(row.lastEventAt, locale) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-9 rounded-full border border-input bg-background px-2 text-xs"
                          value={row.status}
                          disabled={setRiskStatus.isPending}
                          onChange={(event) =>
                            setRiskStatus.mutate({ id: row.id, next: event.target.value })
                          }
                        >
                          {STATUSES.filter(Boolean).map((value) => (
                            <option key={value} value={value}>
                              {tStatus(value)}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={whitelist.isPending}
                          onClick={() => whitelist.mutate({ id: row.id, next: !row.isWhitelisted })}
                        >
                          {row.isWhitelisted ? t("unwhitelist") : t("whitelist")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <Pager page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
