import { expect, test } from "@playwright/test";

const ROUTES = [
  ["home", "/"],
  ["catalog", "/products"],
  ["pdp", "/products/money-tree-bonsai-xokk"],
  ["shops", "/shops"],
  ["login", "/login"],
  ["register", "/register"],
  ["cart", "/cart"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["404", "/this-page-does-not-exist"],
] as const;

for (const width of [1280, 390] as const) {
  test.describe(`design conformance ${width}`, () => {
    for (const [name, route] of ROUTES) {
      test(`${name}: one h1, one main, stable page shell`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 90000 });
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 30000 });
        await page.waitForTimeout(500);

        const audit = await page.evaluate(() => {
          const cs = (el: Element) => getComputedStyle(el);
          const h1s = [...document.querySelectorAll<HTMLElement>("h1")].filter(
            (el) => el.getBoundingClientRect().height > 0,
          );
          const container = document.querySelector<HTMLElement>("[data-page-container]");
          return {
            mains: document.querySelectorAll("main").length,
            h1s: h1s.map((el) => ({
              text: el.innerText.trim(),
              size: cs(el).fontSize,
              weight: cs(el).fontWeight,
            })),
            containerPadding: container ? cs(container).paddingLeft : null,
            overflow:
              document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });

        expect(audit.overflow, `${name} horizontal overflow`).toBeLessThanOrEqual(1);
        expect(audit.mains, `${name} main landmark count`).toBeLessThanOrEqual(1);
        expect(audit.h1s, `${name} h1 count`).toHaveLength(1);
        expect(audit.h1s[0].text.length, `${name} h1 text`).toBeGreaterThan(0);
        expect(["24px", "30px", "36px", "48px", "60px"], `${name} h1 scale`).toContain(
          audit.h1s[0].size,
        );
        if (container) {
          expect(audit.containerPadding, `${name} container padding`).toBe("16px");
        }
      });
    }
  });
}
