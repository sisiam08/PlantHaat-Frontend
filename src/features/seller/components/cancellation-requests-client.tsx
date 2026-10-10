"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { sellerApi } from "../api";
import { cancellationStatusVariant } from "../status";

export function CancellationRequestsClient({ initialPage }: { initialPage: number }) {
  const t = useTranslations("seller.cancellations");
  const tStatus = useTranslations("seller.cancellationStatus");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const router = useRouter();
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const page = Math.max(1, initialPage);

  const requests = useQuery({
    queryKey: queryKeys.seller.cancellationRequests,
    queryFn: () => sellerApi.listCancellationRequests({ page, limit: 20 }),
    retry: false,
  });

  const respond = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      sellerApi.respondCancellation(id, { approve, note: note.trim() || undefined }),
    onSuccess: async () => {
      setNoteFor(null);
      setNote("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.seller.cancellationRequests,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.orders() });
      toast.success(t("responded"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const go = (nextPage: number) => {
    router.push(nextPage > 1 ? `/seller/cancellation-requests?page=${nextPage}` : "/seller/cancellation-requests");
  };

  const items = requests.data?.data ?? [];
  const meta = requests.data?.meta;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>

      {requests.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {requests.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!requests.isLoading && !requests.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((request) => (
          <Card key={request.id} className="rounded-2xl">
            <CardContent className="grid gap-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{request.shopOrder.shopOrderNumber}</span>
                  <Badge variant={cancellationStatusVariant(request.status)}>
                    {tStatus(request.status)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatLatinDateTime(request.createdAt)}
                </span>
              </div>
              <p className="text-muted-foreground">
                {t("reason")}: {request.reason}
              </p>
              {request.responseNote ? (
                <p className="text-muted-foreground">
                  {t("response")}: {request.responseNote}
                </p>
              ) : null}
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link href={`/seller/orders/${request.shopOrderId}`}>{t("viewOrder")}</Link>
              </Button>

              {request.status === "PENDING" ? (
                noteFor === request.id ? (
                  <div className="grid gap-2 rounded-xl border border-border p-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor={`note-${request.id}`}>{t("note")}</Label>
                      <Input
                        id={`note-${request.id}`}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="cta"
                        disabled={respond.isPending}
                        onClick={() => respond.mutate({ id: request.id, approve: true })}
                      >
                        {t("approve")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={respond.isPending}
                        onClick={() => respond.mutate({ id: request.id, approve: false })}
                      >
                        {t("reject")}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setNoteFor(null)}>
                        {t("cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="cta"
                    size="sm"
                    className="w-fit"
                    onClick={() => {
                      setNote("");
                      setNoteFor(request.id);
                    }}
                  >
                    {t("respond")}
                  </Button>
                )
              ) : null}
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
            onClick={() => go(page - 1)}
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
            onClick={() => go(page + 1)}
          >
            {t("next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
