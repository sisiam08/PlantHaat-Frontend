import "server-only";

import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const serverEnvSchema = z.object({
  API_INTERNAL_URL: z.string().url().default("http://127.0.0.1:5000"),
  BFF_SHARED_SECRET: optionalString,
  BACKEND_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  GATEWAY_MAX_BODY_MB: z.coerce.number().positive().default(12),
  REVALIDATE_SECRET: optionalString,
  SITE_ORIGINS_EXTRA: optionalString,
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid server environment configuration: ${issues}`);
}

export const serverEnv = parsed.data;

export const siteOrigins: string[] = [
  new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").origin,
  ...(serverEnv.SITE_ORIGINS_EXTRA
    ? serverEnv.SITE_ORIGINS_EXTRA.split(",").map((origin) => origin.trim())
    : []),
];
