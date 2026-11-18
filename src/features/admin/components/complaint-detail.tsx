"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
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
import { Price } from "@/components/product/price";
import { adminApi, adminSettlementApi } from "../api";
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
  const tp4 = useTranslations("part4.dispute");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [newStatus, setNewStatus] = useState<ComplaintStatus>("UNDER_REVIEW");
  const [resolutionNote, setResolutionNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [decision, setDecision] = useState<
    "REJECTED" | "REFUND_FULL" | "REFUND_PARTIAL" | "RETURN_TO_SELLER"
  >("REJECTED");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionAmount, setDecisionAmount] = useState("");
  const [refundTrxId, setRefundTrxId] = useState("");

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

  const decide = useMutation({
    mutationFn: () =>
      adminSettlementApi.decideDispute(id, {
        decision,
        reason: decisionReason.trim(),
        refundAmount:
          decision === "REFUND_PARTIAL" && decisionAmount.trim()
            ? Number(decisionAmount)
            : undefined,
        refundTrxId: refundTrxId.trim() || undefined,
      }),
    onSuccess: async () => {
      setDecisionReason("");
      setDecisionAmount("");
      setRefundTrxId("");
      await invalidate();
      toast.success(tp4("decisionSaved"));
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
  const decisionLabel =
    complaint.decision === "REJECTED"
      ? tp4("decisionReject")
      : complaint.decision === "REFUND_FULL"
        ? tp4("decisionRefundFull")
        : complaint.decision === "REFUND_PARTIAL"
          ? tp4("decisionRefundPartial")
          : complaint.decision === "RETURN_TO_SELLER"
            ? tp4("decisionReturn")
            : null;

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

      {complaint.shopOrder ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{tp4("orderSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{tp4("orderNumber")}</span>
              <span className="font-medium">
                {complaint.shopOrder.order?.orderNumber ?? complaint.shopOrder.shopOrderNumber}
              </span>
            </div>
            {complaint.shop ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{tp4("shopName")}</span>
                <span>{complaint.shop.name}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{tp4("orderStatus")}</span>
              <span>{complaint.shopOrder.status}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{tp4("orderPayment")}</span>
              <span>{complaint.shopOrder.order?.paymentMethod ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3 font-medium">
              <span>{tp4("orderTotal")}</span>
              <Price value={complaint.shopOrder.total} locale={locale} size="sm" />
            </div>
          </CardContent>
        </Card>
      ) : null}

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

      <Card className="rounded-2xl border-primary/30">
        <CardHeader>
          <CardTitle>{tp4("decisionTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1 rounded-xl bg-secondary/40 p-3 text-sm">
            <span className="text-xs text-muted-foreground">{tp4("timeline")}</span>
            <span>
              {tp4("openedAt", { date: formatLatinDateTime(complaint.createdAt) })}
            </span>
            {complaint.sellerResponseDueAt ? (
              <span>
                {tp4("sellerDue", {
                  date: formatLatinDateTime(complaint.sellerResponseDueAt),
                })}
              </span>
            ) : null}
            {complaint.sellerRespondedAt ? (
              <span>
                {tp4("sellerResponded", {
                  date: formatLatinDateTime(complaint.sellerRespondedAt),
                })}
              </span>
            ) : null}
            {complaint.fundsHeldAt ? (
              <span className="font-medium text-warning-foreground">
                {tp4("fundsHeld")}
              </span>
            ) : null}
            {complaint.decision && complaint.decision !== "PENDING" ? (
              <span className="font-medium">
                {tp4("decisionMade", { decision: decisionLabel ?? complaint.decision })}
              </span>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="decision">{tp4("decision")}</Label>
            <select
              id="decision"
              className="min-h-11 rounded-full border border-input bg-background px-4 text-sm"
              value={decision}
              onChange={(event) =>
                setDecision(
                  event.target.value as
                    | "REJECTED"
                    | "REFUND_FULL"
                    | "REFUND_PARTIAL"
                    | "RETURN_TO_SELLER",
                )
              }
            >
              <option value="REJECTED">{tp4("decisionReject")}</option>
              <option value="REFUND_FULL">{tp4("decisionRefundFull")}</option>
              <option value="REFUND_PARTIAL">{tp4("decisionRefundPartial")}</option>
              <option value="RETURN_TO_SELLER">{tp4("decisionReturn")}</option>
            </select>
          </div>

          {decision === "REFUND_PARTIAL" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="decisionAmount">{t("refundAmount")}</Label>
              <Input
                id="decisionAmount"
                inputMode="decimal"
                value={decisionAmount}
                onChange={(event) => setDecisionAmount(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {tp4("refundMathHint")}
              </p>
            </div>
          ) : null}

          {decision === "REFUND_FULL" || decision === "REFUND_PARTIAL" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="refundTrxId">{tp4("refundTrx")}</Label>
              <Input
                id="refundTrxId"
                value={refundTrxId}
                onChange={(event) => setRefundTrxId(event.target.value)}
                placeholder="BKASHREF..."
              />
              <p className="text-xs text-muted-foreground">{tp4("refundTrxHint")}</p>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="decisionReason">{tp4("reason")}</Label>
            <Textarea
              id="decisionReason"
              rows={2}
              value={decisionReason}
              onChange={(event) => setDecisionReason(event.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">{tp4("decisionWarning")}</p>
          <div>
            <Button
              type="button"
              variant="cta"
              disabled={
                decide.isPending ||
                decisionReason.trim().length < 3 ||
                (decision === "REFUND_PARTIAL" && !(Number(decisionAmount) > 0)) ||
                complaint.decision !== "PENDING"
              }
              onClick={() => decide.mutate()}
            >
              {tp4("confirmDecision")}
            </Button>
          </div>
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
                <span>
                  <Price value={refund.amount} locale={locale} size="sm" />
                </span>
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
