import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 1280, height: 800 },
];

async function clickVisibleProductCard(page: import("@playwright/test").Page) {
  const point = await page.evaluate(() => {
    const links = [...document.querySelectorAll(".group\\/card a")] as HTMLElement[];
    const link = links.find((entry) => {
      const rect = entry.getBoundingClientRect();
      return rect.bottom > 90 && rect.top < window.innerHeight - 150;
    });
    if (!link) return null;
    const rect = link.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: Math.min(Math.max(rect.top + rect.height / 2, 100), window.innerHeight - 140),
    };
  });
  expect(point, "a visible product card").not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

async function applyInStockAndSort(page: import("@playwright/test").Page, width: number) {
  if (width < 1024) {
    await page
      .getByRole("button", { name: /ফিল্টার|Filters/ })
      .first()
      .click();
    await page.locator('[role="dialog"][data-state="open"]').waitFor({ timeout: 15_000 });
    await page.locator("#filter-in-stock:visible").click();
    await expect(page).toHaveURL(/inStock=true/);
    await page.keyboard.press("Escape");
  } else {
    await page.locator("#filter-in-stock").click();
  }
  await page.waitForTimeout(700);

  await page.locator('button[role="combobox"]:visible').first().click();
  await page.locator('[role="option"]').nth(1).click();
  await expect(page).toHaveURL(/sort=price_asc/);
}

for (const viewport of VIEWPORTS) {
  test.describe(`list state ${viewport.width}`, () => {
    test.use({ viewport });

    test("products filters, sort, loaded pages and scroll survive Back", async ({ page }) => {
      await page.goto("/products", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      await applyInStockAndSort(page, viewport.width);

      for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 760);
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(600);

      const before = await page.evaluate(() => window.scrollY);
      const cardsBefore = await page.locator(".group\\/card a").count();
      expect(before).toBeGreaterThan(1800);
      expect(cardsBefore).toBeGreaterThan(24);

      await clickVisibleProductCard(page);
      await page.waitForURL(/\/products\/[^/?]+/);
      await page.goBack();
      await page.waitForTimeout(3000);

      expect(page.url()).toContain("inStock=true");
      expect(page.url()).toContain("sort=price_asc");
      expect(await page.locator(".group\\/card a").count()).toBeGreaterThanOrEqual(cardsBefore);
      const after = await page.evaluate(() => window.scrollY);
      expect(Math.abs(after - before)).toBeLessThanOrEqual(50);
    });

    test("home feed and rail scroll survive Back", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 700);
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(500);

      const before = await page.evaluate(() => window.scrollY);
      expect(before).toBeGreaterThan(1800);

      await clickVisibleProductCard(page);
      await page.waitForURL(/\/products\/[^/?]+/);
      await page.goBack();
      await page.waitForTimeout(3000);

      const after = await page.evaluate(() => window.scrollY);
      expect(Math.abs(after - before)).toBeLessThanOrEqual(50);
    });
  });
}
