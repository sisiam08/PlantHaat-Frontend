"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { toastApiError } from "@/features/auth/components/error-toast";
import { FormField } from "@/features/auth/components/form-field";
import { uploadsApi } from "@/features/uploads/api";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { sellerApi } from "../api";
import type { SellerApplication, SellerDocumentType, SellerType } from "../types";
import { DeliveryZonesClient } from "./delivery-zones-client";
import { PayoutAccountsClient } from "./payout-accounts-client";

const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;
const STEPS = ["business", "documents", "shop", "zones", "payouts", "review"] as const;
const DOC_TYPES: SellerDocumentType[] = [
  "NID_FRONT",
  "NID_BACK",
  "TRADE_LICENSE",
  "NURSERY_PHOTO",
  "OTHER",
];

function invalidateApplication(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.seller.application });
}

export function ApplyWizard() {
  const t = useTranslations("seller.apply");
  const tStatus = useTranslations("seller.status");
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);

  const application = useQuery({
    queryKey: queryKeys.seller.application,
    queryFn: sellerApi.getApplication,
    retry: false,
  });

  if (application.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (application.isError || !application.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("title")}</AlertTitle>
        <AlertDescription>{t("loadError")}</AlertDescription>
      </Alert>
    );
  }

  const app = application.data;

  if (app.status === "APPROVED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tStatus("APPROVED")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t("approvedNotice")}</p>
          <div>
            <Button asChild variant="cta">
              <Link href="/seller/dashboard">{t("goToDashboard")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (app.status === "PENDING") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("underReviewTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t("underReviewBody")}</p>
          <div>
            <Button
              variant="outline"
              onClick={() => {
                invalidateApplication(queryClient);
                void refreshUser();
              }}
            >
              {t("refresh")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (app.status === "SUSPENDED") {
    return (
      <Alert variant="destructive">
        <AlertTitle>{tStatus("SUSPENDED")}</AlertTitle>
        <AlertDescription>{t("suspendedNotice")}</AlertDescription>
      </Alert>
    );
  }

  const current = STEPS[step];

  return (
    <div className="grid gap-6">
      {app.status === "REJECTED" ? (
        <Alert variant="destructive">
          <AlertTitle>{t("rejectedTitle")}</AlertTitle>
          <AlertDescription>
            {t("rejectedBody")}
            {app.rejectionReason ? ` — ${app.rejectionReason}` : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((key, index) => (
          <li key={key}>
            <span
              className={cn(
                "inline-flex min-h-8 items-center rounded-full px-3",
                index === step
                  ? "bg-primary text-primary-foreground"
                  : index < step
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}. {t(`steps.${key}`)}
            </span>
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle>{t(`steps.${current}`)}</CardTitle>
        </CardHeader>
        <CardContent>
          {current === "business" ? <BusinessStep application={app} /> : null}
          {current === "documents" ? <DocumentsStep application={app} /> : null}
          {current === "shop" ? <ShopStep application={app} /> : null}
          {current === "zones" ? <DeliveryZonesClient /> : null}
          {current === "payouts" ? <PayoutAccountsClient /> : null}
          {current === "review" ? <ReviewStep application={app} /> : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          {t("back")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {t("stepOf", { current: step + 1, total: STEPS.length })}
        </span>
        <Button
          disabled={step === STEPS.length - 1}
          onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
        >
          {t("next")}
        </Button>
      </div>
    </div>
  );
}

function BusinessStep({ application }: { application: SellerApplication }) {
  const t = useTranslations("seller");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();

  const schema = z.object({
    businessName: z.string().min(2, t("validation.businessName")),
    sellerType: z.enum(["NURSERY", "INDIVIDUAL_GROWER", "RESELLER"]),
    contactPhone: z.string().regex(BD_PHONE, t("validation.phone")),
    businessAddress: z.string().min(1, t("validation.required")),
    tradeLicenseNo: z.string().optional(),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      businessName: application.businessName ?? "",
      sellerType: application.sellerType,
      contactPhone: application.contactPhone ?? "",
      businessAddress: application.businessAddress ?? "",
      tradeLicenseNo: application.tradeLicenseNo ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (input: Values) =>
      sellerApi.updateApplication({
        businessName: input.businessName,
        sellerType: input.sellerType,
        contactPhone: input.contactPhone,
        businessAddress: input.businessAddress,
        tradeLicenseNo: input.tradeLicenseNo || undefined,
      }),
    onSuccess: () => {
      invalidateApplication(queryClient);
      toast.success(t("apply.saved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const onSubmit = form.handleSubmit((values) => save.mutate(values));

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <FormField
        label={t("apply.business.businessName")}
        error={form.formState.errors.businessName?.message}
        {...form.register("businessName")}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="sellerType">{t("apply.business.sellerType")}</Label>
        <select
          id="sellerType"
          className="h-10 rounded-full border border-input bg-background px-4 text-sm"
          {...form.register("sellerType")}
        >
          {SELLER_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`apply.types.${type}`)}
            </option>
          ))}
        </select>
      </div>
      <FormField
        label={t("apply.business.contactPhone")}
        inputMode="tel"
        error={form.formState.errors.contactPhone?.message}
        {...form.register("contactPhone")}
      />
      <FormField
        label={t("apply.business.tradeLicenseNo")}
        error={form.formState.errors.tradeLicenseNo?.message}
        {...form.register("tradeLicenseNo")}
      />
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="businessAddress">{t("apply.business.businessAddress")}</Label>
        <Textarea
          id="businessAddress"
          rows={3}
          aria-invalid={form.formState.errors.businessAddress ? true : undefined}
          {...form.register("businessAddress")}
        />
        {form.formState.errors.businessAddress ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.businessAddress.message}
          </p>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={save.isPending}>
          {t("apply.save")}
        </Button>
      </div>
    </form>
  );
}

const SELLER_TYPES: SellerType[] = ["NURSERY", "INDIVIDUAL_GROWER", "RESELLER"];

function DocumentsStep({ application }: { application: SellerApplication }) {
  const t = useTranslations("seller.apply.documents");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [type, setType] = useState<SellerDocumentType>("NID_FRONT");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) {
        return;
      }
      const { key } = await uploadsApi.document(file);
      await sellerApi.addDocument({ type, fileKey: key });
    },
    onSuccess: () => {
      setFile(null);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      invalidateApplication(queryClient);
      toast.success(t("uploaded"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sellerApi.removeDocument(id),
    onSuccess: () => {
      invalidateApplication(queryClient);
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="docType">{t("type")}</Label>
          <select
            id="docType"
            value={type}
            onChange={(event) => setType(event.target.value as SellerDocumentType)}
            className="h-10 rounded-full border border-input bg-background px-4 text-sm"
          >
            {DOC_TYPES.map((docType) => (
              <option key={docType} value={docType}>
                {t(`docType.${docType}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="docFile">{t("file")}</Label>
          <input
            ref={fileRef}
            id="docFile"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            type="button"
            variant="cta"
            disabled={!file || upload.isPending}
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? t("uploading") : t("upload")}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-2">
        {application.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          application.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-sm"
            >
              <span className="font-medium">{t(`docType.${doc.type}`)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(doc.id)}
              >
                {t("remove")}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ShopStep({ application }: { application: SellerApplication }) {
  const t = useTranslations("seller.apply.shop");
  const tCommon = useTranslations("seller");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const shop = useQuery({
    queryKey: queryKeys.seller.shop,
    queryFn: sellerApi.getShop,
    retry: false,
  });
  const shopData = shop.data;

  const schema = z.object({
    name: z.string().min(2, tCommon("validation.name")),
    description: z.string().optional(),
    phone: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: shopData?.name ?? application.shop?.name ?? "",
      description: shopData?.description ?? "",
      phone: shopData?.phone ?? "",
      district: shopData?.district ?? "",
      address: shopData?.address ?? "",
      logoUrl: shopData?.logoUrl ?? "",
      bannerUrl: shopData?.bannerUrl ?? "",
    },
  });

  const uploadImage = useMutation({
    mutationFn: ({ file, purpose }: { file: File; purpose: "shop-logo" | "shop-banner" }) =>
      uploadsApi.image(file, purpose),
    onSuccess: (stored, variables) => {
      form.setValue(variables.purpose === "shop-logo" ? "logoUrl" : "bannerUrl", stored.url);
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const save = useMutation({
    mutationFn: (values: Values) =>
      sellerApi.updateShop({
        name: values.name,
        description: values.description || undefined,
        phone: values.phone || undefined,
        district: values.district || undefined,
        address: values.address || undefined,
        logoUrl: values.logoUrl || undefined,
        bannerUrl: values.bannerUrl || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.seller.shop });
      invalidateApplication(queryClient);
      toast.success(tCommon("apply.saved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const onSubmit = form.handleSubmit((values) => save.mutate(values));
  const logoUrl = useWatch({ control: form.control, name: "logoUrl" });
  const bannerUrl = useWatch({ control: form.control, name: "bannerUrl" });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormField
        label={t("name")}
        error={form.formState.errors.name?.message}
        {...form.register("name")}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="shopDescription">{t("description")}</Label>
        <Textarea id="shopDescription" rows={3} {...form.register("description")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("phone")} inputMode="tel" {...form.register("phone")} />
        <FormField label={t("district")} {...form.register("district")} />
      </div>
      <FormField label={t("address")} {...form.register("address")} />
      <p className="text-sm text-muted-foreground">{t("slugHint")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="shopLogo">{t("logoUrl")}</Label>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ) : null}
          <input
            ref={logoRef}
            id="shopLogo"
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) {
                uploadImage.mutate({ file: selected, purpose: "shop-logo" });
              }
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="shopBanner">{t("bannerUrl")}</Label>
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="h-16 w-full rounded-xl object-cover" />
          ) : null}
          <input
            ref={bannerRef}
            id="shopBanner"
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) {
                uploadImage.mutate({ file: selected, purpose: "shop-banner" });
              }
            }}
          />
        </div>
      </div>

      <div>
        <Button type="submit" disabled={save.isPending || uploadImage.isPending}>
          {tCommon("apply.save")}
        </Button>
      </div>
    </form>
  );
}

function ReviewStep({ application }: { application: SellerApplication }) {
  const t = useTranslations("seller.apply.review");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  const zones = useQuery({
    queryKey: queryKeys.seller.deliveryZones,
    queryFn: sellerApi.listZones,
    retry: false,
  });

  const missing: string[] = [];
  if (!application.businessName?.trim()) missing.push("businessName");
  if (!application.contactPhone?.trim()) missing.push("contactPhone");
  if (!application.businessAddress?.trim()) missing.push("businessAddress");
  if (application.documents.length === 0) missing.push("documents");
  if (!application.shop) missing.push("shop");
  if ((zones.data?.filter((zone) => zone.isActive).length ?? 0) === 0) missing.push("deliveryZone");

  const verified = Boolean(user?.emailVerifiedAt);

  const submit = useMutation({
    mutationFn: sellerApi.submitApplication,
    onSuccess: async () => {
      invalidateApplication(queryClient);
      await refreshUser();
      toast.success(t("submitted"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  return (
    <div className="grid gap-4">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <SummaryRow label={t("business")} value={application.businessName || "—"} />
        <SummaryRow label={t("documents")} value={String(application.documents.length)} />
        <SummaryRow label={t("shop")} value={application.shop?.name ?? "—"} />
        <SummaryRow label={t("zones")} value={String(zones.data?.length ?? 0)} />
      </dl>

      <div className="flex items-center gap-2 text-sm">
        <Badge variant={verified ? "default" : "destructive"}>
          {verified ? t("verified") : t("emailHint")}
        </Badge>
      </div>

      {missing.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>{t("missingTitle")}</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {missing.map((key) => (
                <li key={key}>{t(`missingItems.${key}`)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button
          type="button"
          variant="cta"
          disabled={submit.isPending || missing.length > 0 || !verified}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-xl border border-border bg-card px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
