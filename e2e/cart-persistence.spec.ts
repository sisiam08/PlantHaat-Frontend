import { expect, test } from "@playwright/test";

test.setTimeout(180_000);

const EMAIL = "customer4@planthaat.test";
const PASSWORD = "CustomerDemo1";

async function apiLogin(page: import("@playwright/test").Page) {
  return page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    { email: EMAIL, password: PASSWORD },
  );
}

async function serverCartCount(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const cart = await (await fetch("/api/v1/cart")).json();
    return cart.data.shops.reduce(
      (sum: number, shop: { items: { quantity: number }[] }) =>
        sum + shop.items.reduce((lineSum, item) => lineSum + item.quantity, 0),
      0,
    );
  });
}

test("guest merge happens once, order clears everything, no replay", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(await apiLogin(page)).toBe(200);
  await page.evaluate(async () => {
    await fetch("/api/v1/cart", { method: "DELETE" });
    await fetch("/api/v1/auth/logout", { method: "POST" });
  });
  await context.clearCookies();

  const snapshot = await page.evaluate(async () => {
    const product = await (await fetch("/api/v1/products/spray-bottle-2l-adli")).json();
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

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator("form").getByRole("button", { name: /log in|লগ ইন/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  await expect.poll(() => serverCartCount(page)).toBe(1);
  expect(
    await page.evaluate(() => localStorage.getItem("ph_guest_cart_v1")),
  ).toBe("[]");

  await page.goto("/checkout", { waitUntil: "networkidle" });
  await expect(page.locator("[data-place-order]")).toBeVisible();
  await page.locator("[data-place-order]").click();
  await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 30_000 });
  expect(await serverCartCount(page)).toBe(0);
  expect(
    await page.evaluate(() => localStorage.getItem("ph_guest_cart_v1")),
  ).toBe("[]");

  await page.goto("/cart", { waitUntil: "networkidle" });
  await expect(page.getByText(/empty|খালি/i).first()).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  expect(await serverCartCount(page)).toBe(0);

  await page.evaluate(() => fetch("/api/v1/auth/logout", { method: "POST" }));
  await context.clearCookies();
  expect(await apiLogin(page)).toBe(200);
  await page.goto("/cart", { waitUntil: "networkidle" });
  expect(await serverCartCount(page)).toBe(0);

  const second = await context.newPage();
  await second.goto("/cart", { waitUntil: "networkidle" });
  expect(await serverCartCount(second)).toBe(0);
  await second.close();

  await context.clearCookies({ name: "ph_web_at" });
  await page.goto("/cart", { waitUntil: "networkidle" });
  expect(await serverCartCount(page)).toBe(0);
});
