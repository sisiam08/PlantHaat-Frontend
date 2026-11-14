import { expect, test } from "@playwright/test";

const WIDTHS = [1024, 1280, 1366, 1440, 1536, 1920];
const SLUG = "spray-bottle-2l-adli";

async function expectNoOverflow(page: import("@playwright/test").Page, label: string) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `${label} @ ${width}px`).toBeLessThanOrEqual(clientWidth + 1);
  }
}

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
}

for (const locale of ["bn", "en"]) {
  test.describe(`no horizontal overflow ${locale}`, () => {
    test.use({ viewport: { width: 1280, height: 900 } });
    test.beforeEach(async ({ context }) => {
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
    });

    for (const [name, path] of [
      ["home", "/"],
      ["catalog", "/products"],
      ["pdp", `/products/${SLUG}`],
      ["cart", "/cart"],
    ] as const) {
      test(name, async ({ page }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1000);
        await expectNoOverflow(page, `${locale}-${name}`);
      });
    }
  });
}

test.describe("no horizontal overflow (authenticated)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("checkout", async ({ page }) => {
    await login(page, "customer1@planthaat.test", "CustomerDemo1");
    await page.goto("/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await expectNoOverflow(page, "checkout");
  });

  test("seller dashboard", async ({ page }) => {
    await login(page, "seller1@planthaat.test", "SellerDemo1");
    await page.goto("/seller/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await expectNoOverflow(page, "seller-dashboard");
  });

  test("admin dashboard", async ({ page }) => {
    const email = process.env.ADMIN_EMAIL ?? "admin@planthaat.test";
    const password = process.env.ADMIN_PASSWORD ?? "";
    test.skip(!process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD not set");
    await login(page, email, password);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await expectNoOverflow(page, "admin-dashboard");
  });
});
