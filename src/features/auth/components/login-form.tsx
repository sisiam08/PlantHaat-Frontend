"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { sanitizeReturnTo } from "@/lib/navigation";
import { roleHome, useAuth } from "../auth-provider";
import { toastApiError } from "./error-toast";
import { FormField } from "./form-field";

export function LoginForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const { login } = useAuth();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const sessionExpired = searchParams.get("reason") === "session-expired";

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
    try {
      const user = await login(values);
      toast.success(t("loginSuccess"));
      if (sessionExpired) {
        // The previous account's cached data must not survive re-auth; a full
        // document load also re-renders the server-rewritten protected route.
        queryClient.clear();
        window.location.assign(returnTo ?? roleHome(user.role));
        return;
      }
      router.replace(returnTo ?? roleHome(user.role));
    } catch (error) {
      toastApiError(error, tErrors);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      method="post"
      className="grid gap-4"
      noValidate
      inert={!hydrated}
      aria-busy={!hydrated}
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
      <div className="flex justify-end">
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none text-sm">
          {t("forgotPassword")}
        </Link>
      </div>
      <Button
        type="submit"
        variant="cta"
        size="lg"
        loading={isSubmitting}
        disabled={!hydrated || isSubmitting}
      >
        {t("signIn")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}
