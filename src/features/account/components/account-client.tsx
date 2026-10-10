"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { toastApiError } from "@/features/auth/components/error-toast";
import { FormField } from "@/features/auth/components/form-field";
import { accountApi } from "../api";

export function AccountClient() {
  const t = useTranslations("account");
  const tErrors = useTranslations("errors");
  const { user, refreshUser } = useAuth();

  const profileSchema = z.object({
    name: z.string().min(2, t("validation.name")),
    phone: z.string().optional(),
  });
  type ProfileValues = z.infer<typeof profileSchema>;
  const profile = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const onProfile = profile.handleSubmit(async (values) => {
    try {
      await accountApi.updateProfile({ name: values.name, phone: values.phone || undefined });
      await refreshUser();
      toast.success(t("saved"));
    } catch (error) {
      toastApiError(error, tErrors);
    }
  });

  const passwordSchema = z.object({
    currentPassword: z.string().min(1, t("validation.required")),
    newPassword: z.string().min(8, t("validation.password")),
  });
  type PasswordValues = z.infer<typeof passwordSchema>;
  const password = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const onPassword = password.handleSubmit(async (values) => {
    try {
      await accountApi.changePassword(values.currentPassword, values.newPassword);
      toast.success(t("passwordChanged"));
      password.reset();
    } catch (error) {
      toastApiError(error, tErrors);
    }
  });

  if (!user) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onProfile} className="grid gap-4" noValidate>
            <FormField
              label={t("name")}
              error={profile.formState.errors.name?.message}
              {...profile.register("name")}
            />
            <FormField
              label={t("phone")}
              inputMode="tel"
              error={profile.formState.errors.phone?.message}
              {...profile.register("phone")}
            />
            <p className="text-sm text-muted-foreground">
              {t("email")}: {user.email}
            </p>
            <div>
              <Button type="submit" disabled={profile.formState.isSubmitting}>
                {t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("password")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onPassword} className="grid gap-4" noValidate>
            <FormField
              label={t("currentPassword")}
              type="password"
              autoComplete="current-password"
              error={password.formState.errors.currentPassword?.message}
              {...password.register("currentPassword")}
            />
            <FormField
              label={t("newPassword")}
              type="password"
              autoComplete="new-password"
              error={password.formState.errors.newPassword?.message}
              {...password.register("newPassword")}
            />
            <div>
              <Button type="submit" disabled={password.formState.isSubmitting}>
                {t("changePassword")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
