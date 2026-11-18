import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const SHARED = "components/ui/password-input.tsx";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx?|jsx?)$/.test(entry) ? [full] : [];
  });
}

describe("shared PasswordInput guard", () => {
  const files = walk(SRC).map((file) => ({
    path: relative(SRC, file).replaceAll("\\", "/"),
    text: readFileSync(file, "utf8"),
  }));

  it("has no raw <input type=\"password\"> outside the shared component", () => {
    const offenders = files.filter(
      (file) => file.path !== SHARED && /<input[^>]*type=["']password["']/i.test(file.text),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it("has no <Input type=\"password\"> outside the shared component", () => {
    const offenders = files.filter(
      (file) => file.path !== SHARED && /<Input[^>]*type=["']password["']/i.test(file.text),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it("routes FormField password fields through PasswordInput", () => {
    const formField = files.find((file) => file.path === "features/auth/components/form-field.tsx");
    expect(formField?.text).toContain("PasswordInput");
    expect(formField?.text).toContain('type === "password"');
  });

  it("keeps a single password toggle button implementation", () => {
    const owners = files.filter((file) => file.text.includes("data-password-toggle"));
    expect(owners.map((file) => file.path)).toEqual([SHARED]);
  });
});
