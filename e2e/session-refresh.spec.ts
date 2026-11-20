import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { REFRESH_COOKIE } from "../src/server/cookie-names";

/**
 * Runs against the isolated test stack:
 *   API :5001 (JWT access TTL ~10s), frontend :3002.
 * Start it with backend/scripts/test-stack.ps1 plus the auth test overrides.
 */
test.setTimeout(180_000);
test.describe.configure({ mode: "serial" });

const USERS = {
  customer: { email: "buyer1@teststack.local", password: "TestBuyer123!" },
  customer2: { email: "buyer2@teststack.local", password: "TestBuyer123!" },
  seller: { email: "seller1@teststack.local", password: "TestSeller123!" },
  admin: { email: "admin@teststack.local", password: "TestAdmin123!" },
};

async function loginViaApi(page: Page, user: { email: string; password: string }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const status = await page.evaluate(
      async ({ email, password }) => {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        return response.status;
      },
      user,
    );
    if (status === 200) {
      return;
    }
    // The isolated stack occasionally exceeds the gateway timeout while a
    // first request warms the route/Remote DB. Retry instead of failing the
    // session assertion for an unrelated cold-start hiccup.
    if (attempt < 2) {
      await page.waitForTimeout(1_500);
    } else {
      expect(status).toBe(200);
    }
  }
}

async function useLocale(context: BrowserContext, locale: "en" | "bn") {
  await context.addCookies([
    { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
  ]);
}

const ACCESS_EXPIRED_WAIT = 13_000;

for (const locale of ["en", "bn"] as const) {
  test(`customer stays logged in after the access token expires (${locale})`, async ({
    page,
    context,
  }) => {
    await useLocale(context, locale);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await loginViaApi(page, USERS.customer);
    await page.waitForTimeout(ACCESS_EXPIRED_WAIT);

    await page.goto("/account/sessions", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/account\/sessions$/, { timeout: 30_000 });
    await expect(page.locator("main h1, main h2").first()).toBeVisible();

    const status = await page.evaluate(async () => {
      const response = await fetch("/api/v1/wishlist?page=1");
      return response.status;
    });
    expect(status).toBe(200);
  });
}

test("seller stays logged in after expiry", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await loginViaApi(page, USERS.seller);
  await page.waitForTimeout(ACCESS_EXPIRED_WAIT);
  await page.goto("/seller/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/seller\/dashboard$/, { timeout: 30_000 });
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("admin stays logged in after expiry", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await loginViaApi(page, USERS.admin);
  await page.waitForTimeout(ACCESS_EXPIRED_WAIT);
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("ten parallel requests after expiry share exactly one refresh", async ({
  page,
  context,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await loginViaApi(page, USERS.customer2);
  await page.waitForTimeout(1_000);

  // Use raw Node fetch with only the refresh cookie, so neither background page
  // polling nor a request-context cookie jar can rotate the token first.
  const refresh = (await context.cookies()).find((cookie) => cookie.name === REFRESH_COOKIE);
  expect(refresh).toBeTruthy();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
  const responses = await Promise.all(
    Array.from({ length: 10 }, () =>
      fetch(`${base}/api/v1/notifications/unread-count`, {
        headers: { cookie: `${REFRESH_COOKIE}=${refresh!.value}` },
      }),
    ),
  );
  const results = responses.map((response) => ({
    status: response.status,
    generation: response.headers.get("x-auth-refresh-generation"),
  }));
  expect(results.every((entry) => entry.status === 200)).toBe(true);
  const generations = new Set(
    results.map((entry) => entry.generation).filter((value): value is string => Boolean(value)),
  );
  expect(generations.size).toBe(1);
  expect(results.filter((entry) => entry.generation).length).toBeGreaterThan(0);
});

test("two tabs both survive the access token expiring", async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto("/", { waitUntil: "domcontentloaded" });
  await loginViaApi(first, USERS.customer2);

  // Warm both routes while the access token is valid, so concurrent navigation
  // after expiry measures session handling rather than first-compile latency.
  await first.goto("/orders", { waitUntil: "domcontentloaded" });
  await expect(first).toHaveURL(/\/orders$/, { timeout: 30_000 });
  await second.goto("/wishlist", { waitUntil: "domcontentloaded" });
  await expect(second).toHaveURL(/\/wishlist$/, { timeout: 30_000 });
  await first.goto("/", { waitUntil: "domcontentloaded" });
  await second.goto("/", { waitUntil: "domcontentloaded" });

  await first.waitForTimeout(ACCESS_EXPIRED_WAIT);

  await Promise.all([
    first.goto("/orders", { waitUntil: "domcontentloaded" }),
    second.goto("/wishlist", { waitUntil: "domcontentloaded" }),
  ]);
  await expect(first).toHaveURL(/\/orders$/, { timeout: 30_000 });
  await expect(second).toHaveURL(/\/wishlist$/, { timeout: 30_000 });
  await expect(first.locator("main h1").first()).toBeVisible();
  await expect(second.locator("main h1").first()).toBeVisible();
});

test("revoked session shows the dialog at the same URL and resumes after login", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await loginViaApi(page, USERS.customer);

  await page.evaluate(async () => {
    await fetch("/api/v1/auth/logout-all", { method: "POST" });
  });
  await page.waitForTimeout(ACCESS_EXPIRED_WAIT);

  await page.goto("/orders", { waitUntil: "domcontentloaded" });
  // The dead session must not bounce to /login; the dialog renders at /orders.
  expect(new URL(page.url()).pathname).toBe("/orders");
  const dialog = page.locator("[data-session-expired-dialog]");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  const fallback = dialog.locator("[data-session-login-page]");
  await expect(fallback).toHaveAttribute("href", /returnTo=%2Forders/);

  await dialog.locator('input[name="email"]').fill(USERS.customer.email);
  await dialog.locator('input[name="password"]').fill(USERS.customer.password);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await page.waitForURL(/\/orders$/, { timeout: 30_000 });
  await expect(page.locator("main h1").first()).toBeVisible({ timeout: 30_000 });
});

test("no tokens are stored in localStorage or sessionStorage", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await loginViaApi(page, USERS.customer);
  const stored = await page.evaluate(() => ({
    local: Object.entries(window.localStorage).map(([key, value]) => `${key}=${value}`),
    session: Object.entries(window.sessionStorage).map(([key, value]) => `${key}=${value}`),
  }));
  for (const entry of [...stored.local, ...stored.session]) {
    expect(entry).not.toMatch(/ph_web_at|ph_web_rt|ph_at|ph_rt|eyJ[A-Za-z0-9_-]{10,}/);
  }
});
