import { expect, test } from "@playwright/test";

async function clickVisibleCard(page: import("@playwright/test").Page) {
  const point = await page.evaluate(() => {
    const links = [...document.querySelectorAll("main .group\\/card a")] as HTMLElement[];
    const el = links.find((link) => {
      const r = link.getBoundingClientRect();
      return r.top > 60 && r.bottom < window.innerHeight - 80;
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  expect(point, "a visible product card").not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 1280, height: 800 },
]) {
  test.describe(`list state ${viewport.width}`, () => {
    test.use({ viewport });

    test("products filters, sort and scroll survive Back", async ({ page }) => {
      await page.goto("/products?sort=price_asc&inStock=true", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1600);
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(500);
      const before = await page.evaluate(() => window.scrollY);
      await clickVisibleCard(page);
      await page.waitForTimeout(1200);
      await page.goBack();
      await page.waitForTimeout(2500);
      expect(page.url()).toContain("sort=price_asc");
      expect(page.url()).toContain("inStock=true");
      const after = await page.evaluate(() => window.scrollY);
      expect(Math.abs(after - before)).toBeLessThanOrEqual(50);
    });

    test("home rail scroll survives Back", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1600);
      await page.evaluate(() => window.scrollTo(0, 1200));
      await page.waitForTimeout(500);
      const before = await page.evaluate(() => window.scrollY);
      const point = await page.evaluate(() => {
        const links = [...document.querySelectorAll("[role=region] a[href^='/products/']")] as HTMLElement[];
        const el = links.find((link) => {
          const r = link.getBoundingClientRect();
          return r.top > 60 && r.bottom < window.innerHeight - 80;
        });
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      test.skip(!point, "no rail card in viewport");
      await page.mouse.click(point!.x, point!.y);
      await page.waitForTimeout(1200);
      await page.goBack();
      await page.waitForTimeout(2200);
      const after = await page.evaluate(() => window.scrollY);
      expect(Math.abs(after - before)).toBeLessThanOrEqual(50);
    });
  });
}
