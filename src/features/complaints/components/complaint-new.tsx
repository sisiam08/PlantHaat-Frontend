"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { uploadsApi } from "@/features/uploads/api";
import { complaintsApi, type ComplaintType } from "../api";

const TYPES: ComplaintType[] = [
  "DAMAGED_PLANT",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NOT_DELIVERED",
  "LATE_DELIVERY",
  "OTHER",
];

const ATTACHMENT_REQUIRED_TYPES = new Set<ComplaintType>(["DAMAGED_PLANT", "NOT_AS_DESCRIBED"]);
const MAX_ATTACHMENTS = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function ComplaintNew({ shopOrderId }: { shopOrderId: string }) {
  const t = useTranslations("complaints");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [attachments, setAttachments] = useState<{ url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const schema = z.object({
    type: z.string().min(1, t("validation.type")),
    description: z.string().min(10, t("validation.description")),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: "", description: "" },
  });

  const selectedType = useWatch({ control: form.control, name: "type" });
  const requiresAttachment = ATTACHMENT_REQUIRED_TYPES.has(selectedType as ComplaintType);

  const create = useMutation({
    mutationFn: (values: Values) =>
      complaintsApi.create({
        shopOrderId,
        type: values.type as ComplaintType,
        description: values.description,
        attachments: attachments.map((attachment) => attachment.url),
      }),
    onSuccess: (complaint) => {
      toast.success(t("submitted"));
      router.replace(`/complaints/${complaint.id}`);
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    setAttachmentError(null);
    setUploading(true);
    try {
      const remaining = MAX_ATTACHMENTS - attachments.length;
      const selected = Array.from(files).slice(0, Math.max(0, remaining));
      for (const file of selected) {
        if (!file.type.startsWith("image/")) {
          toast.error(t("uploadInvalid"));
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          toast.error(t("uploadTooLarge"));
          continue;
        }
        const stored = await uploadsApi.image(file, "complaint");
        setAttachments((previous) =>
          previous.length < MAX_ATTACHMENTS ? [...previous, { url: stored.url }] : previous,
        );
      }
    } catch (error) {
      toastApiError(error, tErrors);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (requiresAttachment && attachments.length === 0) {
      setAttachmentError(t("attachmentsRequired"));
      return;
    }
    setAttachmentError(null);
    create.mutate(values);
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="type">{t("type")}</Label>
        <select
          id="type"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          {...form.register("type")}
        >
          <option value="">{t("selectType")}</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </select>
        {form.formState.errors.type ? (
          <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea id="description" rows={5} {...form.register("description")} />
        {form.formState.errors.description ? (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="attachments">
          {t("attachments")}
          {requiresAttachment ? <span className="text-destructive"> *</span> : null}
        </Label>
        <p className="text-xs text-muted-foreground">{t("attachmentsHint")}</p>

        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.url}
                className="relative size-20 overflow-hidden rounded-xl border border-border/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  aria-label={t("removePhoto")}
                  className="absolute top-1 right-1"
                  onClick={() =>
                    setAttachments((previous) =>
                      previous.filter((item) => item.url !== attachment.url),
                    )
                  }
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <input
          id="attachments"
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => void onFiles(event.target.files)}
        />
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {uploading ? t("uploading") : t("addPhoto")}
          </Button>
        </div>

        {attachmentError ? (
          <p className="text-sm text-destructive">{attachmentError}</p>
        ) : null}
      </div>

      <Button type="submit" variant="cta" disabled={create.isPending || uploading}>
        {t("submit")}
      </Button>
    </form>
  );
}
