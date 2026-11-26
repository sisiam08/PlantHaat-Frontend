import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "../src/server/cookie-names";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
const CUSTOMER = { email: "buyer1@teststack.local", password: "TestBuyer123!" };

test.setTimeout(180_000);
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
});

async function loginViaUi(page: Page, user = CUSTOMER) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  const submit = page.locator('form:has(input[name="email"]) button[type="submit"]');
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await submit.click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

async function killSession(page: Page, context: BrowserContext) {
  const refresh = (await context.cookies()).find((cookie) => cookie.name === REFRESH_COOKIE);
  expect(refresh).toBeTruthy();
  await page.evaluate(async () => {
    await fetch("/api/v1/auth/logout-all", { method: "POST" });
  });
  await context.clearCookies();
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
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
      value: refresh!.value,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function seedGuestCart(page: Page): Promise<string> {
  const snapshot = await page.evaluate(async () => {
    const product = await (await fetch("/api/v1/products/money-tree-bonsai-xokk")).json();
    const variant = product.data.variants.find((entry: { stockQty: number }) => entry.stockQty > 0);
    return {
      variantId: variant.id,
      snapshot: {
        productName: product.data.name,
        variantName: variant.name,
        slug: product.data.slug,
        priceDisplay: `৳${variant.price}`,
        unitPrice: variant.price,
        imageUrl: product.data.imageUrl ?? null,
        shopName: product.data.shop?.name ?? null,
      },
    };
  });
  await page.evaluate(({ variantId, snapshot }) => {
    localStorage.setItem(
      "ph_guest_cart_v1",
      JSON.stringify([{ variantId, quantity: 1, snapshot }]),
    );
    localStorage.setItem("ph_guest_cart_v1_updated_at", String(Date.now()));
    localStorage.removeItem("ph_guest_cart_v1_handled_at");
  }, snapshot);
  return snapshot.variantId;
}

test("a guest can browse every public storefront page without a session prompt", async ({
  page,
}) => {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const search = page.locator("header input").first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill("aloe");
    await page.waitForTimeout(400);
  }
  await page.goto(`${BASE}/products/money-tree-bonsai-xokk`, {
    waitUntil: "commit",
    timeout: 30_000,
  });
  await page.waitForTimeout(1_000);
  await expect(page.locator("[data-session-expired-dialog]")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      document.cookie.split("; ").some((part) => part.startsWith("ph_session_expired=")),
    ),
  ).toBe(false);
});

test("guest checkout shows Login required, then returns to checkout with the cart", async ({
  page,
}) => {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const variantId = await seedGuestCart(page);
  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  const checkout = page.locator("[data-guest-checkout]");
  await expect(checkout).toBeVisible({ timeout: 30_000 });
  await checkout.click();

  const dialog = page.locator("[data-session-expired-dialog]");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toHaveAttribute("data-auth-prompt", "required");
  await expect(dialog).toContainText("Login required");
  await expect(dialog).toContainText("Please log in to continue with checkout.");
  const link = dialog.locator("[data-session-login-page]");
  await expect(link).toHaveAttribute(
    "href",
    /\/login\?returnTo=%2Fcheckout&reason=auth-required/,
  );

  await link.click();
  await page.waitForURL(/\/login\?/, { timeout: 30_000 });
  const submit = page.locator('form:has(input[name="email"]) button[type="submit"]');
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[name="email"]').fill(CUSTOMER.email);
  await page.locator('input[name="password"]').fill(CUSTOMER.password);
  await submit.click();
  await page.waitForURL(/\/checkout$/, { timeout: 30_000 });
  const cartCount = await page.evaluate(async () => {
    const cart = await (await fetch("/api/v1/cart")).json();
    return cart.data.shops.reduce(
      (sum: number, shop: { items: { quantity: number }[] }) =>
        sum + shop.items.reduce((lineSum, item) => lineSum + item.quantity, 0),
      0,
    );
  });
  expect(cartCount).toBeGreaterThanOrEqual(1);
  const hasVariant = await page.evaluate(async (id) => {
    const cart = await (await fetch("/api/v1/cart")).json();
    return cart.data.shops.some((shop: { items: { variantId: string }[] }) =>
      shop.items.some((item) => item.variantId === id),
    );
  }, variantId);
  expect(hasVariant).toBe(true);
  await expect(page.locator("[data-session-expired-dialog]")).toHaveCount(0);
});

test("a previously authenticated customer browses publicly, but checkout shows Session expired", async ({
  page,
  context,
}) => {
  await loginViaUi(page);
  await killSession(page, context);

  await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);
  await expect(page.locator("[data-session-expired-dialog]")).toHaveCount(0);

  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).pathname).toBe("/checkout");
  const dialog = page.locator("[data-session-expired-dialog]");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toHaveAttribute("data-auth-prompt", "expired");
  await expect(dialog).toContainText("Your session has expired.");
  await expect(dialog).toContainText("continue with checkout");
  await expect(dialog.locator("[data-session-login-page]")).toHaveAttribute(
    "href",
    /returnTo=%2Fcheckout.*reason=session-expired/,
  );

  await dialog.locator("[data-session-login-page]").click();
  await page.waitForURL(/\/login\?/, { timeout: 30_000 });
  await page.locator('input[name="email"]').fill(CUSTOMER.email);
  await page.locator('input[name="password"]').fill(CUSTOMER.password);
  await page.locator('form:has(input[name="email"]) button[type="submit"]').click();
  await page.waitForURL(/\/checkout$/, { timeout: 30_000 });
  await expect(page.locator("[data-session-expired-dialog]")).toHaveCount(0);
});
