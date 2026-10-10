"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { complaintStatusVariant } from "../status";
import type { ComplaintStatus } from "../types";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const FILTERS: ("ALL" | ComplaintStatus)[] = [
  "ALL",
  "OPEN",
  "SELLER_RESPONDED",
  "UNDER_REVIEW",
  "RESOLVED_REFUND",
  "RESOLVED_REPLACEMENT",
  "REJECTED",
  "CLOSED",
];

export function ComplaintsList({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.complaints");
  const tStatus = useTranslations("admin.complaintStatus");
  const tType = useTranslations("admin.complaintType");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();

  const status = FILTERS.includes(initialStatus as "ALL" | ComplaintStatus)
    ? (initialStatus as "ALL" | ComplaintStatus)
    : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.complaints({ status, page }),
    queryFn: () =>
      adminApi.listComplaints({
        status: status === "ALL" ? undefined : status,
        page,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });

  const go = (nextStatus: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/admin/complaints?${qs}` : "/admin/complaints");
  };

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={status === filter ? "secondary" : "ghost"}
            onClick={() => go(filter, 1)}
          >
            {filter === "ALL" ? tCommon("all") : tStatus(filter)}
          </Button>
        ))}
      </div>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((complaint) => (
          <Card key={complaint.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/complaints/${complaint.id}`}
                    className="font-medium hover:underline"
                  >
                    {complaint.ticketNumber}
                  </Link>
                  <Badge variant={complaintStatusVariant(complaint.status)}>
                    {tStatus(complaint.status)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {tType(complaint.type)} · {complaint.shop?.name ?? "-"} ·{" "}
                  {formatLatinDateTime(complaint.createdAt)}
                </span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/complaints/${complaint.id}`}>{t("view")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? <Pager page={meta.page} totalPages={meta.totalPages} onPage={(p) => go(status, p)} /> : null}
    </div>
  );
}
