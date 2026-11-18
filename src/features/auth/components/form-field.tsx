"use client";

import { forwardRef, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";

interface FormFieldProps extends ComponentProps<typeof Input> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, id, name, className, type, ...props },
  ref,
) {
  const fieldId = id ?? name;
  const shared = {
    id: fieldId,
    name,
    ref,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${fieldId}-error` : undefined,
    className: cn(error && "border-destructive", className),
    ...props,
  };
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      {type === "password" ? <PasswordInput {...shared} /> : <Input type={type} {...shared} />}
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
});
