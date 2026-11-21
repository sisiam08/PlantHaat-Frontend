import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "../src/server/cookie-names";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
const USERS = {
  customer: { email: "buyer1@teststack.local", password: "TestBuyer123!" },
  customer2: { email: "buyer2@teststack.local", password: "TestBuyer123!" },
  seller: { email: "seller1@teststack.local", password: "TestSeller123!" },
  admin: { email: "admin@teststack.local", password: "TestAdmin123!" },
};

test.setTimeout(240_000);
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
});

async function login(page: Page, user: { email: string; password: string }) {
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
  expect(status).toBe(200);
}

async function signedIn(page: Page, user: { email: string; password: string }, path = "/") {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await login(page, user);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
}

/**
 * Revokes the session server-side but leaves the browser holding the revoked
 * refresh token and an expired access token. This is the "dead session" the
 * dialog handles: the next request 401s and the refresh is rejected.
 */
async function killSession(page: Page, context: BrowserContext) {
  const before = await context.cookies();
  const refresh = before.find((cookie) => cookie.name === REFRESH_COOKIE);
  expect(refresh).toBeTruthy();
  await page.evaluate(async () => {
    await fetch("/api/v1/auth/logout-all", { method: "POST" });
  });
  await context.clearCookies();
  await context.addCookies([
    {
      // Keep an (invalid) access cookie: the backend's OriginGuard needs a
      // Bearer for a mutation, and the API must answer 401 (not 403) so the
      // client refresh path runs.
      name: ACCESS_COOKIE,
      value: "expired.invalid.jwt",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: REFRESH_COOKIE,
      value: refresh!.value,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function fillLogin(page: Page, user: { email: string; password: string }) {
  const dialog = page.locator("[data-session-expired-dialog]");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await dialog.locator('input[name="email"]').fill(user.email);
  await dialog.locator('input[name="password"]').fill(user.password);
  await dialog.locator('button[type="submit"]').click();
}

test("an expired session on a public-page action opens the dialog and keeps page state", async ({
  page,
  context,
}) => {
  await signedIn(page, USERS.customer, "/products");
  const search = page.locator("header input").first();
  await search.fill("aloe");
  await page.waitForTimeout(300);

  await killSession(page, context);
  const heart = page.locator("[data-card-wishlist]").first();
  await heart.scrollIntoViewIfNeeded();
  const scrollAtAction = await page.evaluate(() => window.scrollY);
  await heart.click();

  const dialog = page.locator("[data-session-expired-dialog]");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toContainText("Your session has expired.");
  await expect(dialog).toContainText("Log in again to continue.");
  await expect(page).not.toHaveURL(/\/login/);

  // Wrong password: inline message, dialog stays.
  await dialog.locator('input[name="email"]').fill(USERS.customer.email);
  await dialog.locator('input[name="password"]').fill("wrong-password");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByRole("alert")).toContainText(/Incorrect email or password/i);
  await expect(dialog).toBeVisible();

  // Correct password closes it, refetches and keeps the header search value.
  await dialog.locator('input[name="password"]').fill(USERS.customer.password);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText("You're back, please try again.")).toBeVisible();
  expect(page.url()).toContain("/products");
  await expect(search).toHaveValue("aloe");
  // The dialog's scroll lock is released on close; the page keeps its position.
  await page.waitForTimeout(500);
  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(Math.abs(scrollAfter - scrollAtAction)).toBeLessThan(120);
});

test("a dead session on a protected navigation renders the dialog at the same URL", async ({
  page,
  context,
}) => {
  await signedIn(page, USERS.customer, "/products");
  await killSession(page, context);
  const response = await page.goto(`${BASE}/orders`, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/orders");
  const dialog = page.locator("[data-session-expired-dialog]");
  await expect(dialog).toBeVisible({ timeout: 30_000 });

  // Escape cannot dismiss a protected dead session.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  await fillLogin(page, USERS.customer);
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/orders$/, { timeout: 30_000 });
  await expect(page.locator("main h1").first()).toBeVisible({ timeout: 30_000 });
});

test("Escape and Back: protected dialog stays, public page allows dismiss", async ({
  page,
  context,
}) => {
  await signedIn(page, USERS.customer, "/products");
  await page.goto(`${BASE}/orders`, { waitUntil: "domcontentloaded" });
  await killSession(page, context);
  await page.reload({ waitUntil: "domcontentloaded" });
  const dialog = page.locator("[data-session-expired-dialog]");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  if (new URL(page.url()).pathname === "/products") {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  }
});

test("a different account logs in: full reload and no previous data", async ({ page, context }) => {
  await signedIn(page, USERS.customer, "/products");
  await killSession(page, context);
  await page.locator("[data-card-wishlist]").first().click();
  const dialog = page.locator("[data-session-expired-dialog]");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => {
    (window as unknown as { __docMarker?: boolean }).__docMarker = true;
  });
  await fillLogin(page, USERS.customer2);
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect
    .poll(async () => page.evaluate(() => (window as unknown as { __docMarker?: boolean }).__docMarker))
    .toBeUndefined();
  await page.waitForTimeout(800);
  await expect(page.locator("header").getByRole("button").first()).toBeVisible();
});

/**
 * Points the browser at a non-existent refresh session without the realtime
 * revocation event. Used when a test wants the dialog to come only from the
 * client refresh/broadcast path.
 */
async function breakSessionLocally(context: BrowserContext) {
  await context.clearCookies();
  await context.addCookies([
    {
      name: ACCESS_COOKIE,
      value: "expired.invalid.jwt",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: REFRESH_COOKIE,
      value: "11111111-1111-4111-8111-111111111111.deadsecret",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("two tabs: the dialog opens in both and closes after login", async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await signedIn(first, USERS.customer, "/products");
  await second.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
  await expect(second.getByRole("banner")).toBeVisible();

  await breakSessionLocally(context);
  const firstDialog = first.locator("[data-session-expired-dialog]");
  const secondDialog = second.locator("[data-session-expired-dialog]");
  // The realtime ticket (a POST) notices the dead session and broadcasts to
  // both tabs; no page action is needed.
  await expect(firstDialog).toBeVisible({ timeout: 30_000 });
  await expect(secondDialog).toBeVisible({ timeout: 30_000 });

  await fillLogin(first, USERS.customer);
  await expect(firstDialog).toBeHidden({ timeout: 30_000 });
  await expect(secondDialog).toBeHidden({ timeout: 30_000 });
  await second.close();
});

test("seller and admin protected navigations use the same dialog", async ({ context }) => {
  for (const [user, path] of [
    [USERS.seller, "/seller/dashboard"],
    [USERS.admin, "/admin"],
  ] as const) {
    const page = await context.newPage();
    await signedIn(page, user, path);
    await killSession(page, context);
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    expect(new URL(page.url()).pathname).toBe(path);
    const dialog = page.locator("[data-session-expired-dialog]");
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await fillLogin(page, user);
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`), { timeout: 30_000 });
    await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: 30_000 });
    await page.close();
  }
});

test("dialog is axe clean, keyboard trapped and localized", async ({ page, context }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "bn", domain: "localhost", path: "/" }]);
  await signedIn(page, USERS.customer, "/");
  await killSession(page, context);
  await page.goto(`${BASE}/orders`, { waitUntil: "domcontentloaded" });
  const dialog = page.locator("[data-session-expired-dialog]");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toContainText("আপনার সেশনের মেয়াদ শেষ হয়েছে।");
  await expect(dialog).toContainText("চালিয়ে যেতে আবার লগইন করুন।");

  const results = await new AxeBuilder({ page }).include("[data-session-expired-dialog]").analyze();
  expect(
    results.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length })),
  ).toEqual([]);

  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => Boolean(document.activeElement?.closest("[data-session-expired-dialog]")),
      ),
    ).toBe(true);
  }
});

test("public pages stay quiet until an auth action", async ({ page }) => {
  await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-session-expired-dialog]")).toHaveCount(0);
  await page.waitForTimeout(2_000);
  await expect(page.locator("[data-session-expired-dialog]")).toHaveCount(0);
});
