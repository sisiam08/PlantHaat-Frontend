"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { roleHome, useAuth } from "../auth-provider";
import { toastApiError } from "./error-toast";
import { FormField } from "./form-field";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const { register: registerUser } = useAuth();
  const router = useRouter();

  const schema = z
    .object({
      name: z.string().min(1, t("validation.required")),
      email: z.string().min(1, t("validation.required")).email(t("validation.email")),
      phone: z
        .string()
        .optional()
        .refine((value) => !value || /^(?:\+?88)?01[3-9]\d{8}$/.test(value), t("validation.phone")),
      password: z
        .string()
        .min(8, t("validation.passwordMin"))
        .regex(/(?=.*[A-Za-z])(?=.*\d)/, t("validation.passwordStrength")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
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
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const user = await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        ...(values.phone ? { phone: values.phone } : {}),
      });
      toast.success(t("registerSuccess"));
      router.replace(roleHome(user.role));
    } catch (error) {
      toastApiError(error, tErrors);
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
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
        label={t("phone")}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <FormField
        label={t("password")}
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <FormField
        label={t("confirmPassword")}
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Button type="submit" variant="cta" size="lg" loading={isSubmitting}>
        {t("createAccount")}
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
