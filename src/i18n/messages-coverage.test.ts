import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const MESSAGES = {
  en: JSON.parse(readFileSync(join(SRC, "messages", "en.json"), "utf8")),
  bn: JSON.parse(readFileSync(join(SRC, "messages", "bn.json"), "utf8")),
} as const;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : [];
  });
}

function hasKey(messages: unknown, path: string): boolean {
  return (
    path.split(".").reduce<unknown>((value, part) => {
      if (value && typeof value === "object" && part in value) {
        return (value as Record<string, unknown>)[part];
      }
      return undefined;
    }, messages) !== undefined
  );
}

describe("message key coverage", () => {
  it("every literal t() key exists in en and bn", () => {
    const missing: string[] = [];

    for (const file of walk(SRC)) {
      const source = readFileSync(file, "utf8");
      if (!/useTranslations|getTranslations/.test(source)) continue;

      const bindings = [
        ...source.matchAll(
          /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
        ),
      ];
      if (bindings.length === 0) continue;
      const scopes = [
        ...new Set(
          bindings.flatMap((match) => {
            const scope = match[2];
            if (!scope.includes("${")) return [scope];
            return ["seller", "admin", "customer"].map((role) => scope.replace(/\$\{\w+\}/g, role));
          }),
        ),
      ];
      const variables = [...new Set(bindings.map((match) => match[1]))];

      const keys = new Set<string>();
      for (const variable of variables) {
        const call = new RegExp(
          String.raw`\b${variable}(?:\.rich|\.markup|\.has)?\(\s*["'\`]([^"'\`$]+)["'\`]`,
          "g",
        );
        for (const match of source.matchAll(call)) {
          if (match[1].includes(" ")) continue;
          keys.add(match[1]);
        }
      }

      for (const key of keys) {
        for (const locale of ["en", "bn"] as const) {
          const found = scopes.some((scope) => hasKey(MESSAGES[locale], `${scope}.${key}`));
          if (!found) {
            missing.push(`${locale}: ${file}: "${key}" not found under ${scopes.join(", ")}`);
          }
        }
      }
    }

    expect([...new Set(missing)], missing.join("\n")).toEqual([]);
  });
});
