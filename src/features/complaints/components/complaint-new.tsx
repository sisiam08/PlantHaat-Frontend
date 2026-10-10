"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { complaintsApi, type ComplaintType } from "../api";

const TYPES: ComplaintType[] = [
  "DAMAGED_PLANT",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NOT_DELIVERED",
  "LATE_DELIVERY",
  "OTHER",
];

export function ComplaintNew({ shopOrderId }: { shopOrderId: string }) {
  const t = useTranslations("complaints");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const schema = z.object({
    type: z.string().min(1, t("validation.type")),
    description: z.string().min(10, t("validation.description")),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: "", description: "" },
  });

  const create = useMutation({
    mutationFn: (values: Values) =>
      complaintsApi.create({
        shopOrderId,
        type: values.type as ComplaintType,
        description: values.description,
      }),
    onSuccess: (complaint) => {
      toast.success(t("submitted"));
      router.replace(`/complaints/${complaint.id}`);
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const onSubmit = form.handleSubmit((values) => create.mutate(values));

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="type">{t("type")}</Label>
        <select
          id="type"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          {...form.register("type")}
        >
          <option value="">{t("selectType")}</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </select>
        {form.formState.errors.type ? (
          <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea id="description" rows={5} {...form.register("description")} />
        {form.formState.errors.description ? (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        ) : null}
      </div>

      <Button type="submit" variant="cta" disabled={create.isPending}>
        {t("submit")}
      </Button>
    </form>
  );
}
