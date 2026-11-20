import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@teststack.local",
  password: process.env.ADMIN_PASSWORD ?? "TestAdmin123!",
};

test.setTimeout(240_000);
test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const status = await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    ADMIN,
  );
  expect(status).toBe(200);
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
}

async function effectiveValue(page: Page): Promise<string> {
  return (await page.locator("[data-effective-value]:visible").textContent()) ?? "";
}

test("commission: the rules page is the editor and Settings is read-only", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/admin/commission-rules`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-effective-commission]:visible")).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => effectiveValue(page), { timeout: 30_000 })
    .not.toBe("0%");
  const before = await effectiveValue(page);

  await page.locator("#ratePercent").fill("12.34");
  await page.getByRole("button", { name: /^save$/i }).last().click();
  await expect(page.locator("[data-effective-value]:visible")).toHaveText("12.34%", { timeout: 30_000 });

  await page.goto(`${BASE}/admin/settings`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: /wallet/i }).click();
  const readonly = page.locator('[data-setting-key="commission.default"]');
  await expect(readonly).toBeVisible({ timeout: 30_000 });
  await expect(readonly.locator("[data-readonly-value]")).toHaveText("12.34%");
  const link = readonly.getByRole("link", { name: /commission rules/i });
  await expect(link).toHaveAttribute("href", "/admin/commission-rules");

  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${BASE}/admin/commission-rules`, { waitUntil: "domcontentloaded" });
  const deleteButtons = page.getByRole("button", { name: /^delete$/i });
  await deleteButtons.last().click();
  await expect(page.locator("[data-effective-value]:visible")).toHaveText(before, { timeout: 30_000 });
});

test("highlights: the dedicated page is the editor and Settings is a summary", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/admin/highlights`, { waitUntil: "domcontentloaded" });
  const autoplay = page.getByRole("checkbox").first();
  await expect(autoplay).toBeVisible({ timeout: 30_000 });
  const wasChecked = await autoplay.isChecked();
  await autoplay.click();
  await page.waitForTimeout(1200);

  await page.goto(`${BASE}/admin/settings`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: /home/i }).click();
  const summary = page.locator('[data-setting-key="home.highlights"]');
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await expect(summary).toContainText(
    `${"Autoplay"}: ${wasChecked ? "Off" : "On"}`,
  );
  await expect(page.locator('a[href="/admin/highlights"]').first()).toBeVisible();

  await page.goto(`${BASE}/admin/highlights`, { waitUntil: "domcontentloaded" });
  const restore = page.getByRole("checkbox").first();
  if ((await restore.isChecked()) !== wasChecked) await restore.click();
});

test("banners: managed placements are hidden and cannot be created", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/admin/banners`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /banners/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("HOME_HIGHLIGHTS", { exact: true })).toHaveCount(0);
  await page.locator("#bannerPlacement").fill("HOME_HIGHLIGHTS");
  await expect(page.locator("[data-managed-placement]")).toBeVisible();
  await expect(page.getByRole("button", { name: /save/i }).first()).toBeDisabled();
});

test("admin consolidated pages are axe clean at 1280 and 360", async ({ page }) => {
  await login(page);
  for (const path of ["/admin/commission-rules", "/admin/settings", "/admin/highlights"]) {
    for (const width of [1280, 360] as const) {
      await page.setViewportSize({ width, height: width === 360 ? 900 : 1000 });
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} ${width} overflow`).toBeLessThanOrEqual(1);
      const results = await new AxeBuilder({ page }).include("main").analyze();
      expect(
        results.violations.map((violation) => ({
          page: path,
          width,
          id: violation.id,
          nodes: violation.nodes.length,
        })),
      ).toEqual([]);
    }
  }
});
