"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { FormField } from "@/features/auth/components/form-field";
import { queryKeys } from "@/lib/api/query-keys";
import { sellerApi } from "../api";
import type { PayoutMethod } from "../types";

// ROCKET is not in the canonical payout.methods setting, so it must not be
// offered for new destinations (existing rows still render).
const METHODS: PayoutMethod[] = ["BKASH", "NAGAD", "BANK"];

export function PayoutAccountsClient() {
  const t = useTranslations("seller.payouts");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const accounts = useQuery({
    queryKey: queryKeys.seller.payoutAccounts,
    queryFn: sellerApi.listPayoutAccounts,
    retry: false,
  });

  const schema = z.object({
    method: z.enum(["BKASH", "NAGAD", "BANK"]),
    accountName: z.string().min(1, t("validation.accountName")),
    accountNumber: z.string().min(4, t("validation.accountNumber")),
    isDefault: z.boolean(),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { method: "BKASH", accountName: "", accountNumber: "", isDefault: false },
  });

  const create = useMutation({
    mutationFn: (values: Values) => sellerApi.createPayoutAccount(values),
    onSuccess: async () => {
      form.reset({ method: "BKASH", accountName: "", accountNumber: "", isDefault: false });
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.payoutAccounts });
      toast.success(t("created"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sellerApi.removePayoutAccount(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.payoutAccounts });
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const onCreate = form.handleSubmit((values) => create.mutate(values));
  const isDefault = useWatch({ control: form.control, name: "isDefault" });
  const items = accounts.data ?? [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        {accounts.isLoading ? <Skeleton className="h-20 w-full" /> : null}
        {accounts.isError ? (
          <QueryError message={t("loadError")} onRetry={() => void accounts.refetch()} />
        ) : null}
        {!accounts.isLoading && !accounts.isError && items.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : null}
        {items.map((account) => (
          <Card key={account.id}>
            <CardContent className="flex items-start justify-between gap-4 text-sm">
              <div className="grid gap-1">
                <div className="flex items-center gap-2 font-medium">
                  {t(`methods.${account.method}`)}
                  {account.isDefault ? <Badge>{t("defaultBadge")}</Badge> : null}
                </div>
                <span className="text-muted-foreground">{account.accountName}</span>
                <span className="text-muted-foreground">{account.accountMasked}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => setRemoveTarget(account.id)}
              >
                {t("remove")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) remove.mutate(removeTarget);
                setRemoveTarget(null);
              }}
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent>
          <h2 className="mb-4 text-lg font-semibold">{t("add")}</h2>
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="payoutMethod">{t("method")}</Label>
              <select
                id="payoutMethod"
                className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                {...form.register("method")}
              >
                {METHODS.map((method) => (
                  <option key={method} value={method}>
                    {t(`methods.${method}`)}
                  </option>
                ))}
              </select>
            </div>
            <FormField
              label={t("accountName")}
              error={form.formState.errors.accountName?.message}
              {...form.register("accountName")}
            />
            <FormField
              label={t("accountNumber")}
              inputMode="numeric"
              error={form.formState.errors.accountNumber?.message}
              {...form.register("accountNumber")}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="payoutDefault"
                checked={isDefault}
                onCheckedChange={(value) => form.setValue("isDefault", value === true)}
              />
              <Label htmlFor="payoutDefault">{t("isDefault")}</Label>
            </div>
            <p className="text-sm text-muted-foreground sm:col-span-2">{t("maskedNote")}</p>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={create.isPending}>
                {t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
