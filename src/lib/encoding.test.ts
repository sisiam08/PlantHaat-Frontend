import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BAD = ["\u00c3", "\u00c2", "\u00e2\u20ac", "\u00e0\u00a6", "\u00e0\u00a7", "\uFFFD"];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(ts|tsx|json)$/.test(entry.name) ? [path] : [];
  });
}

describe("encoding", () => {
  it("contains no mojibake sequences", () => {
    const bad: string[] = [];
    for (const file of [...files("src"), ...files("e2e")]) {
      const text = readFileSync(file, "utf8");
      if (BAD.some((pattern) => text.includes(pattern))) bad.push(file);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});
