"use client";

import { Check, Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PASSWORD_REQUIREMENTS,
  missingPasswordRequirements,
  type PasswordRequirement,
} from "@/lib/auth/password-policy";
import { cn } from "@/lib/utils";

const REQUIREMENT_LABEL: Record<PasswordRequirement, string> = {
  length: "passwordReqLength",
  uppercase: "passwordReqUppercase",
  lowercase: "passwordReqLowercase",
  number: "passwordReqNumber",
  special: "passwordReqSpecial",
};

const MISSING_LABEL: Record<PasswordRequirement, string> = {
  length: "passwordMissingLength",
  uppercase: "passwordMissingUppercase",
  lowercase: "passwordMissingLowercase",
  number: "passwordMissingNumber",
  special: "passwordMissingSpecial",
};

export function PasswordPolicyInfo() {
  const t = useTranslations("auth");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("passwordInfoLabel")}
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Info aria-hidden className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-72 p-3">
        <p className="text-sm font-medium">{t("passwordRequirements")}</p>
        <ul className="mt-2 grid gap-1.5 text-xs text-muted-foreground">
          {PASSWORD_REQUIREMENTS.map((requirement) => (
            <li key={requirement} className="flex items-start gap-1.5">
              <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-current" />
              {t(REQUIREMENT_LABEL[requirement])}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function PasswordRequirements({
  value,
  id,
}: {
  value: string;
  id?: string;
}) {
  const t = useTranslations("auth");
  if (value.length === 0) return null;
  const missing = missingPasswordRequirements(value);
  return (
    <ul
      id={id}
      aria-live="polite"
      className={cn("grid gap-1 text-xs", missing.length ? "text-destructive" : "text-success")}
    >
      {missing.length ? (
        missing.map((requirement) => (
          <li key={requirement} className="flex items-start gap-1.5">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-current" />
            {t(MISSING_LABEL[requirement])}
          </li>
        ))
      ) : (
        <li className="flex items-center gap-1.5">
          <Check aria-hidden className="size-3.5" />
          {t("passwordReqMet")}
        </li>
      )}
    </ul>
  );
}
