"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { adminApi } from "../api";
import { complaintStatusVariant } from "../status";
import type { ComplaintStatus } from "../types";

const STATUSES: ComplaintStatus[] = [
  "OPEN",
  "SELLER_RESPONDED",
  "UNDER_REVIEW",
  "RESOLVED_REFUND",
  "RESOLVED_REPLACEMENT",
  "REJECTED",
  "CLOSED",
];

export function ComplaintDetail({ id }: { id: string }) {
  const t = useTranslations("admin.complaints");
  const tStatus = useTranslations("admin.complaintStatus");
  const tType = useTranslations("admin.complaintType");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();

  const [newStatus, setNewStatus] = useState<ComplaintStatus>("UNDER_REVIEW");
  const [resolutionNote, setResolutionNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.admin.complaints({ id }),
    queryFn: () => adminApi.getComplaint(id),
    retry: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.complaints() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.complaints({ id }) });
  };

  const status = useMutation({
    mutationFn: () =>
      adminApi.updateComplaintStatus(id, {
        status: newStatus,
        resolutionNote: resolutionNote.trim() || undefined,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const resolve = useMutation({
    mutationFn: () =>
      adminApi.resolveComplaint(id, {
        status: newStatus,
        resolutionNote: resolutionNote.trim() || undefined,
        refundAmount: refundAmount.trim() ? Number(refundAmount) : undefined,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("resolved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const comment = useMutation({
    mutationFn: () => adminApi.commentComplaint(id, { body: commentBody.trim(), isInternal }),
    onSuccess: async () => {
      setCommentBody("");
      setIsInternal(false);
      await invalidate();
      toast.success(t("commentSaved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (query.isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const complaint = query.data;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{complaint.ticketNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {tType(complaint.type)} · {complaint.shop?.name ?? "-"} ·{" "}
            {formatLatinDateTime(complaint.createdAt)}
          </p>
        </div>
        <Badge variant={complaintStatusVariant(complaint.status)}>
          {tStatus(complaint.status)}
        </Badge>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="grid gap-2 text-sm">
          <p className="whitespace-pre-wrap">{complaint.description}</p>
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

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("resolve")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="complaintStatus">{t("status")}</Label>
            <select
              id="complaintStatus"
              className="h-10 rounded-full border border-input bg-background px-4 text-sm"
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value as ComplaintStatus)}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {tStatus(value)}
                </option>
              ))}
            </select>
          </div>
          {newStatus === "RESOLVED_REFUND" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="refundAmount">{t("refundAmount")}</Label>
              <Input
                id="refundAmount"
                inputMode="decimal"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
              />
            </div>
          ) : null}
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="resolutionNote">{t("resolutionNote")}</Label>
            <Textarea
              id="resolutionNote"
              rows={2}
              value={resolutionNote}
              onChange={(event) => setResolutionNote(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              disabled={status.isPending}
              onClick={() => status.mutate()}
            >
              {t("updateStatus")}
            </Button>
            <Button
              type="button"
              variant="cta"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate()}
            >
              {t("resolveAction")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {complaint.refunds && complaint.refunds.length > 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("refunds")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {complaint.refunds.map((refund) => (
              <div key={refund.id} className="flex items-center justify-between gap-3">
                <span>{formatBdt(refund.amount, "en")}</span>
                <Badge variant="outline">{refund.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

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
                    {item.authorRole}
                    {item.isInternal ? ` · ${t("internalNote")}` : ""} ·{" "}
                    {formatLatinDateTime(item.createdAt)}
                  </span>
                  <span>{item.body}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-2">
          <Textarea
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            rows={3}
            placeholder={t("commentPlaceholder")}
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="isInternal"
              checked={isInternal}
              onCheckedChange={(value) => setIsInternal(value === true)}
            />
            <Label htmlFor="isInternal">{t("internalNote")}</Label>
          </div>
          <Button
            variant="cta"
            className="w-fit"
            disabled={commentBody.trim().length < 1 || comment.isPending}
            onClick={() => comment.mutate()}
          >
            {t("send")}
          </Button>
        </div>
      </section>
    </div>
  );
}
