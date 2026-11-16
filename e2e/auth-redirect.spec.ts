import { expect, test } from "@playwright/test";

test.setTimeout(120_000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@planthaat.local";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  const status = await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    { email, password },
  );
  expect(status).toBe(200);
}

for (const locale of ["en", "bn"] as const) {
  test(`logged-in ${locale} users cannot open login or register`, async ({ page, context }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" }]);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await login(page, "customer1@planthaat.test", "CustomerDemo1");

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/$|\/products|\/orders/);
    await expect(page.locator('input[name="password"]')).toHaveCount(0);

    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[name="password"]')).toHaveCount(0);

    await page.goto("/login?next=/orders", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/orders$/);

    await page.goto("/login?next=https://evil.example/steal", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/$|\/products|\/orders/);
  });
}

test("seller and admin are redirected to their dashboards", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await login(page, "seller1@planthaat.test", "SellerDemo1");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/seller\/dashboard$/, { timeout: 30_000 });

  test.skip(!ADMIN_PASSWORD, "ADMIN_PASSWORD is not set");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/admin$/, { timeout: 30_000 });
});

test("stale cookies render login and are cleared", async ({ page, context }) => {
  await context.addCookies([
    { name: "ph_at", value: "stale-invalid-token", domain: "localhost", path: "/" },
    { name: "ph_rt", value: "stale-invalid-refresh", domain: "localhost", path: "/" },
  ]);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 30_000 });
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "ph_at")).toBeUndefined();
  expect(cookies.find((cookie) => cookie.name === "ph_rt")).toBeUndefined();
});

test("Back after login does not show the form", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await login(page, "customer1@planthaat.test", "CustomerDemo1");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
});
