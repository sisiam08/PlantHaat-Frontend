import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function walk(dir: string): string[] {
  const full = join(ROOT, dir);
  const entries: string[] = [];
  for (const name of readdirSync(full)) {
    const path = join(full, name);
    const stats = statSync(path);
    if (stats.isDirectory()) entries.push(...walk(join(dir, name)));
    else if (/\.(ts|tsx)$/.test(name)) entries.push(path);
  }
  return entries;
}

/**
 * Next 16 Cache Components fails the build with "blocking route: new Date()"
 * when a Server Component reads the clock during prerender. Dashboard ranges
 * must go through `resolveDashboardRange`, which requests a dynamic connection
 * first; this guard keeps a future page from re-introducing the bare call.
 */
describe("dashboard server ranges", () => {
  it("server pages never call presetBounds before a dynamic connection", () => {
    const offenders: string[] = [];
    for (const dir of ["src/app/(admin)", "src/app/(seller)"]) {
      for (const file of walk(dir)) {
        if (!file.endsWith("page.tsx")) continue;
        if (readFileSync(file, "utf8").includes("presetBounds(")) {
          offenders.push(relative(ROOT, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("server analytics helpers never default-evaluate presetBounds", () => {
    const offenders: string[] = [];
    const files = [
      "src/features/admin/server.ts",
      "src/features/seller/server.ts",
      "src/features/admin/components/analytics-strip-server.tsx",
      "src/features/seller/components/seller-health-strip-server.tsx",
    ];
    for (const file of files) {
      if (readFileSync(join(ROOT, file), "utf8").includes("presetBounds(")) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("requests connection() before reading the current time", () => {
    const source = readFileSync(join(ROOT, "src/server/dashboard-range.ts"), "utf8");
    const connectionAt = source.indexOf("await connection()");
    const boundsAt = source.indexOf("presetBounds(");
    expect(connectionAt).toBeGreaterThan(-1);
    expect(boundsAt).toBeGreaterThan(connectionAt);
  });
});
