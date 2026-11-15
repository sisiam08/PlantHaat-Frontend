"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { adminApi } from "../api";
import type { AdminSettingDefinition, AdminSettings } from "../types";

const GROUPS = ["payments", "orders", "wallet", "payouts", "support"] as const;

export function SettingsClient() {
  const t = useTranslations("admin.settings");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: queryKeys.admin.settings, queryFn: adminApi.getSettings });
  const registry = useQuery({
    queryKey: queryKeys.admin.settingsRegistry,
    queryFn: adminApi.getSettingsRegistry,
  });
  const history = useQuery({
    queryKey: queryKeys.admin.settingsHistory(),
    queryFn: () => adminApi.getSettingsHistory(),
  });

  const [values, setValues] = useState<AdminSettings>({});
  const [initial, setInitial] = useState<AdminSettings>({});
  const [reauthKey, setReauthKey] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (settings.data) {
      setValues(settings.data);
      setInitial(settings.data);
    }
  }, [settings.data]);

  const paymentIssues = useMemo(() => {
    const issues: Record<string, string> = {};
    const valid = (key: string) => /^01[3-9]\d{8}$/.test(String(values[key] ?? "").trim());
    for (const provider of [
      { enabled: "payment.bkash.enabled", number: "payment.bkash.number", label: "bKash" },
      { enabled: "payment.nagad.enabled", number: "payment.nagad.number", label: "Nagad" },
    ]) {
      if (values[provider.enabled] === true && !valid(provider.number)) {
        issues[provider.enabled] =
          `${provider.label} needs a valid receiving number before it can be enabled.`;
      }
    }
    const providerReady = ["payment.bkash", "payment.nagad"].some(
      (prefix) => values[`${prefix}.enabled`] === true && valid(`${prefix}.number`),
    );
    if (values["payment.advance.enabled"] === true && !providerReady) {
      issues["payment.advance.enabled"] = "Enable bKash or Nagad with a valid number first.";
    }
    if (values["payment.cod.enabled"] === false) {
      issues["payment.cod.enabled"] =
        "COD cannot be disabled until Advance payment is live and a provider number is configured.";
    }
    return issues;
  }, [values]);

  const dirty = useMemo(
    () =>
      Object.keys(values).filter(
        (key) => JSON.stringify(values[key]) !== JSON.stringify(initial[key]),
      ),
    [values, initial],
  );

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty.length > 0) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty.length]);

  const save = useMutation({
    mutationFn: async ({ token }: { token?: string }) => {
      const changed = Object.fromEntries(dirty.map((key) => [key, values[key]]));
      return adminApi.updateSettings(changed, token);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.settingsHistory() });
      setInitial(values);
      setReauthKey(null);
      setPassword("");
      toast.success(t("saved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (settings.isLoading || registry.isLoading)
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (settings.isError || registry.isError || !registry.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const definitions = registry.data;
  const sensitiveDirty = dirty.filter(
    (key) => definitions.find((entry) => entry.key === key)?.isSensitive,
  );
  const lastChange = (key: string) => history.data?.find((entry) => entry.key === key);

  const onSave = () => {
    if (Object.keys(paymentIssues).length > 0) {
      toast.error("Fix the payment settings errors before saving.");
      return;
    }
    if (sensitiveDirty.length > 1) {
      toast.error("Please save sensitive settings one at a time.");
      return;
    }
    if (sensitiveDirty.length === 1) {
      setReauthKey(sensitiveDirty[0]!);
      return;
    }
    save.mutate({});
  };

  const confirmReauth = async () => {
    if (!reauthKey) return;
    try {
      const { token } = await adminApi.reauthenticateSettings(reauthKey, password);
      save.mutate({ token });
    } catch (error) {
      toastApiError(error, tErrors);
    }
  };

  const setValue = (key: string, value: unknown) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl py-0">
        <CardContent className="p-5">
          <Tabs defaultValue="payments">
            <TabsList className="mb-5 flex h-auto flex-wrap justify-start gap-1">
              {GROUPS.map((group) => (
                <TabsTrigger key={group} value={group} className="capitalize">
                  {group.replace("-", " ")}
                </TabsTrigger>
              ))}
            </TabsList>
            {GROUPS.map((group) => (
              <TabsContent key={group} value={group} className="grid gap-5">
                {group === "payments" ? (
                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-sm">
                    <p className="font-medium">Payment settings summary</p>
                    <p className="mt-1 text-muted-foreground">
                      bKash: {String(values["payment.bkash.number"] || "not set")} · Nagad:{" "}
                      {String(values["payment.nagad.number"] || "not set")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Advance: {values["payment.advance.enabled"] ? "enabled" : "disabled"} · COD:{" "}
                      {values["payment.cod.enabled"] ? "enabled" : "disabled"}
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  {definitions
                    .filter((definition) => definition.group === group)
                    .map((definition) => (
                      <SettingField
                        key={definition.key}
                        definition={definition}
                        value={values[definition.key]}
                        locale={locale}
                        last={lastChange(definition.key)}
                        error={paymentIssues[definition.key]}
                        disabled={
                          (definition.key === "payment.bkash.enabled" ||
                            definition.key === "payment.nagad.enabled") &&
                          !/^01[3-9]\d{8}$/.test(
                            String(
                              values[definition.key.replace(".enabled", ".number")] ?? "",
                            ).trim(),
                          )
                        }
                        onChange={(value) => setValue(definition.key, value)}
                        onReset={() => setValue(definition.key, definition.default)}
                      />
                    ))}
                </div>
                {group === "payments" ? (
                  <p className="text-xs text-muted-foreground">
                    At least one payment method must stay enabled.
                  </p>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 pt-5">
            <Button variant="cta" disabled={save.isPending || dirty.length === 0} onClick={onSave}>
              {t("save")}
            </Button>
            {dirty.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {dirty.length} unsaved change(s)
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl py-0">
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">Recent settings history</h2>
          <div className="grid gap-2 text-sm">
            {history.data?.slice(0, 12).map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap justify-between gap-2 border-b border-border/50 pb-2"
              >
                <span className="font-medium">{entry.key}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString(locale)} · {String(entry.oldValue)} →{" "}
                  {String(entry.newValue)}
                </span>
              </div>
            ))}
            {history.data?.length === 0 ? (
              <p className="text-muted-foreground">No changes yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(reauthKey)} onOpenChange={(open) => !open && setReauthKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm sensitive change</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your admin password to change {reauthKey}. This applies to new orders only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReauth} disabled={!password || save.isPending}>
              Confirm and save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SettingField({
  definition,
  value,
  locale,
  last,
  error,
  disabled,
  onChange,
  onReset,
}: {
  definition: AdminSettingDefinition;
  value: unknown;
  locale: string;
  last?: { createdAt: string; updatedById: string | null };
  error?: string;
  disabled?: boolean;
  onChange: (value: unknown) => void;
  onReset: () => void;
}) {
  const label = locale === "bn" ? definition.labelBn : definition.labelEn;
  return (
    <div className="grid gap-1.5 rounded-xl border border-border/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={definition.key} className="flex items-center gap-2">
          {label}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              definition.wired ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {definition.wired ? "Active" : "Not active yet"}
          </span>
        </Label>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Reset to default
        </Button>
      </div>
      {definition.type === "boolean" ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            id={definition.key}
            checked={value === true}
            disabled={disabled}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          Enabled
        </label>
      ) : definition.type === "number" ? (
        <Input
          id={definition.key}
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
        />
      ) : definition.type === "json" ? (
        <Textarea
          id={definition.key}
          rows={3}
          value={JSON.stringify(value ?? definition.default, null, 2)}
          onChange={(event) => {
            try {
              onChange(JSON.parse(event.target.value));
            } catch {
              // keep the last valid value; inline validation is shown on save
            }
          }}
        />
      ) : (
        <Input
          id={definition.key}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <p className="text-xs text-muted-foreground">
        {definition.isSensitive
          ? "Changes apply to new orders only. Requires password."
          : definition.labelEn}
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>Default: {String(definition.default)}</span>
        {definition.isSensitive ? <span>Sensitive · requires password</span> : null}
        {last ? <span>Last changed {new Date(last.createdAt).toLocaleString(locale)}</span> : null}
      </div>
    </div>
  );
}
