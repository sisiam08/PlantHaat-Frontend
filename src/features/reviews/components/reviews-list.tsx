"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/features/catalog/components/product-card";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { reviewsApi } from "../api";

export function ReviewsList({ slug }: { slug: string }) {
  const t = useTranslations("reviews");
  const query = useQuery({
    queryKey: queryKeys.catalog.productReviews(slug),
    queryFn: () => reviewsApi.forProduct(slug),
  });

  if (query.isLoading) {
    return <Skeleton className="h-24 w-full rounded-2xl" />;
  }

  const reviews = query.data?.data ?? [];

  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {reviews.map((review) => (
            <Card key={review.id} className="rounded-2xl">
              <CardContent className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{review.customer.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatLatinDateTime(review.createdAt)}
                  </span>
                </div>
                <StarRating value={review.rating} />
                {review.title ? <p className="font-medium">{review.title}</p> : null}
                {review.comment ? <p className="text-muted-foreground">{review.comment}</p> : null}
                {review.sellerReply ? (
                  <p className="rounded-lg bg-muted/50 p-2 text-xs">
                    <span className="font-medium">{t("sellerReplied")}: </span>
                    {review.sellerReply}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
