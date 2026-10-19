"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { qaApi, type ContentReportView } from "@/features/qa/api";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { Pager } from "./pager";

const KINDS = ["", "QUESTION", "ANSWER", "REPLY", "REVIEW"] as const;

function ContentPreview({ report }: { report: ContentReportView }) {
  const t = useTranslations("admin.contentReports");
  const target = report.target;
  if (!target) {
    return <p className="text-xs text-muted-foreground">{t("missingTarget")}</p>;
  }
  return (
    <div className="grid gap-1 rounded-xl bg-muted/40 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{t(`kind.${target.kind}`)}</Badge>
        {target.product ? (
          <Link href={`/products/${target.product.slug}`} className="font-medium hover:underline">
            {target.product.name}
          </Link>
        ) : null}
        {target.shopName ? <span className="text-xs text-muted-foreground">{target.shopName}</span> : null}
        {target.rating ? (
          <span className="text-xs text-muted-foreground">{t("rating", { rating: target.rating })}</span>
        ) : null}
      </div>
      {target.title ? <span className="font-medium">{target.title}</span> : null}
      {target.body ? (
        <span className="whitespace-pre-wrap text-muted-foreground">{target.body}</span>
      ) : null}
      {target.authorName ? (
        <span className="text-xs text-muted-foreground">{target.authorName}</span>
      ) : null}
    </div>
  );
}

export function ContentReportsClient({
  initialPage,
  initialStatus,
}: {
  initialPage: number;
  initialStatus: string;
}) {
  const t = useTranslations("admin.contentReports");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(initialStatus);
  const [kind, setKind] = useState<string>("");
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: [...queryKeys.admin.reviewReports(), status, kind, page],
    queryFn: () =>
      qaApi.contentReports({
        page,
        limit: 20,
        ...(status ? { status: status as "OPEN" | "RESOLVED_HIDDEN" | "RESOLVED_KEPT" } : {}),
        ...(kind ? { targetType: kind as "QUESTION" | "ANSWER" | "REPLY" | "REVIEW" } : {}),
      }),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.reviewReports() });

  const resolve = useMutation({
    mutationFn: ({ id, hide }: { id: string; hide: boolean }) => qaApi.resolveContentReport(id, hide),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("resolved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const visibility = useMutation({
    mutationFn: ({ kind: k, id, hide }: { kind: "questions" | "answers" | "replies"; id: string; hide: boolean }) =>
      hide ? qaApi.hideContent(k, id) : qaApi.unhideContent(k, id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  const navigate = (next: { status?: string; kind?: string; page?: number }) => {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const k = next.kind ?? kind;
    const p = next.page ?? 1;
    if (s) params.set("status", s);
    if (k) params.set("targetType", k);
    if (p > 1) params.set("page", String(p));
    router.push(`/admin/content-reports${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t("statusFilter")}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            navigate({ status: event.target.value, page: 1 });
          }}
          className="h-9 rounded-full border border-input bg-background px-3 text-sm"
        >
          <option value="OPEN">{t("status.OPEN")}</option>
          <option value="RESOLVED_HIDDEN">{t("status.RESOLVED_HIDDEN")}</option>
          <option value="RESOLVED_KEPT">{t("status.RESOLVED_KEPT")}</option>
          <option value="">{t("statusAll")}</option>
        </select>
        <select
          aria-label={t("typeFilter")}
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            navigate({ kind: event.target.value, page: 1 });
          }}
          className="h-9 rounded-full border border-input bg-background px-3 text-sm"
        >
          {KINDS.map((value) => (
            <option key={value || "all"} value={value}>
              {value ? t(`kind.${value}`) : t("typeAll")}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((report) => {
          const resolved = report.status !== "OPEN";
          return (
            <Card key={report.id} className={cn("rounded-2xl", resolved && "opacity-70")}>
              <CardContent className="grid gap-3">
                <ContentPreview report={report} />
                <div className="grid gap-1 text-xs text-muted-foreground">
                  <span>
                    {t("reason")}: {report.reason}
                  </span>
                  <span>
                    {t("reporter")}: {report.reporterId} · {formatLatinDateTime(report.createdAt)}
                  </span>
                  <span>
                    {t("statusLabel")}: {t(`status.${report.status}`)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!resolved ? (
                    <>
                      <Button
                        variant="cta"
                        size="sm"
                        disabled={resolve.isPending}
                        onClick={() => {
                          if (!window.confirm(t("confirmHide"))) return;
                          resolve.mutate({ id: report.id, hide: true });
                        }}
                      >
                        {t("hide")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resolve.isPending}
                        onClick={() => resolve.mutate({ id: report.id, hide: false })}
                      >
                        {t("keep")}
                      </Button>
                    </>
                  ) : null}
                  {report.targetType !== "REVIEW" && report.target ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={visibility.isPending}
                      onClick={() =>
                        visibility.mutate({
                          kind:
                            report.targetType === "QUESTION"
                              ? "questions"
                              : report.targetType === "ANSWER"
                                ? "answers"
                                : "replies",
                          id: report.targetId,
                          hide: true,
                        })
                      }
                    >
                      {t("hideContent")}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {meta ? (
        <Pager
          page={meta.page}
          totalPages={meta.totalPages}
          onPage={(p) => navigate({ page: p })}
        />
      ) : null}
    </div>
  );
}
