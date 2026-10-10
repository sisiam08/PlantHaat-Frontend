"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { reviewStatusVariant } from "../status";
import { Pager } from "./pager";

export function ReviewReportsClient({ initialPage }: { initialPage: number }) {
  const t = useTranslations("admin.reviewReports");
  const tReview = useTranslations("admin.reviewStatus");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const queryClient = useQueryClient();
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.reviewReports({ page }),
    queryFn: () => adminApi.listReviewReports({ page, limit: 20 }),
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.reviewReports() });

  const resolve = useMutation({
    mutationFn: ({ id, hide }: { id: string; hide: boolean }) =>
      adminApi.resolveReviewReport(id, hide),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("resolved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const visibility = useMutation({
    mutationFn: ({ id, hide }: { id: string; hide: boolean }) =>
      hide ? adminApi.hideReview(id) : adminApi.unhideReview(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((report) => (
          <Card key={report.id} className="rounded-2xl">
            <CardContent className="grid gap-3">
              <div className="grid gap-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{report.review.shop.name}</span>
                  <Badge variant={reviewStatusVariant(report.review.status)}>
                    {tReview(report.review.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t("rating", { rating: report.review.rating })}
                  </span>
                </div>
                {report.review.title ? (
                  <span className="font-medium">{report.review.title}</span>
                ) : null}
                {report.review.comment ? (
                  <span className="whitespace-pre-wrap text-muted-foreground">
                    {report.review.comment}
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {t("reportReason")}: {report.reason} · {formatLatinDateTime(report.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="cta"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: report.id, hide: true })}
                >
                  {t("hideReview")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: report.id, hide: false })}
                >
                  {t("keepReview")}
                </Button>
                {report.review.status === "HIDDEN" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={visibility.isPending}
                    onClick={() => visibility.mutate({ id: report.review.id, hide: false })}
                  >
                    {t("unhide")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={visibility.isPending}
                    onClick={() => visibility.mutate({ id: report.review.id, hide: true })}
                  >
                    {t("hide")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? (
        <Pager
          page={meta.page}
          totalPages={meta.totalPages}
          onPage={(p) => router.push(p > 1 ? `/admin/review-reports?page=${p}` : "/admin/review-reports")}
        />
      ) : null}
    </div>
  );
}
