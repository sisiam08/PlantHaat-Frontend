import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PUBLIC_DIRS = ["src/app/(public)", "src/app/(customer)", "src/components/layout"];
const DASHBOARD_DIR = "src/components/dashboard";

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

describe("dashboard code isolation", () => {
  it("public and customer routes never import the dashboard kit or private panels", () => {
    const offenders: string[] = [];
    for (const dir of PUBLIC_DIRS) {
      for (const file of walk(dir)) {
        // The private admin/seller shell lives in components/layout by design.
        if (file.endsWith("dashboard-shell.tsx")) continue;
        const source = readFileSync(file, "utf8");
        if (
          /from\s+"@\/components\/dashboard/.test(source) ||
          /from\s+"@\/features\/(admin|seller)/.test(source)
        ) {
          offenders.push(relative(ROOT, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("dashboard primitives do not depend on admin/seller feature code", () => {
    const offenders: string[] = [];
    for (const file of walk(DASHBOARD_DIR)) {
      const source = readFileSync(file, "utf8");
      if (/from\s+"@\/features\/(admin|seller)/.test(source)) {
        offenders.push(relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
