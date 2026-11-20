"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { ApiError } from "@/lib/api/common";
import type { PublicUser } from "@/lib/api/types";
import { useAuth } from "../auth-provider";
import { toastApiError } from "./error-toast";
import { FormField } from "./form-field";

/**
 * Compact login used inside the session-expired dialog. Same fields,
 * PasswordInput, validation and API error vocabulary as the login page; no
 * navigation and no credentials in the URL.
 */
export function SessionLoginForm({
  onSuccess,
}: {
  onSuccess: (user: PublicUser) => void | Promise<void>;
}) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const { login } = useAuth();
  const hydrated = useHydrated();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z.object({
    email: z.string().min(1, t("validation.required")).email(t("validation.email")),
    password: z.string().min(1, t("validation.password")),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values);
      await onSuccess(user);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "generic";
      const message = tErrors.has(code) ? tErrors(code) : tErrors("generic");
      setFormError(message);
      toastApiError(error, tErrors);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      method="post"
      className="grid gap-3"
      noValidate
      inert={!hydrated}
      aria-busy={!hydrated || isSubmitting}
      data-session-login
    >
      <FormField
        label={t("email")}
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        label={t("password")}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="cta"
        size="lg"
        loading={isSubmitting}
        disabled={!hydrated || isSubmitting}
      >
        {t("signIn")}
      </Button>
    </form>
  );
}
