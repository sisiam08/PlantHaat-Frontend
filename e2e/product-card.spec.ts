import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

for (const locale of ["en", "bn"] as const) {
  for (const width of [1280]) {
    test(`product card ${locale} ${width}: no shop name, rating row`, async ({ page, context }) => {
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
      let shopNames: string[] = [];
      await page.route("**/api/v1/products?*", async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        if (Array.isArray(json.data)) {
          shopNames = [...new Set(json.data.map((item: { shop?: { name?: string } }) => item.shop?.name).filter(Boolean))] as string[];
          json.data = json.data.map((item: Record<string, unknown>, index: number) => ({
            ...item,
            ratingAvg: index === 0 ? "4.5" : "0",
            ratingCount: index === 0 ? 12 : 0,
          }));
        }
        await route.fulfill({ response, json });
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/products", { waitUntil: "networkidle" });
      await expect(page.locator('[data-slot="card"], a[href^="/products/"]').first()).toBeVisible();
      const cards = page.locator('[data-product-grid] > *');
      await expect(cards.first()).toBeVisible();
      const cardTexts = await cards.evaluateAll((nodes) => nodes.slice(0, 8).map((node) => node.textContent ?? ""));
      for (const text of cardTexts) {
        for (const shop of shopNames) expect(text).not.toContain(shop);
      }
      await expect(page.locator("[data-card-rating]").first()).toContainText("4.5");
      await expect(page.locator("[data-card-rating]").first()).toContainText("(12)");
      const rows = await page.locator("[data-card-rating], [data-card-rating-placeholder]").count();
      expect(rows).toBeGreaterThanOrEqual(cardTexts.length);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `../docs/design-review/product-card/${locale}-${width}.png`,
        fullPage: false,
      });
      await page.setViewportSize({ width: 360, height: 900 });
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `../docs/design-review/product-card/${locale}-360.png`,
        fullPage: false,
      });
    });
  }
}
