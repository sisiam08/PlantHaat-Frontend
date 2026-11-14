import { expect, test } from "@playwright/test";

const CUSTOMER = { email: "customer2@planthaat.test", password: "CustomerDemo1" };

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  const ok = await page.evaluate(
    async ([e, p]) => {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });
      return res.ok;
    },
    [email, password],
  );
  expect(ok).toBeTruthy();
}

test.describe("storefront", () => {
  test("home feed renders products", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible({ timeout: 30_000 });
  });

  test("/products list, sort and infinite scroll", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded", timeout: 60000 });
    const cards = page.locator('a[href^="/products/"]');
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
    const initial = await cards.count();
    expect(initial).toBeGreaterThan(0);

    await page.locator('[data-slot="select-trigger"]:visible').first().click();
    await page.getByRole("option").nth(1).click();
    await expect(page).toHaveURL(/sort=price_asc/);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2500);
    expect(await cards.count()).toBeGreaterThanOrEqual(initial);
  });

  test("header search shows suggestions", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    if ((page.viewportSize()?.width ?? 1280) < 768) {
      await page.locator("header button:has(svg.lucide-search)").click();
    }
    const input = page.locator("input[cmdk-input]:visible").first();
    await input.fill("mons");
    await expect(page.getByText(/Monstera|মনস্টেরা/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("wishlist add shows on the wishlist page", async ({ page, baseURL }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await login(page, CUSTOMER.email, CUSTOMER.password);
    const product = await page.evaluate(async () => {
      const res = await fetch("/api/v1/products?limit=1");
      const json = await res.json();
      return json.data[0] as { id: string; name: string };
    });
    const added = await page.evaluate(
      async (id) =>
        (await fetch(`/api/v1/wishlist/${id}`, { method: "POST", headers: { "x-theme": "" } })).status,
      product.id,
    );
    expect([200, 201]).toContain(added);

    await page.goto("/wishlist", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.getByText(product.name).first()).toBeVisible({ timeout: 30_000 });
    await page.evaluate(
      async (id) => fetch(`/api/v1/wishlist/${id}`, { method: "DELETE" }),
      product.id,
    );
    void baseURL;
  });

  test("sessions page renders for a logged-in user", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await login(page, CUSTOMER.email, CUSTOMER.password);
    await page.goto("/account/sessions", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/সেশন|sessions/i).first()).toBeVisible({ timeout: 30_000 });
  });
});
