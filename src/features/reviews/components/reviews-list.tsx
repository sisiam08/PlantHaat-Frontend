"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { useAuth } from "@/features/auth/auth-provider";
import { StarRating } from "@/features/catalog/components/product-card";
import type { PaginationMeta } from "@/lib/api/common";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { reviewsApi, type ReviewView } from "../api";

interface ReviewsPage {
  data: ReviewView[];
  meta?: PaginationMeta;
}

export function ReviewsList({ slug }: { slug: string }) {
  const t = useTranslations("reviews");
  const { user } = useAuth();
  const queryKey = queryKeys.catalog.productReviews(slug);
  const query = useQuery({
    queryKey,
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
          {reviews.map((review) => {
            const isMine = Boolean(user) && user?.id === review.customer.id;
            return (
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
                  {review.comment ? (
                    <p className="text-muted-foreground">{review.comment}</p>
                  ) : null}
                  {review.sellerReply ? (
                    <p className="rounded-lg bg-muted/50 p-2 text-xs">
                      <span className="font-medium">{t("sellerReplied")}: </span>
                      {review.sellerReply}
                    </p>
                  ) : null}
                  {isMine ? (
                    <div className="flex items-center gap-1 pt-1">
                      <ReviewEditDialog slug={slug} review={review} />
                      <ReviewDeleteButton slug={slug} reviewId={review.id} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewEditDialog({ slug, review }: { slug: string; review: ReviewView }) {
  const t = useTranslations("reviews");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title ?? "");
  const [comment, setComment] = useState(review.comment ?? "");

  const update = useMutation({
    mutationFn: () =>
      reviewsApi.update(review.id, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success(t("updated"));
      setOpen(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.catalog.productReviews(slug),
      });
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil aria-hidden />
          {t("edit")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor={`rating-${review.id}`}>{t("rating")}</Label>
            <select
              id={`rating-${review.id}`}
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {"★".repeat(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`title-${review.id}`}>{t("title")}</Label>
            <Input
              id={`title-${review.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`comment-${review.id}`}>{t("comment")}</Label>
            <Textarea
              id={`comment-${review.id}`}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
            />
          </div>
          <Button variant="cta" disabled={update.isPending} onClick={() => update.mutate()}>
            {t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDeleteButton({ slug, reviewId }: { slug: string; reviewId: string }) {
  const t = useTranslations("reviews");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const queryKey = queryKeys.catalog.productReviews(slug);

  const remove = useMutation({
    mutationFn: () => reviewsApi.remove(reviewId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ReviewsPage>(queryKey);
      queryClient.setQueryData<ReviewsPage>(queryKey, (old) =>
        old ? { ...old, data: old.data.filter((item) => item.id !== reviewId) } : old,
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toastApiError(error, tErrors);
    },
    onSuccess: () => toast.success(t("deleted")),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 aria-hidden />
          {t("delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
