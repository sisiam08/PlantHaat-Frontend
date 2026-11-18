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

for (const width of [1440, 390] as const) {
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
        if (audit.containerPadding !== null) {
          expect(audit.containerPadding, `${name} container padding`).toBe("16px");
        }
      });
    }
  });
}

/**
 * System-level checks that the earlier page-shell batch did not cover:
 * copy/encoding, Latin price digits with the taka sign leading, heading
 * rhythm, 44px primary/nav targets and duplicate-free home rails.
 */
for (const width of [1440, 390] as const) {
  test.describe(`design system ${width}`, () => {
    for (const [name, route] of ROUTES) {
      test(`${name}: copy, prices, headings, targets`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 90000 });
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 30000 });
        await page.waitForTimeout(500);

        const audit = await page.evaluate(() => {
          const visible = (el: HTMLElement) => el.getBoundingClientRect().height > 0;
          const prices = [...document.querySelectorAll<HTMLElement>(".price-currency")].map(
            (currency) => {
              const holder = currency.closest<HTMLElement>(".tabular-nums") ?? currency.parentElement;
              const text = (holder?.textContent ?? "").trim();
              return {
                currency: currency.textContent?.trim() ?? "",
                startsWithCurrency: text.startsWith(currency.textContent?.trim() ?? ""),
                bengaliDigits: /[০-৯]/.test(text),
              };
            },
          );
          const headings = [...document.querySelectorAll<HTMLElement>("h1, h2")]
            .filter(visible)
            .map((el) => ({ tag: el.tagName, size: getComputedStyle(el).fontSize }));
          const targets = [...document.querySelectorAll<HTMLElement>(
            "header a:not(.sr-only), header button, footer a, footer button",
          )]
            .filter(visible)
            .map((el) => el.getBoundingClientRect().height);
          return {
            mojibake: document.body.innerText.includes("\uFFFD"),
            prices,
            headings,
            smallTargets: targets.filter((height) => height < 44).length,
          };
        });

        expect(audit.mojibake, `${name} mojibake`).toBe(false);
        for (const price of audit.prices) {
          expect(price.bengaliDigits, `${name} price uses Latin digits`).toBe(false);
          expect(price.startsWithCurrency, `${name} taka leads the amount`).toBe(true);
        }
        for (const heading of audit.headings) {
          expect(
            ["14px", "16px", "18px", "20px", "24px", "30px", "36px", "48px", "60px"],
            `${name} ${heading.tag} scale`,
          ).toContain(heading.size);
        }
        expect(audit.smallTargets, `${name} header/footer targets >=44px`).toBe(0);
      });
    }

    test("home rails are duplicate-free and hide sparse rails", async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.goto("/", { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForSelector("[aria-labelledby^='rail-'] a[href^='/products/']", {
        timeout: 30000,
      });
      const rails = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("section[aria-labelledby^='rail-']")]
          .map((section) => ({
            id: section.getAttribute("aria-labelledby") ?? "",
            slugs: [
              ...new Set(
                [...section.querySelectorAll<HTMLAnchorElement>("a[href^='/products/']")].map(
                  (link) => link.getAttribute("href") ?? "",
                ),
              ),
            ],
          }))
          .filter((rail) => rail.slugs.length > 0),
      );
      for (const rail of rails) {
        expect(rail.slugs.length, `${rail.id} has at least 4 unique products`).toBeGreaterThanOrEqual(4);
      }
    });
  });
}

/**
 * Cards show a focus indicator only for keyboard focus. A mouse click followed
 * by Back must not leave a green ring on the card (regression from the
 * home-consistency `focus-within` ring).
 */
test("product card: no focus ring after mouse click and Back", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
  const card = page.locator('[data-product-card]').first();
  await card.waitFor({ state: "visible", timeout: 30000 });
  const borderBefore = await card.evaluate((element) => getComputedStyle(element).borderTopColor);
  await card.locator('a[href^="/products/"]').first().click();
  await page.waitForURL(/\/products\//, { timeout: 30000 });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await card.waitFor({ state: "visible" });
  await page.waitForTimeout(300);
  const after = await card.evaluate((element) => {
    const style = getComputedStyle(element);
    return { shadow: style.boxShadow, outline: style.outlineStyle, border: style.borderTopColor };
  });
  expect(after.shadow.includes("inset")).toBe(false);
  expect(after.outline).toBe("none");
  expect(after.border).toBe(borderBefore);
});

