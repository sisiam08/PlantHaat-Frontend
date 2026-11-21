import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const SELLER = { email: "seller1@planthaat.test", password: "SellerDemo1" };

async function signIn(page: Page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const status = await page.evaluate(async (creds) => {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(creds),
    });
    return response.status;
  }, SELLER);
  expect(status).toBe(200);
}

async function sellerRoutes(page: Page) {
  const data = await page.evaluate(async () => {
    const get = async (url: string) => (await fetch(url)).json();
    const [products, orders, shop] = await Promise.all([
      get("/api/v1/seller/products"),
      get("/api/v1/seller/orders"),
      get("/api/v1/seller/shop"),
    ]);
    return {
      productId: products?.data?.[0]?.id,
      orderId: orders?.data?.[0]?.id,
      complaintId: null,
      shopSlug: shop?.data?.slug,
    };
  });
  return [
    ["dashboard", "/seller/dashboard"],
    ["products", "/seller/products"],
    ["product-new", "/seller/products/new"],
    data.productId && ["product-edit", `/seller/products/${data.productId}`],
    ["orders", "/seller/orders"],
    data.orderId && ["order-detail", `/seller/orders/${data.orderId}`],
    ["earnings", "/seller/earnings"],
    ["payout-accounts", "/seller/payout-accounts"],
    ["complaints", "/seller/complaints"],
    ["reviews", "/seller/reviews"],
    ["questions", "/seller/questions"],
    ["shop", "/seller/shop"],
    ["delivery-zones", "/seller/delivery-zones"],
    ["analytics", "/seller/analytics"],
    ["cancellations", "/seller/cancellation-requests"],
    ["apply", "/seller/apply"],
    data.shopSlug && ["storefront-public", `/shops/${data.shopSlug}`],
  ].filter((entry): entry is [string, string] => Boolean(entry));
}

test.describe.configure({ mode: "serial" });
test.setTimeout(600_000);

for (const locale of ["bn", "en"] as const) {
  for (const viewport of [
    { name: "1280", width: 1280, height: 900 },
    { name: "360", width: 360, height: 800 },
  ] as const) {
    test(`seller pages are consistent and axe-clean ${locale} ${viewport.name}`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signIn(page);
      for (const [name, route] of await sellerRoutes(page)) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
          await page.waitForTimeout(1200);
          if (await page.locator("[data-session-expired-dialog]").isVisible().catch(() => false)) {
            await signIn(page);
            continue;
          }
          break;
        }
        await expect(page.locator("main h1").first()).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(400);
        const state = await page.evaluate(() => ({
          h1: document.querySelectorAll("main h1").length,
          allH1: document.querySelectorAll("h1").length,
          pageHeader: Boolean(document.querySelector("[data-page-header]")),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          rawEnum: /\b[A-Z]{3,}_[A-Z0-9_]{2,}\b/.test(document.body.innerText),
        }));
        expect(state.h1, `${name} one page h1`).toBe(1);
        expect(state.allH1, `${name} one h1 total`).toBe(1);
        expect(state.overflow, `${name} overflow`).toBeLessThanOrEqual(1);
        if (name !== "storefront-public") {
          expect(state.pageHeader, `${name} PageHeader`).toBe(true);
        }
        expect(state.rawEnum, `${name} raw enum`).toBe(false);
        const results = await new AxeBuilder({ page }).analyze();
        expect(
          results.violations.map((violation) => ({
            page: name,
            id: violation.id,
            nodes: violation.nodes.length,
          })),
        ).toEqual([]);
      }
    });
  }
}

test("earnings/payout and apply overlap are canonical", async ({ page }) => {
  await signIn(page);
  await page.goto("/seller/earnings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("tab", { name: /payout profile|পেআউট প্রোফাইল/i })).toHaveCount(0);
  await expect(page.locator('a[href="/seller/payout-accounts"]').first()).toBeVisible();
  await expect(page.locator('nav a[href="/seller/apply"]')).toHaveCount(0);
  await page.goto("/seller/products", { waitUntil: "domcontentloaded" });
  const remove = page.getByRole("button", { name: /^remove$|^মুছুন$/i }).first();
  await remove.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: /cancel|বাতিল/i }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});
