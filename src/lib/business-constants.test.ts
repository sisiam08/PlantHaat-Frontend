import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MESSAGES = ["src/messages/en.json", "src/messages/bn.json"];
const BAD = ["48-hour", "48 hours", "৪৮ ঘণ্টা"];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.") ? [path] : [];
  });
}

describe("settings business constants", () => {
  it("messages do not hard-code the return window", () => {
    const bad: string[] = [];
    for (const file of MESSAGES) {
      const text = readFileSync(file, "utf8");
      if (BAD.some((pattern) => text.includes(pattern))) bad.push(file);
    }
    expect(bad).toEqual([]);
  });

  it("customer pages do not hard-code the return window", () => {
    const bad: string[] = [];
    for (const file of files("src")) {
      const text = readFileSync(file, "utf8");
      if (BAD.some((pattern) => text.includes(pattern))) bad.push(file);
    }
    expect(bad).toEqual([]);
  });
});
