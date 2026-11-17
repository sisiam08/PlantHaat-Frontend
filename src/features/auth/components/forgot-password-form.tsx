"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authApi } from "../api";
import { toastApiError } from "./error-toast";
import { FormField } from "./form-field";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [sent, setSent] = useState(false);

  const schema = z.object({
    email: z.string().min(1, t("validation.required")).email(t("validation.email")),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authApi.forgotPassword(values.email);
      setSent(true);
      toast.success(t("resetSent"));
    } catch (error) {
      toastApiError(error, tErrors);
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {sent ? (
        <Alert>
          <AlertDescription>{t("resetSent")}</AlertDescription>
        </Alert>
      ) : null}
      <FormField
        label={t("email")}
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" variant="cta" size="lg" loading={isSubmitting}>
        {t("sendResetLink")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
