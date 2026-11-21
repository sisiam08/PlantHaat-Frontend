import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
});

test.describe("header language", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("one toggle switches locale without losing path, query, hash or scroll", async ({
    page,
  }) => {
    await page.goto("/products?sort=newest#main", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-language-toggle]")).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => window.scrollTo(0, 420));
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    const toggle = page.locator("[data-language-toggle]");
    await expect(toggle).toHaveCount(1);
    await expect(toggle).toHaveAccessibleName("Switch language to Bangla");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "bn", { timeout: 20_000 });

    expect(new URL(page.url()).pathname).toBe("/products");
    expect(new URL(page.url()).search).toBe("?sort=newest");
    expect(new URL(page.url()).hash).toBe("#main");
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 })
      .toBeGreaterThan(200);

    await expect(toggle).toHaveAccessibleName("ইংরেজিতে পরিবর্তন করুন");
    await expect(toggle).toBeEnabled();
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en", { timeout: 20_000 });
  });

  test("guest header has one language control, no Register and no bell", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-language-toggle]")).toHaveCount(1);
    await expect(page.locator('header a[href="/register"]')).toHaveCount(0);
    await expect(page.locator("header").getByRole("link", { name: "Log in" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("header button:has(svg.lucide-bell)")).toHaveCount(0);
  });
});

test.describe("header notifications", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("bell opens a panel in place; Escape closes it", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const form = page.locator("form").first();
    await expect(form).not.toHaveAttribute("inert", "");
    await page.locator('input[name="email"]').fill("customer1@planthaat.test");
    await page.locator('input[name="password"]').fill("CustomerDemo1");
    await page.locator('form button[type="submit"]').first().click();
    await expect(page).toHaveURL("/", { timeout: 30_000 });

    const bell = page.locator("header button:has(svg.lucide-bell)");
    await expect(bell).toBeVisible({ timeout: 30_000 });
    await bell.click();
    await expect(page).toHaveURL("/");
    await expect(page.locator('[data-slot="popover-content"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);
  });
});

test.describe("mobile header and bottom nav", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("guest bottom nav hides Account and the header fits 360px", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.locator("nav[aria-label]").last();
    await expect(nav.getByRole("link")).toHaveCount(4, { timeout: 20_000 });
    await expect(nav).not.toContainText("Account");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await expect(page.locator("[data-language-toggle]")).toBeVisible();
  });

  test("bell opens a bottom-sheet dialog without navigating", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const form = page.locator("form").first();
    await expect(form).not.toHaveAttribute("inert", "");
    await page.locator('input[name="email"]').fill("customer1@planthaat.test");
    await page.locator('input[name="password"]').fill("CustomerDemo1");
    await page.locator('form button[type="submit"]').first().click();
    await expect(page).toHaveURL("/", { timeout: 30_000 });

    await expect(page.locator("nav[aria-label]").last().getByRole("link")).toHaveCount(5);
    await page.locator("header button:has(svg.lucide-bell)").click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page).toHaveURL("/");
  });
});
