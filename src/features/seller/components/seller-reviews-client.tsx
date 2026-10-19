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
import { StarRating } from "@/features/catalog/components/product-card";
import { ReviewReplies } from "@/features/qa/components/product-engagement";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { sellerApi } from "../api";

export function SellerReviewsClient({ initialPage }: { initialPage: number }) {
  const t = useTranslations("seller.reviews");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const router = useRouter();
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const page = Math.max(1, initialPage);

  const reviews = useQuery({
    queryKey: queryKeys.seller.reviews({ page }),
    queryFn: () => sellerApi.listReviews({ page, limit: 20 }),
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.seller.reviews() });

  const reportMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => sellerApi.reportReview(id, text),
    onSuccess: async () => {
      setReportFor(null);
      setReason("");
      await refresh();
      toast.success(t("reported"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const go = (nextPage: number) => {
    router.push(nextPage > 1 ? `/seller/reviews?page=${nextPage}` : "/seller/reviews");
  };

  const items = reviews.data?.data ?? [];
  const meta = reviews.data?.meta;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>

      {reviews.isLoading ? <Skeleton className="h-32 w-full rounded-2xl" /> : null}
      {reviews.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!reviews.isLoading && !reviews.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((review) => (
          <Card key={review.id} className="rounded-2xl">
            <CardContent className="grid gap-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/products/${review.product.slug}`}
                  className="font-medium hover:underline"
                >
                  {review.product.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatLatinDateTime(review.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating value={review.rating} />
                {review.status === "HIDDEN" ? (
                  <Badge variant="outline">{t("hidden")}</Badge>
                ) : null}
              </div>
              {review.title ? <p className="font-medium">{review.title}</p> : null}
              {review.comment ? <p className="text-muted-foreground">{review.comment}</p> : null}
              {review.images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {review.images.map((image) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={image.id}
                      src={image.url}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ))}
                </div>
              ) : null}
              <ReviewReplies reviewId={review.id} sellerReply={review.sellerReply} />

              {reportFor === review.id ? (
                <div className="grid gap-2 rounded-xl border border-border p-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`reason-${review.id}`}>{t("reportReason")}</Label>
                    <Input
                      id={`reason-${review.id}`}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={reason.trim().length < 3 || reportMutation.isPending}
                      onClick={() => reportMutation.mutate({ id: review.id, text: reason.trim() })}
                    >
                      {t("submitReport")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setReportFor(null)}>
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReason("");
                    setReportFor(review.id);
                  }}
                >
                  {t("report")}
                </Button>
              </div>
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
