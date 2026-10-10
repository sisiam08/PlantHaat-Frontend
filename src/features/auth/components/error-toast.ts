import { toast } from "sonner";

import { ApiError } from "@/lib/api/common";

type Translate = (key: string) => string;
type HasKey = (key: string) => boolean;

interface ErrorTranslator {
  (key: string): string;
  has: HasKey;
}

export function toastApiError(error: unknown, tErrors: ErrorTranslator): void {
  const code = error instanceof ApiError ? error.code : "generic";
  const message = tErrors.has(code) ? tErrors(code) : tErrors("generic");
  toast.error(message);
}

export type { ErrorTranslator, Translate };
