import { expect, test } from "@playwright/test";

test.setTimeout(300_000);
const BENGALI_DIGITS = /[\u09E6-\u09EF]/;

test("Bangla pages use Latin digits and the taka sign leads amounts", async ({ page, context }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "bn", domain: "localhost", path: "/" }]);
  await page.setViewportSize({ width: 1280, height: 900 });
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
  const seeded = await page.evaluate(async () => {
    await fetch("/api/v1/cart", { method: "DELETE" });
    for (const [slug, quantity] of [
      ["spray-bottle-2l-adli", 7],
      ["seed-starter-tray-8372", 1],
    ] as const) {
      const product = await (await fetch(`/api/v1/products/${slug}`)).json();
      const variant = product.data.variants.find((entry: { stockQty: number }) => entry.stockQty > 0);
      await fetch("/api/v1/cart/items", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, quantity }),
      });
    }
    return true;
  });
  expect(seeded).toBe(true);

  const pages = ["/", "/products", "/products/spray-bottle-2l-adli", "/cart", "/checkout", "/orders"];
  for (const path of pages) {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text, `${path} contains Bengali digits`).not.toMatch(BENGALI_DIGITS);
    expect(text, `${path} has an amount with ৳ after it`).not.toMatch(/[\d,]+৳/);
  }

  await page.goto("/products", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: "../docs/design-review/digits/bn-1280.png" });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/products", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: "../docs/design-review/digits/bn-360.png" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: "../docs/design-review/digits/bn-checkout-1280.png" });
});
