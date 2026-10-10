"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { complaintsApi } from "../api";

export function ComplaintsClient() {
  const t = useTranslations("complaints");
  const query = useQuery({
    queryKey: queryKeys.complaints(),
    queryFn: () => complaintsApi.list(),
  });

  if (query.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const items = query.data?.data ?? [];
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="grid gap-3">
      {items.map((complaint) => (
        <Card key={complaint.id}>
          <CardContent className="flex items-start justify-between gap-4 text-sm">
            <div className="grid gap-1">
              <span className="font-medium">{t(`types.${complaint.type}`)}</span>
              <span className="text-muted-foreground">
                {complaint.shop?.name} · {formatLatinDateTime(complaint.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{t(`status.${complaint.status}`)}</Badge>
              <Button asChild variant="outline" size="sm">
                <Link href={`/complaints/${complaint.id}`}>{t("viewDetails")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
