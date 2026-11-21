import { expect, test } from "@playwright/test";

/**
 * Cart/checkout layout stability under late data. The API is deliberately
 * slowed so the district/address refresh happens well after first paint; the
 * reserved geometry and keep-previous-data path must still hold CLS <= 0.1.
 */
test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const CLS_LIMIT = 0.1;

async function login(page: import("@playwright/test").Page) {
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "customer1@planthaat.test", password: "CustomerDemo1" }),
    });
    return response.status;
  });
  expect(status).toBe(200);
}

async function seedCart(page: import("@playwright/test").Page) {
  const shops = await page.evaluate(async () => {
    await fetch("/api/v1/cart", { method: "DELETE" });
    const list = await fetch("/api/v1/products?limit=50").then((response) => response.json());
    const seen = new Set<string>();
    for (const item of list.data) {
      if (seen.size >= 3) break;
      const product = await fetch(`/api/v1/products/${item.slug}`).then((response) =>
        response.json(),
      );
      const shop = product.data.shop?.id ?? product.data.shopId;
      if (!shop || seen.has(shop)) continue;
      const variant = product.data.variants.find(
        (entry: { stockQty: number }) => entry.stockQty > 0,
      );
      if (!variant) continue;
      seen.add(shop);
      await fetch("/api/v1/cart/items", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
      });
    }
    return seen.size;
  });
  expect(shops).toBe(3);
}

async function cls(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  return page.evaluate(() => {
    const entries = (window as unknown as { __clsEntries?: { value: number; hadRecentInput: boolean }[] })
      .__clsEntries ?? [];
    return entries
      .filter((entry) => !entry.hadRecentInput)
      .reduce((sum, entry) => sum + entry.value, 0);
  });
}

for (const locale of ["en", "bn"] as const) {
  test(`home and header CLS <= ${CLS_LIMIT} (${locale})`, async ({ page, context }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ] as const) {
      await page.setViewportSize(viewport);
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
      await page.addInitScript(() => {
        (window as unknown as { __clsEntries: unknown[] }).__clsEntries = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as {
            value: number;
            hadRecentInput: boolean;
          }[]) {
            (window as unknown as { __clsEntries: unknown[] }).__clsEntries.push({
              value: entry.value,
              hadRecentInput: entry.hadRecentInput,
            });
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      const value = await cls(page, "/");
      expect(value, `home CLS ${viewport.width} ${locale} ${value.toFixed(3)}`).toBeLessThanOrEqual(
        CLS_LIMIT,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  });

  test(`cart and checkout CLS <= ${CLS_LIMIT} with a slowed API (${locale})`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
    ]);
    await page.addInitScript(() => {
      (window as unknown as { __clsEntries: unknown[] }).__clsEntries = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[]) {
          (window as unknown as { __clsEntries: unknown[] }).__clsEntries.push({
            value: entry.value,
            hadRecentInput: entry.hadRecentInput,
          });
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await login(page);
    await seedCart(page);

    await page.route("**/api/v1/**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    const cartCls = await cls(page, "/cart");
    expect(cartCls, `cart CLS ${cartCls.toFixed(3)}`).toBeLessThanOrEqual(CLS_LIMIT);

    const checkoutCls = await cls(page, "/checkout");
    expect(checkoutCls, `checkout CLS ${checkoutCls.toFixed(3)}`).toBeLessThanOrEqual(CLS_LIMIT);
  });
}
