"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { sellerApi } from "../api";
import { complaintStatusVariant } from "../status";
import type { ComplaintStatus } from "../types";

const STATUSES: ComplaintStatus[] = [
  "OPEN",
  "SELLER_RESPONDED",
  "UNDER_REVIEW",
  "RESOLVED_REFUND",
  "RESOLVED_REPLACEMENT",
  "REJECTED",
  "CLOSED",
];

export function SellerComplaintsClient({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("seller.complaints");
  const tStatus = useTranslations("seller.complaintStatus");
  const tType = useTranslations("seller.complaintType");
  const router = useRouter();

  const activeStatus = (STATUSES as string[]).includes(initialStatus) ? initialStatus : "ALL";
  const page = Math.max(1, initialPage);

  const complaints = useQuery({
    queryKey: queryKeys.seller.complaints({ status: activeStatus, page }),
    queryFn: () =>
      sellerApi.listComplaints({
        status: activeStatus === "ALL" ? undefined : activeStatus,
        page,
        limit: 20,
      }),
    retry: false,
  });

  const go = (status: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/seller/complaints?${qs}` : "/seller/complaints");
  };

  const items = complaints.data?.data ?? [];
  const meta = complaints.data?.meta;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant={activeStatus === "ALL" ? "secondary" : "ghost"}
          onClick={() => go("ALL", 1)}
        >
          {t("all")}
        </Button>
        {STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={activeStatus === status ? "secondary" : "ghost"}
            onClick={() => go(status, 1)}
          >
            {tStatus(status)}
          </Button>
        ))}
      </div>

      {complaints.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {complaints.isError ? (
        <QueryError message={t("loadError")} onRetry={() => void complaints.refetch()} />
      ) : null}
      {!complaints.isLoading && !complaints.isError && items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : null}

      <div className="grid gap-3">
        {items.map((complaint) => (
          <Card key={complaint.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{complaint.ticketNumber}</span>
                  <Badge variant={complaintStatusVariant(complaint.status)}>
                    {tStatus(complaint.status)}
                  </Badge>
                </div>
                <span className="text-muted-foreground">
                  {tType(complaint.type)} · {formatLatinDateTime(complaint.createdAt)}
                </span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/seller/complaints/${complaint.id}`}>{t("viewDetails")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => go(activeStatus, page - 1)}
          >
            {t("prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pageOf", { page: meta.page, total: meta.totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => go(activeStatus, page + 1)}
          >
            {t("next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
