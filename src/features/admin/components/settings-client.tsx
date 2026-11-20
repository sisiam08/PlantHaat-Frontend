"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
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
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentPreview } from "@/features/payments/components/payment-preview";
import { Textarea } from "@/components/ui/textarea";
import { uploadsApi } from "@/features/uploads/api";
import { cn } from "@/lib/utils";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { toApiError } from "@/lib/api/client";
import { adminApi } from "../api";
import type { AdminSettingDefinition, AdminSettings } from "../types";

const GROUPS = ["home", "payments", "orders", "wallet", "payouts", "support", "security"] as const;

const GROUP_LABELS: Record<(typeof GROUPS)[number], string> = {
  home: "Home",
  payments: "payments",
  orders: "orders",
  wallet: "wallet",
  payouts: "payouts",
  support: "support",
  security: "Security & Sessions",
};

export function SettingsClient() {
  const t = useTranslations("admin.settings");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: adminApi.getSettings,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const registry = useQuery({
    queryKey: queryKeys.admin.settingsRegistry,
    queryFn: adminApi.getSettingsRegistry,
  });
  const history = useQuery({
    queryKey: queryKeys.admin.settingsHistory(),
    queryFn: () => adminApi.getSettingsHistory(),
  });

  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [reauthKeys, setReauthKeys] = useState<string[] | null>(null);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const initial = useMemo(() => settings.data ?? {}, [settings.data]);
  const values = draft ?? initial;

  const paymentIssues = useMemo(() => {
    const issues: Record<string, string> = {};
    const valid = (key: string) => /^01[3-9]\d{8}$/.test(String(values[key] ?? "").trim());
    for (const provider of [
      { enabled: "payment.bkash.enabled", number: "payment.bkash.number", label: "bKash" },
      { enabled: "payment.nagad.enabled", number: "payment.nagad.number", label: "Nagad" },
    ]) {
      const number = String(values[provider.number] ?? "").trim();
      if (number && !valid(provider.number)) {
        issues[provider.number] = `${provider.label}: enter a valid 01XXXXXXXXX number.`;
      }
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
      setDraft(null);
      setReauthKeys(null);
      setPassword("");
      setServerErrors({});
      toast.success(t("savedMessage"));
    },
    onError: (error) => {
      const apiError = toApiError(error);
      const details = apiError.details;
      if (details && typeof details === "object" && !Array.isArray(details)) {
        setServerErrors(details as Record<string, string>);
      }
      toastApiError(error, tErrors);
    },
  });

  const storageCheck = useMutation({
    mutationFn: () => adminApi.storageHealthCheck(),
    onSuccess: (result) => {
      toast.success(t("storageOk", { ms: result.latencyMs }));
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
      toast.error(t("fixPaymentErrors"));
      return;
    }
    if (sensitiveDirty.length > 1) {
      toast.error(t("saveSensitiveOne"));
      return;
    }
    if (sensitiveDirty.length > 0) {
      setReauthKeys(sensitiveDirty);
      return;
    }
    save.mutate({});
  };

  const confirmReauth = async () => {
    if (!reauthKeys) return;
    try {
      const { token } = await adminApi.reauthenticateSettings(reauthKeys, password);
      setReauthError(null);
      save.mutate({ token });
    } catch (error) {
      setReauthError(error instanceof Error ? error.message : tErrors("generic"));
      toastApiError(error, tErrors);
    }
  };

  const setValue = (key: string, value: unknown) => {
    setDraft((current) => ({ ...(current ?? initial), [key]: value }));
    setServerErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold">{t("storageHealth")}</h2>
            <p className="text-sm text-muted-foreground">{t("storageHealthHint")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={storageCheck.isPending}
            onClick={() => storageCheck.mutate()}
          >
            {storageCheck.isPending ? t("storageChecking") : t("storageCheck")}
          </Button>
        </CardContent>
      </Card>
      <Card className="rounded-2xl py-0">
        <CardContent className="p-5">
          <Tabs defaultValue="payments">
            <TabsList className="mb-5 flex h-auto flex-wrap justify-start gap-1">
              {GROUPS.map((group) => (
                <TabsTrigger key={group} value={group} className="capitalize">
                  {GROUP_LABELS[group]}
                </TabsTrigger>
              ))}
            </TabsList>
            {GROUPS.map((group) => (
              <TabsContent key={group} value={group} className="grid gap-5">
                {group === "payments" ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {[
                      {
                        title: "bKash",
                        keys: ["payment.bkash.enabled", "payment.bkash.number"],
                      },
                      {
                        title: "Nagad",
                        keys: ["payment.nagad.enabled", "payment.nagad.number"],
                      },
                      {
                        title: "Timing & account",
                        keys: [
                          "payment.expiryHours",
                          "payment.slaHours",
                          "payment.lateGraceHours",
                          "payment.verificationText",
                          "payment.accountNote",
                        ],
                      },
                      {
                        title: "Checkout methods",
                        keys: ["payment.cod.enabled", "payment.advance.enabled"],
                      },
                    ].map((card) => (
                      <div
                        key={card.title}
                        className="grid content-start gap-3 rounded-xl border border-border/60 bg-secondary/20 p-4"
                      >
                        <h3 className="font-heading text-sm font-semibold">{card.title}</h3>
                        {card.keys.map((key) => {
                          const definition = definitions.find((entry) => entry.key === key);
                          if (!definition) return null;
                          return (
                            <SettingField
                              key={definition.key}
                              definition={definition}
                              value={values[definition.key]}
                              locale={locale}
                              last={lastChange(definition.key)}
                              error={paymentIssues[definition.key] ?? serverErrors[definition.key]}
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
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : group === "home" ? (
                  <HomeSettingsFields
                    definitions={definitions.filter((entry) => entry.group === "home")}
                    values={values}
                    errors={serverErrors}
                    locale={locale}
                    lastChange={lastChange}
                    onChange={setValue}
                    onReset={(key, value) => setValue(key, value)}
                  />
                ) : (
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
                          error={paymentIssues[definition.key] ?? serverErrors[definition.key]}
                          onChange={(value) => setValue(definition.key, value)}
                          onReset={() => setValue(definition.key, definition.default)}
                        />
                      ))}
                  </div>
                )}
                {group === "payments" ? (
                  <div className="grid gap-3">
                    <PaymentPreview values={values} />
                    <p className="text-xs text-muted-foreground">
                      At least one payment method must stay enabled.
                    </p>
                  </div>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
          <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 bg-card/95 px-5 py-4 backdrop-blur">
            <Button variant="cta" disabled={save.isPending || dirty.length === 0} onClick={onSave}>
              {t("save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={save.isPending || dirty.length === 0}
              onClick={() => setDraft(null)}
            >
              {t("discard")}
            </Button>
            {dirty.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {dirty.length === 1 ? t("unsavedOne") : t("unsavedMany", { count: dirty.length })}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl py-0">
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">{t("historyTitle")}</h2>
          <div className="grid gap-2 text-sm">
            {history.data?.slice(0, 12).map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap justify-between gap-2 border-b border-border/50 pb-2"
              >
                <span className="font-medium">{entry.key}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt, locale)} · {String(entry.oldValue)} →{" "}
                  {String(entry.newValue)}
                </span>
              </div>
            ))}
            {history.data?.length === 0 ? (
              <p className="text-muted-foreground">{t("noHistory")}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(reauthKeys)}
        onOpenChange={(open) => {
          if (!open) {
            setReauthKeys(null);
            setReauthError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reauthTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reauthBody", { key: reauthKeys?.join(", ") ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <PasswordInput
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
          />
          {reauthError ? (
            <p role="alert" className="text-sm text-destructive">
              {reauthError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="cta"
              onClick={confirmReauth}
              disabled={!password || save.isPending}
            >
              {t("confirmSave")}
            </Button>
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
  const t = useTranslations("admin.settings");
  const label = locale === "bn" ? definition.labelBn : definition.labelEn;
  const help =
    definition.helpEn && definition.helpBn
      ? `${definition.helpEn} · ${definition.helpBn}`
      : `${definition.labelEn} · ${definition.labelBn}`;
  return (
    <div data-setting-key={definition.key} className="grid gap-1.5 rounded-xl border border-border/50 p-4">
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-setting-reset={definition.key}
          onClick={onReset}
        >
          {t("resetDefault")}
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
          {t("enabled")}
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
      <p className="text-xs text-muted-foreground">{help}</p>
      <p className="text-[11px] text-muted-foreground">
        {definition.isSensitive ? t("effectNewOrders") : t("effectPageLoads")}
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {t("defaultLabel")}: {String(definition.default)}
        </span>
        {definition.isSensitive ? <span>{t("sensitiveNote")}</span> : null}
        {last ? <span>Last changed {formatDateTime(last.createdAt, locale)}</span> : null}
      </div>
    </div>
  );
}

interface LocalizedValue {
  bn: string;
  en: string;
}

interface HeroImageValue {
  url: string;
  mobileUrl: string;
  altBn: string;
  altEn: string;
  focalX: number;
  focalY: number;
}

const EMPTY_HERO_IMAGE: HeroImageValue = {
  url: "",
  mobileUrl: "",
  altBn: "",
  altEn: "",
  focalX: 50,
  focalY: 50,
};

function asLocalized(value: unknown, fallback: LocalizedValue): LocalizedValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  return {
    bn: typeof record.bn === "string" ? record.bn : fallback.bn,
    en: typeof record.en === "string" ? record.en : fallback.en,
  };
}

function asHeroImage(value: unknown): HeroImageValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_HERO_IMAGE;
  const record = value as Record<string, unknown>;
  return {
    url: typeof record.url === "string" ? record.url : "",
    mobileUrl: typeof record.mobileUrl === "string" ? record.mobileUrl : "",
    altBn: typeof record.altBn === "string" ? record.altBn : "",
    altEn: typeof record.altEn === "string" ? record.altEn : "",
    focalX: typeof record.focalX === "number" ? record.focalX : 50,
    focalY: typeof record.focalY === "number" ? record.focalY : 50,
  };
}

function LocalizedEditor({
  id,
  label,
  hint,
  value,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: LocalizedValue;
  maxLength: number;
  onChange: (value: LocalizedValue) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`${id}-bn`}>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          id={`${id}-bn`}
          lang="bn"
          maxLength={maxLength}
          value={value.bn}
          placeholder="বাংলা"
          onChange={(event) => onChange({ ...value, bn: event.target.value })}
        />
        <Input
          id={`${id}-en`}
          lang="en"
          maxLength={maxLength}
          value={value.en}
          placeholder="English"
          onChange={(event) => onChange({ ...value, en: event.target.value })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {hint ? `${hint} ` : ""}Bangla and English, max {maxLength} characters each.
      </p>
    </div>
  );
}

function HeroImageEditor({
  value,
  onChange,
}: {
  value: HeroImageValue;
  onChange: (value: HeroImageValue) => void;
}) {
  const tErrors = useTranslations("errors");
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined, slot: "desktop" | "mobile") => {
    if (!file) return;
    setUploading(slot);
    try {
      const stored = await uploadsApi.image(file, "banner");
      onChange(
        slot === "desktop"
          ? { ...value, url: stored.url }
          : { ...value, mobileUrl: stored.url },
      );
    } catch (error) {
      toastApiError(error, tErrors);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border border-border/50 p-4">
      <div>
        <p className="text-sm font-medium">Optional hero image</p>
        <p className="text-xs text-muted-foreground">
          Recommended 1200×900 (4:3). Leave empty to show real product cards instead. Uploaded
          through the normal image pipeline and attached when you save.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            slot: "desktop" as const,
            label: "Desktop image",
            url: value.url,
            ref: desktopRef,
          },
          {
            slot: "mobile" as const,
            label: "Mobile image (optional)",
            url: value.mobileUrl,
            ref: mobileRef,
          },
        ].map((item) => (
          <div key={item.slot} className="grid gap-2 rounded-lg border border-border/60 p-3">
            <p className="text-xs font-medium">{item.label}</p>
            {item.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt=""
                className="aspect-4/3 w-full rounded-md object-cover"
                style={{ objectPosition: `${value.focalX}% ${value.focalY}%` }}
              />
            ) : (
              <div className="grid aspect-4/3 place-items-center rounded-md bg-muted/40 text-xs text-muted-foreground">
                No image
              </div>
            )}
            <input
              ref={item.ref}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => upload(event.target.files?.[0], item.slot)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading !== null}
                onClick={() => item.ref.current?.click()}
              >
                {uploading === item.slot ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <ImagePlus aria-hidden className="size-4" />
                )}
                Upload
              </Button>
              {item.url ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange(item.slot === "desktop" ? { ...value, url: "" } : { ...value, mobileUrl: "" })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          aria-label="Hero image alt text Bangla"
          lang="bn"
          maxLength={120}
          value={value.altBn}
          placeholder="ছবির বর্ণনা (বাংলা)"
          onChange={(event) => onChange({ ...value, altBn: event.target.value })}
        />
        <Input
          aria-label="Hero image alt text English"
          lang="en"
          maxLength={120}
          value={value.altEn}
          placeholder="Image description (English)"
          onChange={(event) => onChange({ ...value, altEn: event.target.value })}
        />
        <label className="grid gap-1 text-xs">
          Focal point X (%)
          <Input
            type="number"
            min={0}
            max={100}
            value={value.focalX}
            onChange={(event) => onChange({ ...value, focalX: Number(event.target.value) })}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Focal point Y (%)
          <Input
            type="number"
            min={0}
            max={100}
            value={value.focalY}
            onChange={(event) => onChange({ ...value, focalY: Number(event.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}

function HomeSettingsFields({
  definitions,
  values,
  errors,
  locale,
  lastChange,
  onChange,
  onReset,
}: {
  definitions: AdminSettingDefinition[];
  values: AdminSettings;
  errors: Record<string, string>;
  locale: string;
  lastChange: (key: string) => { createdAt: string; updatedById: string | null } | undefined;
  onChange: (key: string, value: unknown) => void;
  onReset: (key: string, value: unknown) => void;
}) {
  const byKey = new Map(definitions.map((definition) => [definition.key, definition]));
  const headline = byKey.get("home.hero.headline");
  const subheadline = byKey.get("home.hero.subheadline");
  const image = byKey.get("home.hero.image");
  const title = byKey.get("home.highlights.title");
  const highlightKeys = definitions.filter(
    (definition) =>
      definition.key.startsWith("home.highlights.") && definition.key !== "home.highlights.title",
  );

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
        <h3 className="font-heading text-base font-semibold">Home hero</h3>
        {headline ? (
          <LocalizedEditor
            id="home-hero-headline"
            label="Headline"
            hint={headline.helpEn}
            maxLength={60}
            value={asLocalized(values[headline.key], headline.default as LocalizedValue)}
            onChange={(value) => onChange(headline.key, value)}
          />
        ) : null}
        {subheadline ? (
          <LocalizedEditor
            id="home-hero-subheadline"
            label="Subheadline"
            hint={subheadline.helpEn}
            maxLength={140}
            value={asLocalized(values[subheadline.key], subheadline.default as LocalizedValue)}
            onChange={(value) => onChange(subheadline.key, value)}
          />
        ) : null}
        {image ? (
          <HeroImageEditor
            value={asHeroImage(values[image.key] ?? image.default)}
            onChange={(value) => onChange(image.key, value)}
          />
        ) : null}
        {errors["home.hero.headline"] || errors["home.hero.subheadline"] ? (
          <p className="text-xs text-destructive">
            {errors["home.hero.headline"] ?? errors["home.hero.subheadline"]}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
        <h3 className="font-heading text-base font-semibold">Home highlights</h3>
        <p className="text-xs text-muted-foreground">
          Manage slides in <strong>Home → Highlights</strong>. These settings control the whole
          section. Turning it off removes the section, heading and gap from the home page.
        </p>
        {title ? (
          <LocalizedEditor
            id="home-highlights-title"
            label="Section title"
            hint="Leave both empty to hide the heading."
            maxLength={40}
            value={asLocalized(values[title.key], title.default as LocalizedValue)}
            onChange={(value) => onChange(title.key, value)}
          />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {highlightKeys.map((definition) => (
            <SettingField
              key={definition.key}
              definition={definition}
              value={values[definition.key]}
              locale={locale}
              last={lastChange(definition.key)}
              error={errors[definition.key]}
              onChange={(value) => onChange(definition.key, value)}
              onReset={() => onReset(definition.key, definition.default)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

