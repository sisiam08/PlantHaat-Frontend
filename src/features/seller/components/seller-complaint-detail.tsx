"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { uploadsApi } from "@/features/uploads/api";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { sellerApi } from "../api";
import { complaintStatusVariant } from "../status";

export function SellerComplaintDetail({ id }: { id: string }) {
  const t = useTranslations("seller.complaints");
  const tp4 = useTranslations("part4.sellerComplaint");
  const tStatus = useTranslations("seller.complaintStatus");
  const tType = useTranslations("seller.complaintType");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.seller.complaints({ id }),
    queryFn: () => sellerApi.getComplaint(id),
    retry: false,
  });

  const comment = useMutation({
    mutationFn: () => sellerApi.commentComplaint(id, body.trim(), attachments),
    onSuccess: async () => {
      setBody("");
      setAttachments([]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.complaints() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.complaints({ id }) });
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (query.isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const complaint = query.data as typeof query.data & {
    sellerResponseDueAt?: string | null;
    sellerRespondedAt?: string | null;
    decision?: string;
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        title={complaint.ticketNumber}
        description={`${tType(complaint.type)} · ${formatLatinDateTime(complaint.createdAt)}`}
        back={
          <Link
            href="/seller/complaints"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
          >
            {t("backToComplaints")}
          </Link>
        }
        actions={
          <Badge variant={complaintStatusVariant(complaint.status)}>
            {tStatus(complaint.status)}
          </Badge>
        }
      />

      <Card className="rounded-2xl">
        <CardContent className="grid gap-2 text-sm">
          <p className="whitespace-pre-wrap">{complaint.description}</p>
          {complaint.sellerResponseDueAt ? (
            <p className="text-xs text-muted-foreground">
              {complaint.sellerRespondedAt
                ? tp4("respondedAt", {
                    date: formatLatinDateTime(complaint.sellerRespondedAt),
                  })
                : tp4("responseDue", {
                    date: formatLatinDateTime(complaint.sellerResponseDueAt),
                  })}
            </p>
          ) : null}
          {complaint.decision && complaint.decision !== "PENDING" ? (
            <p className="text-xs font-medium">
              {tp4("decision", { decision: complaint.decision })}
            </p>
          ) : null}
          {complaint.attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {complaint.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={attachment.url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                </a>
              ))}
            </div>
          ) : null}
          {complaint.resolutionNote ? (
            <>
              <Separator />
              <p>
                <span className="font-medium">{t("resolution")}: </span>
                {complaint.resolutionNote}
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">{t("conversation")}</h2>
        {(complaint.comments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noMessages")}</p>
        ) : (
          <div className="grid gap-2">
            {(complaint.comments ?? []).map((item) => (
              <Card key={item.id} className="rounded-2xl">
                <CardContent className="grid gap-1 text-sm">
                  <span className="text-xs text-muted-foreground">
                    {item.authorRole} · {formatLatinDateTime(item.createdAt)}
                  </span>
                  <span>{item.body}</span>
                  {(item as { attachments?: { id: string; url: string }[] }).attachments?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {(item as { attachments?: { id: string; url: string }[] }).attachments!.map(
                        (photo) => (
                          <a
                            key={photo.id}
                            href={photo.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t("responsePhotos")}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt=""
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          </a>
                        ),
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="responsePhotos">{t("responsePhotos")}</Label>
            <p className="text-xs text-muted-foreground">{t("responsePhotosHelp")}</p>
            <Input
              id="responsePhotos"
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || attachments.length >= 5}
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []).slice(0, 5 - attachments.length);
                event.target.value = "";
                if (files.length === 0) return;
                setUploading(true);
                try {
                  const uploaded: string[] = [];
                  for (const file of files) {
                    const stored = await uploadsApi.image(file, "complaint");
                    uploaded.push(stored.url);
                  }
                  setAttachments((current) => [...current, ...uploaded].slice(0, 5));
                } catch (error) {
                  toastApiError(error, tErrors);
                } finally {
                  setUploading(false);
                }
              }}
            />
            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attachments.map((url) => (
                  <button
                    key={url}
                    type="button"
                    className="h-16 w-16 overflow-hidden rounded-lg border border-border/60"
                    onClick={() =>
                      setAttachments((current) => current.filter((item) => item !== url))
                    }
                    aria-label={t("removePhoto")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder={t("commentPlaceholder")}
          />
          <Button
            variant="cta"
            className="w-fit"
            disabled={body.trim().length < 1 || comment.isPending}
            onClick={() => comment.mutate()}
          >
            {t("send")}
          </Button>
        </div>
      </section>
    </div>
  );
}
