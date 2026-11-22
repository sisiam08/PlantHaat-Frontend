"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { complaintStatusVariant } from "../status";
import type { AdminComplaintView, ComplaintStatus } from "../types";
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
  initialData,
}: {
  initialStatus: string;
  initialPage: number;
  initialData?: { data: AdminComplaintView[]; meta?: unknown };
}) {
  const t = useTranslations("admin.complaints");
  const tStatus = useTranslations("admin.complaintStatus");
  const tType = useTranslations("admin.complaintType");
  const tf = useTranslations("part4.disputeFilters");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();

  const status = FILTERS.includes(initialStatus as "ALL" | ComplaintStatus)
    ? (initialStatus as "ALL" | ComplaintStatus)
    : "ALL";
  const page = Math.max(1, initialPage);
  const [seller, setSeller] = useState("");
  const [minAgeHours, setMinAgeHours] = useState("");
  const [maxAgeHours, setMaxAgeHours] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [applied, setApplied] = useState(0);
  const filters = {
    seller: seller.trim() || undefined,
    minAgeHours: minAgeHours.trim() ? Number(minAgeHours) : undefined,
    maxAgeHours: maxAgeHours.trim() ? Number(maxAgeHours) : undefined,
    minAmount: minAmount.trim() ? Number(minAmount) : undefined,
    maxAmount: maxAmount.trim() ? Number(maxAmount) : undefined,
  };

  const query = useQuery({
    queryKey: queryKeys.admin.complaints({ status, page, ...filters, applied }),
    queryFn: () =>
      adminApi.listComplaints({
        ...filters,
        status: status === "ALL" ? undefined : status,
        page,
        limit: PAGE_SIZE,
      }),
    initialData: initialData
      ? { data: initialData.data, meta: initialData.meta as never }
      : undefined,
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

      <Card className="rounded-2xl">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="grid gap-1.5 lg:col-span-2">
            <Label htmlFor="dispute-seller">{tf("sellerFilter")}</Label>
            <Input
              id="dispute-seller"
              value={seller}
              onChange={(event) => setSeller(event.target.value)}
              placeholder={tf("sellerPlaceholder")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dispute-min-age">{tf("minAge")}</Label>
            <Input id="dispute-min-age" inputMode="decimal" value={minAgeHours} onChange={(event) => setMinAgeHours(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dispute-max-age">{tf("maxAge")}</Label>
            <Input id="dispute-max-age" inputMode="decimal" value={maxAgeHours} onChange={(event) => setMaxAgeHours(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dispute-min-amount">{tf("minAmount")}</Label>
            <Input id="dispute-min-amount" inputMode="decimal" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dispute-max-amount">{tf("maxAmount")}</Label>
            <Input id="dispute-max-amount" inputMode="decimal" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-6">
            <Button type="button" variant="cta" size="sm" onClick={() => setApplied((value) => value + 1)}>
              {tf("applyFilters")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSeller("");
                setMinAgeHours("");
                setMaxAgeHours("");
                setMinAmount("");
                setMaxAmount("");
                setApplied((value) => value + 1);
              }}
            >
              {tf("resetFilters")}
            </Button>
          </div>
        </CardContent>
      </Card>

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
