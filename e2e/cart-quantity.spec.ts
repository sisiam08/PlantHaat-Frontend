import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

async function guestItems(request: import("@playwright/test").APIRequestContext) {
  const slugs = ["spray-bottle-2l-adli", "watering-can-5l-c8nm"];
  const items = [];
  for (const slug of slugs) {
    const response = await request.get(`/api/v1/products/${slug}`, {
      headers: { origin: "http://localhost:3000" },
    });
    const product = (await response.json()).data;
    const variant = product.variants.find((entry: { stockQty: number }) => entry.stockQty > 0);
    items.push({
      variantId: variant.id,
      quantity: 1,
      snapshot: {
        productName: product.name,
        variantName: variant.sizeLabel || variant.name,
        slug,
        priceDisplay: `৳${variant.price}`,
        unitPrice: variant.price,
        imageUrl: product.imageUrl ?? null,
        shopName: product.shop?.name ?? null,
      },
    });
  }
  return items;
}

test.describe("cart quantity resilience", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);
  });
  test("logged-in: rapid + keeps totals and reconciles with the server", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const login = await page.evaluate(async () => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "customer1@planthaat.test", password: "CustomerDemo1" }),
      });
      return response.status;
    });
    expect(login).toBe(200);

    await page.evaluate(async () => {
      await fetch("/api/v1/cart", { method: "DELETE" });
      const list = await fetch("/api/v1/products?limit=50").then((r) => r.json());
      const shops = new Set<string>();
      for (const item of list.data) {
        if (shops.size >= 3) break;
        const product = await fetch(`/api/v1/products/${item.slug}`).then((r) => r.json());
        const shop = product.data.shop?.id ?? product.data.shopId;
        if (!shop || shops.has(shop)) continue;
        const variant = product.data.variants.find(
          (entry: { stockQty: number }) => entry.stockQty > 0,
        );
        if (!variant) continue;
        shops.add(shop);
        await fetch("/api/v1/cart/items", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
        });
      }
    });

    await page.goto("/cart", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await expect(page.locator("[data-shop-total]")).toHaveCount(3);

    await page.route("**/api/v1/cart/items**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    const plus = page.locator('button[aria-label*="ncrease"],button[aria-label*="বাড়ান"]').first();
    for (let index = 0; index < 10; index++) {
      await plus.click({ noWaitAfter: true });
      await page.waitForTimeout(45);
      const state = await page.evaluate(() => ({
        totals: [...document.querySelectorAll("[data-shop-total]")].map((node) =>
          node.textContent?.trim(),
        ),
        unavailable:
          document.body.innerText.includes("does not deliver") ||
          document.body.innerText.includes("doesn't deliver"),
      }));
      expect(state.totals).toHaveLength(3);
      expect(state.totals.every((value) => Boolean(value))).toBe(true);
      expect(state.unavailable).toBe(false);
    }

    let server;
    let displayed;
    for (let attempt = 0; attempt < 18; attempt++) {
      await page.waitForTimeout(1000);
      server = await page.evaluate(async () => {
        const response = await fetch("/api/v1/cart?districtId=18");
        return (await response.json()).data;
      });
      displayed = await page.evaluate(() => {
        const read = (selector: string) =>
          document.querySelector(selector)?.textContent?.replace(/[^0-9]/g, "") ?? "";
        const text = document.body.innerText;
        return {
          subtotal: read("[data-cart-subtotal]"),
          grand: read("[data-cart-grand]"),
          unavailable: text.includes("does not deliver") || text.includes("doesn't deliver"),
          checkout: [...document.querySelectorAll("a")].some(
            (link) =>
              link.textContent?.trim() === "Checkout" && link.getAttribute("href") === "/checkout",
          ),
        };
      });
      if (displayed.subtotal === server.subtotal && displayed.grand === server.grandTotal) break;
    }
    expect(displayed!.subtotal).toBe(server.subtotal);
    expect(displayed!.grand).toBe(server.grandTotal);
    expect(displayed!.unavailable).toBe(false);
    expect(displayed!.checkout).toBe(true);
  });

  test("guest: rapid + keeps line totals visible", async ({ page, request }) => {
    const items = await guestItems(request);
    await page.addInitScript((seed) => {
      localStorage.setItem("ph_guest_cart_v1", JSON.stringify(seed));
    }, items);
    await page.goto("/cart", { waitUntil: "networkidle" });
    await expect(page.locator(".price-currency")).toHaveCount(4);

    const plus = page.locator('button[aria-label*="ncrease"],button[aria-label*="বাড়ান"]').first();
    for (let index = 0; index < 10; index++) {
      await plus.click({ noWaitAfter: true });
      await page.waitForTimeout(40);
      const state = await page.evaluate(() => ({
        prices: [...document.querySelectorAll(".price-currency")].map((node) =>
          node.parentElement?.textContent?.trim(),
        ),
        unavailable: document.body.innerText.includes("does not deliver"),
      }));
      expect(state.prices.length).toBeGreaterThanOrEqual(4);
      expect(state.prices.every(Boolean)).toBe(true);
      expect(state.unavailable).toBe(false);
    }
  });
});
