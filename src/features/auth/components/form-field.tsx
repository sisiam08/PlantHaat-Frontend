"use client";

import { forwardRef, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";
import { PasswordPolicyInfo, PasswordRequirements } from "./password-policy";

interface FormFieldProps extends ComponentProps<typeof Input> {
  label: string;
  error?: string;
  /** Show the new-password requirements and the info popover. */
  passwordPolicy?: boolean;
  policyValue?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, id, name, className, type, passwordPolicy, policyValue = "", ...props },
  ref,
) {
  const fieldId = id ?? name;
  const policyId = `${fieldId}-password-policy`;
  const showPolicy = Boolean(passwordPolicy && policyValue.length > 0);
  const describedBy = [
    error && !showPolicy ? `${fieldId}-error` : null,
    showPolicy ? policyId : null,
  ]
    .filter(Boolean)
    .join(" ");
  const shared = {
    id: fieldId,
    name,
    ref,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    className: cn(error && !showPolicy && "border-destructive", className),
    ...props,
  };
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-1">
        <Label htmlFor={fieldId}>{label}</Label>
        {passwordPolicy ? <PasswordPolicyInfo /> : null}
      </div>
      {type === "password" ? <PasswordInput {...shared} /> : <Input type={type} {...shared} />}
      {showPolicy ? <PasswordRequirements value={policyValue} id={policyId} /> : null}
      {error && !showPolicy ? (
        <p id={`${fieldId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
});
