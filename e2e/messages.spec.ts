import { expect, test } from "@playwright/test";

const SLUG = "spray-bottle-2l-adli";
const PAGES = [
  ["home", "/"],
  ["catalog", "/products"],
  ["pdp", `/products/${SLUG}`],
  ["cart", "/cart"],
] as const;

for (const locale of ["bn", "en"] as const) {
  test.describe(`messages ${locale}`, () => {
    test.use({ viewport: { width: 1280, height: 800 } });
    test.beforeEach(async ({ context }) => {
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
    });

    for (const [name, path] of PAGES) {
      test(`${name} has no missing messages`, async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "error" && /MISSING_MESSAGE|Could not resolve/i.test(message.text())) {
            errors.push(message.text());
          }
        });
        page.on("pageerror", (error) => {
          if (/MISSING_MESSAGE|Could not resolve/i.test(error.message)) errors.push(error.message);
        });

        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1500);
        await page.evaluate(() => document.fonts.ready);

        expect(errors, errors.join("\n")).toEqual([]);
      });
    }
  });
}
