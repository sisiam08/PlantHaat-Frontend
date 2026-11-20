import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SHELL = "src/components/layout/dashboard-shell.tsx";
const ADMIN_ROOT = "src/app/(admin)/admin";
const MESSAGES = JSON.parse(readFileSync("src/messages/en.json", "utf8")) as {
  admin: { nav: Record<string, string> };
};

function navItems(block: "ADMIN_GROUPS" | "SELLER_GROUPS") {
  const source = readFileSync(SHELL, "utf8");
  const start = source.indexOf(`const ${block}`);
  const endMarker = block === "SELLER_GROUPS" ? "const ADMIN_GROUPS" : "function DashboardNav";
  const end = source.indexOf(endMarker, start);
  const text = source.slice(start, end);
  return [...text.matchAll(/href: "([^"]+)", key: "([^"]+)"/g)].map((match) => ({
    href: match[1],
    key: match[2],
  }));
}

function adminPages(dir = ADMIN_ROOT): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (!statSync(path).isDirectory()) return [];
    if (existsSync(join(path, "page.tsx"))) {
      return [path.replace(/\\/g, "/").replace(ADMIN_ROOT, "/admin")];
    }
    return adminPages(path);
  });
}

describe("admin route manifest", () => {
  it("every admin nav link resolves to a real page", () => {
    const missing = navItems("ADMIN_GROUPS").filter((item) => {
      const file = join(
        ADMIN_ROOT,
        item.href === "/admin" ? "page.tsx" : `${item.href.replace("/admin/", "")}/page.tsx`,
      );
      return !existsSync(file);
    });
    expect(missing).toEqual([]);
  });

  it("has no duplicate admin hrefs or labels", () => {
    const items = navItems("ADMIN_GROUPS");
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
  });

  it("has a translated nav label for every admin key", () => {
    const missing = navItems("ADMIN_GROUPS").filter((item) => !(item.key in MESSAGES.admin.nav));
    expect(missing).toEqual([]);
  });

  it("has no orphan admin pages (dynamic detail pages excepted)", () => {
    const navHrefs = new Set(navItems("ADMIN_GROUPS").map((item) => item.href));
    const orphans = adminPages().filter(
      (page) => !navHrefs.has(page) && !page.includes("[") && page !== "/admin",
    );
    expect(orphans).toEqual([]);
  });

  it("keeps every seller nav link resolving (seller panel uses the same shell)", () => {
    const missing = navItems("SELLER_GROUPS").filter((item) => {
      const inGroup = join("src/app/(seller)", item.href, "page.tsx");
      const standalone = join("src/app", item.href, "page.tsx");
      return !existsSync(inGroup) && !existsSync(standalone);
    });
    expect(missing).toEqual([]);
  });
});
