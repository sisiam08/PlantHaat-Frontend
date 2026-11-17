"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authApi } from "../api";
import { toastApiError } from "./error-toast";
import { FormField } from "./form-field";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const schema = z
    .object({
      newPassword: z
        .string()
        .min(8, t("validation.passwordMin"))
        .regex(/(?=.*[A-Za-z])(?=.*\d)/, t("validation.passwordStrength")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("validation.required"),
    });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authApi.resetPassword(token, values.newPassword);
      toast.success(t("passwordReset"));
      router.replace("/login");
    } catch (error) {
      toastApiError(error, tErrors);
    }
  });

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("verifyFailed")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormField
        label={t("password")}
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <FormField
        label={t("confirmPassword")}
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Button type="submit" variant="cta" size="lg" loading={isSubmitting}>
        {t("resetPassword")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
