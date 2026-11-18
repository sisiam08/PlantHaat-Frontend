"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { QueryError } from "@/components/feedback/query-error";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { complaintsApi } from "../api";

export function ComplaintDetail({ id }: { id: string }) {
  const t = useTranslations("complaints");
  const tErrors = useTranslations("errors");
  const tp4 = useTranslations("part4.complaintTimeline");
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const query = useQuery({
    queryKey: queryKeys.complaint(id),
    queryFn: () => complaintsApi.get(id),
  });

  const comment = useMutation({
    mutationFn: () => complaintsApi.comment(id, body.trim()),
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.complaint(id) });
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (query.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (query.isError || !query.data) {
    return <QueryError message={tErrors("generic")} onRetry={() => void query.refetch()} />;
  }

  const complaint = query.data;

  return (
    <div className="grid gap-5">
      <PageHeader
        title={t(`types.${complaint.type}`)}
        description={formatLatinDateTime(complaint.createdAt)}
        actions={<Badge>{t(`status.${complaint.status}`)}</Badge>}
      />

      <Card>
        <CardContent className="grid gap-2 text-sm">
          <h2 className="font-semibold">{tp4("timeline")}</h2>
          <TimelineRow label={tp4("opened")} time={complaint.createdAt} />
          {complaint.sellerRespondedAt ? (
            <TimelineRow label={tp4("sellerResponded")} time={complaint.sellerRespondedAt} />
          ) : complaint.sellerResponseDueAt && complaint.status === "OPEN" ? (
            <p className="text-xs text-muted-foreground">
              {tp4("sellerResponseDue", {
                date: formatLatinDateTime(complaint.sellerResponseDueAt),
              })}
            </p>
          ) : null}
          {complaint.decision && complaint.decision !== "PENDING" ? (
            <TimelineRow
              label={tp4("decided", { decision: complaint.decision })}
              time={complaint.decidedAt ?? complaint.updatedAt}
            />
          ) : null}
          {(complaint.refunds ?? []).map((refund) => (
            <TimelineRow
              key={refund.id}
              label={tp4("refundPaid", {
                amount: refund.amount,
                reference: refund.reference ?? tp4("pendingReference"),
              })}
              time={complaint.updatedAt}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-2 text-sm">
          <p className="whitespace-pre-wrap">{complaint.description}</p>
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

      {(complaint.attachments ?? []).length > 0 ? (
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">{t("attachmentsTitle")}</h2>
          <div className="flex flex-wrap gap-2">
            {(complaint.attachments ?? []).map((attachment) => (
              <a
                key={attachment.url}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="block size-24 overflow-hidden rounded-xl border border-border/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">{t("conversation")}</h2>
        {(complaint.comments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noMessages")}</p>
        ) : (
          <div className="grid gap-2">
            {(complaint.comments ?? []).map((item) => (
              <Card key={item.id}>
                <CardContent className="grid gap-1 text-sm">
                  <span className="text-xs text-muted-foreground">
                    {item.authorRole} · {formatLatinDateTime(item.createdAt)}
                  </span>
                  <span>{item.body}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder={t("commentPlaceholder")}
          />
          <Button
            variant="cta"
            disabled={body.trim().length < 1 || comment.isPending}
            onClick={() => {
              if (body.trim().length >= 1) {
                comment.mutate();
              }
            }}
          >
            {t("send")}
          </Button>
        </div>
      </section>
    </div>
  );
}

function TimelineRow({ label, time }: { label: string; time: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{formatLatinDateTime(time)}</span>
    </div>
  );
}
