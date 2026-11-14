import { expect, test } from "@playwright/test";

const WIDTHS = [360, 640, 768, 1024, 1280, 1440, 1920];
const ALLOWED_COLUMNS = [2, 3, 4, 6];
test.setTimeout(90_000);

async function skeletonGrid(page: import("@playwright/test").Page) {
  await expect
    .poll(() => page.locator("[data-product-skeleton]").count(), { timeout: 8000 })
    .toBeGreaterThan(0);
  return page.evaluate(() => {
    const grid = [...document.querySelectorAll("[data-product-grid]")].find((element) =>
      element.querySelector("[data-product-skeleton]"),
    );
    if (!grid) return null;
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
      skeletons: grid.querySelectorAll("[data-product-skeleton]").length,
    };
  });
}

for (const width of WIDTHS) {
  test.describe(`skeleton rows ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("catalog next-page skeleton fills complete rows", async ({ page }) => {
      await page.goto("/products", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      await page.route("**/api/v1/products**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        await route.continue();
      });

      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }),
      );
      await page.waitForTimeout(1000);

      const info = await skeletonGrid(page);
      expect(info).not.toBeNull();
      expect(ALLOWED_COLUMNS).toContain(info!.columns);
      expect(info!.skeletons).toBe(24);
      expect(info!.skeletons % info!.columns).toBe(0);

      if (width === 1280 || width === 360) {
        await page.screenshot({ path: `../docs/design-review/skeletons-products-${width}.png` });
      }

      await page.unrouteAll({ behavior: "ignoreErrors" });
    });

    test("home load-more skeleton fills complete rows", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      await page.route("**/api/v1/products**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        await route.continue();
      });

      const loadMore = page.getByRole("button", { name: /Load more|আরও/ }).last();
      await loadMore.scrollIntoViewIfNeeded();
      await loadMore.evaluate((button) => (button as HTMLButtonElement).click());
      await page.waitForTimeout(800);

      const info = await skeletonGrid(page);
      expect(info).not.toBeNull();
      expect(ALLOWED_COLUMNS).toContain(info!.columns);
      expect(info!.skeletons).toBe(12);
      expect(info!.skeletons % info!.columns).toBe(0);

      if (width === 1280 || width === 360) {
        await page.screenshot({ path: `../docs/design-review/skeletons-feed-${width}.png` });
      }

      await page.unrouteAll({ behavior: "ignoreErrors" });
    });
  });
}
