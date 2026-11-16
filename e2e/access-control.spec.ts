import { expect, test, type Page } from "@playwright/test";

test.setTimeout(180_000);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@planthaat.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

const PROTECTED = [
  "/checkout",
  "/orders",
  "/account",
  "/wishlist",
  "/notifications",
  "/complaints",
  "/seller/dashboard",
  "/admin",
];

async function login(page: Page, email: string, password: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
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

async function apiStatus(page: Page, path: string) {
  await page.waitForLoadState("domcontentloaded");
  return page.evaluate(async (path) => {
    const response = await fetch(path);
    return response.status;
  }, path);
}

for (const locale of ["en", "bn"] as const) {
  test(`logged-out ${locale}: every private route goes to login via the proxy`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
    ]);
    for (const route of PROTECTED) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login\?returnTo=/, { timeout: 30_000 });
      const url = new URL(page.url());
      expect(url.pathname, route).toBe("/login");
      expect(url.searchParams.get("returnTo"), route).toBe(route);
    }
  });

  test(`customer ${locale}: cannot open seller or admin UI, can apply as seller`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
    ]);
    await login(page, "customer1@planthaat.test", "CustomerDemo1");

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL((url) => url.pathname !== "/admin", { timeout: 30_000 });
    expect(new URL(page.url()).pathname).not.toBe("/admin");
    expect(await page.locator('[data-admin-shell]').count()).toBe(0);

    await page.goto("/seller/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL((url) => url.pathname !== "/seller/dashboard", { timeout: 30_000 });
    expect(new URL(page.url()).pathname).not.toBe("/seller/dashboard");

    await page.goto("/seller/apply", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/seller\/apply$/, { timeout: 30_000 });
    await expect(page.locator("main h1").first()).toBeVisible();

    // Back returns to the page before the denied attempt, not to admin UI.
    await page.goto("/orders", { waitUntil: "domcontentloaded" });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL((url) => url.pathname !== "/admin", { timeout: 30_000 });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    expect(new URL(page.url()).pathname).not.toContain("/admin");

    expect(await apiStatus(page, "/api/v1/admin/users")).toBe(403);
    expect(await apiStatus(page, "/api/v1/seller/products")).toBe(403);
    expect(await apiStatus(page, "/api/v1/wishlist")).toBe(200);
  });

  test(`guest and customer API authorization ${locale}`, async ({ page, context, request }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
    ]);
    expect((await request.get("/api/v1/wishlist")).status()).toBe(401);
    expect((await request.get("/api/v1/admin/users")).status()).toBe(401);
    expect((await request.get("/api/v1/seller/products")).status()).toBe(401);

    await login(page, "customer1@planthaat.test", "CustomerDemo1");
    expect(await apiStatus(page, "/api/v1/admin/users")).toBe(403);
    expect(await apiStatus(page, "/api/v1/seller/products")).toBe(403);
  });

  test(`seller ${locale}: seller UI allowed, admin UI denied`, async ({ page, context }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
    ]);
    await login(page, "seller1@planthaat.test", "SellerDemo1");

    await page.goto("/seller/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/seller\/dashboard$/, { timeout: 30_000 });
    await expect(page.locator("main h1").first()).toBeVisible();

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL((url) => url.pathname !== "/admin", { timeout: 30_000 });
    expect(new URL(page.url()).pathname).not.toBe("/admin");

    expect(await apiStatus(page, "/api/v1/admin/users")).toBe(403);
    expect(await apiStatus(page, "/api/v1/seller/products")).toBe(200);
  });
}

test("admin: admin and seller UI allowed", async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, "ADMIN_PASSWORD is not set");
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  await expect(page.locator("main h1").first()).toBeVisible();

  await page.goto("/seller/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/seller\/dashboard$/, { timeout: 30_000 });
  expect(await apiStatus(page, "/api/v1/admin/users")).toBe(200);
});
