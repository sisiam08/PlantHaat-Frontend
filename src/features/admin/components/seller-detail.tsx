"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Price } from "@/components/product/price";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { sellerStatusVariant } from "../status";
import { DocumentViewer } from "./documents-viewer";
import { Pager } from "./pager";

export function SellerDetail({ id }: { id: string }) {
  const t = useTranslations("admin.sellers");
  const tStatus = useTranslations("admin.sellerStatus");
  const tLedger = useTranslations("admin.ledgerType");
  const tMethods = useTranslations("admin.payoutMethods");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [cancelOpenOrders, setCancelOpenOrders] = useState(false);
  const [reason, setReason] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [duesAmount, setDuesAmount] = useState("");
  const [duesNote, setDuesNote] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote] = useState("");

  const seller = useQuery({
    queryKey: queryKeys.admin.seller(id),
    queryFn: () => adminApi.getSeller(id),
    retry: false,
  });

  const ledger = useQuery({
    queryKey: [...queryKeys.admin.seller(id), "ledger", ledgerPage],
    queryFn: () => adminApi.listSellerLedger(id, { page: ledgerPage, limit: 20 }),
    retry: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.seller(id) });
  };

  const action = useMutation({
    mutationFn: async (kind: "approve" | "reactivate") =>
      kind === "approve" ? adminApi.approveSeller(id) : adminApi.reactivateSeller(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const suspend = useMutation({
    mutationFn: () =>
      adminApi.suspendSeller(id, {
        reason: suspendReason.trim() || undefined,
        cancelOpenOrders,
        cancelReason: cancelOpenOrders
          ? suspendReason.trim() || t("suspendCancelReason")
          : undefined,
      }),
    onSuccess: async () => {
      setSuspendOpen(false);
      setSuspendReason("");
      setCancelOpenOrders(false);
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const reject = useMutation({
    mutationFn: () => adminApi.rejectSeller(id, reason.trim()),
    onSuccess: async () => {
      setRejectOpen(false);
      setReason("");
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const dues = useMutation({
    mutationFn: () =>
      adminApi.recordDuesPayment(id, {
        amount: Number(duesAmount),
        note: duesNote.trim() || undefined,
      }),
    onSuccess: async () => {
      setDuesAmount("");
      setDuesNote("");
      await invalidate();
      toast.success(t("fundsUpdated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const adjustment = useMutation({
    mutationFn: () =>
      adminApi.recordAdjustment(id, { amount: Number(adjAmount), note: adjNote.trim() }),
    onSuccess: async () => {
      setAdjAmount("");
      setAdjNote("");
      await invalidate();
      toast.success(t("fundsUpdated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (seller.isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }
  if (seller.isError || !seller.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const data = seller.data;
  const busy = action.isPending || suspend.isPending || reject.isPending;
  const ledgerItems = ledger.data?.data ?? [];
  const ledgerMeta = ledger.data?.meta;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-bold">{data.businessName}</h1>
          <p className="text-sm text-muted-foreground">
            {data.user.name} · {data.user.email}
            {data.user.phone ? ` · ${data.user.phone}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={sellerStatusVariant(data.status)}>{tStatus(data.status)}</Badge>
            <span className="text-xs text-muted-foreground">{t(`types.${data.sellerType}`)}</span>
            {data.openOrderCount > 0 ? (
              <Badge variant="secondary">{t("openOrders", { count: data.openOrderCount })}</Badge>
            ) : null}
            {data.falseDeliveryFlags > 0 ? (
              <Badge variant="destructive">
                {t("falseDeliveryFlags", { count: data.falseDeliveryFlags })}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.status !== "APPROVED" && data.status !== "SUSPENDED" ? (
            <Button
              type="button"
              variant="cta"
              size="sm"
              disabled={busy}
              onClick={() => action.mutate("approve")}
            >
              {t("approve")}
            </Button>
          ) : null}
          {data.status === "SUSPENDED" ? (
            <Button
              type="button"
              variant="cta"
              size="sm"
              disabled={busy}
              onClick={() => action.mutate("reactivate")}
            >
              {t("reactivate")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                setSuspendReason("");
                setCancelOpenOrders(false);
                setSuspendOpen(true);
              }}
            >
              {t("suspend")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setRejectOpen((open) => !open)}
          >
            {t("reject")}
          </Button>
        </div>
      </div>

      {rejectOpen ? (
        <Card className="rounded-2xl border-destructive/40">
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rejectReason">{t("rejectReason")}</Label>
              <Textarea
                id="rejectReason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="cta"
                disabled={reject.isPending || reason.trim().length < 3}
                onClick={() => reject.mutate()}
              >
                {t("confirmReject")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setRejectOpen(false)}>
                {t("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data.rejectionReason ? (
        <p className="text-sm text-destructive">
          {t("rejectionReason")}: {data.rejectionReason}
        </p>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
          <TabsTrigger value="documents">{t("tabDocuments")}</TabsTrigger>
          <TabsTrigger value="ledger">{t("tabLedger")}</TabsTrigger>
          <TabsTrigger value="funds">{t("tabFunds")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <div className="grid gap-5">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>{t("businessProfile")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm">
                <Row label={t("businessName")} value={data.businessName} />
                <Row label={t("contactPhone")} value={data.contactPhone} />
                <Row label={t("businessAddress")} value={data.businessAddress} />
                <Row label={t("tradeLicense")} value={data.tradeLicenseNo ?? "-"} />
                <Row label={t("createdAt")} value={formatLatinDateTime(data.createdAt)} />
                <Row
                  label={t("submittedAt")}
                  value={data.submittedAt ? formatLatinDateTime(data.submittedAt) : "-"}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>{t("shopsTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {data.shops.length === 0 ? (
                  <p className="text-muted-foreground">{t("noShops")}</p>
                ) : (
                  data.shops.map((shop) => (
                    <div key={shop.id} className="flex items-center justify-between gap-3">
                      <span>
                        {shop.name} <span className="text-muted-foreground">/{shop.slug}</span>
                      </span>
                      <Badge variant="outline">{shop.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>{t("payoutAccounts")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {data.payoutAccounts.length === 0 ? (
                  <p className="text-muted-foreground">{t("noPayoutAccounts")}</p>
                ) : (
                  data.payoutAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between gap-3">
                      <span>
                        {tMethods(account.method)} · {account.accountName}
                      </span>
                      <span className="text-muted-foreground">{account.accountMasked}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t("tabDocuments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentViewer sellerId={id} documents={data.documents} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="pt-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t("tabLedger")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {ledger.isLoading ? <Skeleton className="h-20 w-full" /> : null}
              {ledger.isError ? <p className="text-muted-foreground">{t("loadError")}</p> : null}
              {!ledger.isLoading && ledgerItems.length === 0 ? (
                <p className="text-muted-foreground">{t("noLedger")}</p>
              ) : null}
              {ledgerItems.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="grid gap-0.5">
                    <span className="font-medium">{tLedger(entry.type)}</span>
                    {entry.description ? (
                      <span className="text-xs text-muted-foreground">{entry.description}</span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatLatinDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <span className="shrink-0">
                    <Price value={entry.amount} locale={locale} size="sm" />
                  </span>
                </div>
              ))}
              {ledgerMeta ? (
                <Pager
                  page={ledgerMeta.page}
                  totalPages={ledgerMeta.totalPages}
                  onPage={setLedgerPage}
                />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funds" className="pt-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>{t("duesPayment")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="duesAmount">{t("amount")}</Label>
                  <Input
                    id="duesAmount"
                    inputMode="decimal"
                    value={duesAmount}
                    onChange={(event) => setDuesAmount(event.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="duesNote">{t("note")}</Label>
                  <Input
                    id="duesNote"
                    value={duesNote}
                    onChange={(event) => setDuesNote(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="cta"
                  className="w-fit"
                  disabled={dues.isPending || !(Number(duesAmount) > 0)}
                  onClick={() => dues.mutate()}
                >
                  {t("recordDuesPayment")}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>{t("adjustment")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="adjAmount">{t("signedAmount")}</Label>
                  <Input
                    id="adjAmount"
                    inputMode="decimal"
                    value={adjAmount}
                    onChange={(event) => setAdjAmount(event.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">{t("signedHint")}</span>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="adjNote">{t("note")}</Label>
                  <Input
                    id="adjNote"
                    value={adjNote}
                    onChange={(event) => setAdjNote(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="cta"
                  className="w-fit"
                  disabled={
                    adjustment.isPending ||
                    Number.isNaN(Number(adjAmount)) ||
                    adjNote.trim().length < 1
                  }
                  onClick={() => adjustment.mutate()}
                >
                  {t("recordAdjustment")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={suspendOpen}
        onOpenChange={(open) => {
          if (!open) setSuspendOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("suspend")}</DialogTitle>
            <DialogDescription>
              {t("suspendWithOrders", { count: data.openOrderCount })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="suspendReason">{t("suspendReason")}</Label>
              <Input
                id="suspendReason"
                value={suspendReason}
                onChange={(event) => setSuspendReason(event.target.value)}
              />
            </div>
            {data.openOrderCount > 0 ? (
              <div className="flex items-center gap-3">
                <Switch
                  id="cancelOpenOrders"
                  checked={cancelOpenOrders}
                  onCheckedChange={setCancelOpenOrders}
                />
                <Label htmlFor="cancelOpenOrders">
                  {t("cancelOpenOrders", { count: data.openOrderCount })}
                </Label>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setSuspendOpen(false)}>
              {t("keep")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={suspend.isPending || (cancelOpenOrders && suspendReason.trim().length < 3)}
              onClick={() => suspend.mutate()}
            >
              {suspend.isPending ? t("suspending") : t("suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
