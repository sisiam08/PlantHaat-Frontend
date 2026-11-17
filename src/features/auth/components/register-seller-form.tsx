"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "../auth-provider";
import { toastApiError } from "./error-toast";
import { FormField } from "./form-field";

const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;

export function RegisterSellerForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const { registerSeller } = useAuth();
  const router = useRouter();

  const schema = z.object({
    name: z.string().min(1, t("validation.required")),
    email: z.string().min(1, t("validation.required")).email(t("validation.email")),
    businessName: z.string().min(1, t("validation.required")),
    contactPhone: z.string().regex(BD_PHONE, t("validation.phone")),
    sellerType: z.enum(["NURSERY", "INDIVIDUAL_GROWER", "RESELLER"]),
    password: z
      .string()
      .min(8, t("validation.passwordMin"))
      .regex(/(?=.*[A-Za-z])(?=.*\d)/, t("validation.passwordStrength")),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      businessName: "",
      contactPhone: "",
      sellerType: "NURSERY",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerSeller(values);
      toast.success(t("registerSuccess"));
      router.replace("/seller/apply");
    } catch (error) {
      toastApiError(error, tErrors);
    }
  });

  return (
    <form onSubmit={onSubmit} method="post" className="grid gap-4" noValidate>
      <FormField label={t("name")} autoComplete="name" error={errors.name?.message} {...register("name")} />
      <FormField
        label={t("email")}
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        label={t("businessName")}
        autoComplete="organization"
        error={errors.businessName?.message}
        {...register("businessName")}
      />
      <FormField
        label={t("contactPhone")}
        type="tel"
        inputMode="tel"
        error={errors.contactPhone?.message}
        {...register("contactPhone")}
      />
      <div className="grid gap-1.5">
        <label htmlFor="sellerType" className="text-sm font-medium">
          {t("sellerType")}
        </label>
        <select
          id="sellerType"
          className="h-10 rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          {...register("sellerType")}
        >
          <option value="NURSERY">{t("sellerTypeNursery")}</option>
          <option value="INDIVIDUAL_GROWER">{t("sellerTypeIndividual")}</option>
          <option value="RESELLER">{t("sellerTypeReseller")}</option>
        </select>
      </div>
      <FormField
        label={t("password")}
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" variant="cta" size="lg" loading={isSubmitting}>
        {t("sellerTitle")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
