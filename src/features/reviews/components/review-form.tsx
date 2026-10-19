"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { reviewsApi } from "../api";
import { MultiImageUpload } from "./image-upload";

export function ReviewForm({
  orderItemId,
  productName,
}: {
  orderItemId: string;
  productName: string;
}) {
  const t = useTranslations("reviews");
  const tErrors = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: () =>
      reviewsApi.create(orderItemId, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        images: images.length > 0 ? images : undefined,
      }),
    onSuccess: () => {
      toast.success(t("submitted"));
      setOpen(false);
      setTitle("");
      setComment("");
      setImages([]);
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t("writeReview")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="rating">{t("rating")}</Label>
            <select
              id="rating"
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
            <Label htmlFor="review-title">{t("title")}</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="comment">{t("comment")}</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("photos")}</Label>
            <MultiImageUpload value={images} onChange={setImages} />
          </div>
          <Button variant="cta" disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? t("submitting") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
