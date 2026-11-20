import { expect, test } from "@playwright/test";

/**
 * Requires the backend (localhost:5000) and this app (localhost:3000) running.
 * Uses input[name=...] selectors to stay locale-agnostic (bn default / en).
 */
test.describe("auth", () => {
  async function waitForForm(page: import("@playwright/test").Page) {
    await page.locator('form button[type="submit"]').first().waitFor({ state: "visible" });
    await expect(page.locator('form button[type="submit"]').first()).toBeEnabled();
  }

  test("registers, logs out and logs back in", async ({ page }) => {
    const email = `e2e_${Date.now()}@example.com`;

    await page.goto("/register");
    await waitForForm(page);
    await page.locator('input[name="name"]').fill("E2E User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Str0ngPass1");
    await page.locator('input[name="confirmPassword"]').fill("Str0ngPass1");
    await page.getByRole("button", { name: /register|রেজিস্টার/i }).click();
    await expect(page).toHaveURL("/");

    await page.evaluate(async () => {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    });

    await page.goto("/login");
    await waitForForm(page);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Str0ngPass1");
    await page.getByRole("button", { name: /log in|লগ ইন/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("silent refresh keeps a private page after the access cookie is removed", async ({
    page,
    context,
  }) => {
    const email = `e2e_${Date.now()}@example.com`;

    await page.goto("/register");
    await waitForForm(page);
    await page.locator('input[name="name"]').fill("E2E User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Str0ngPass1");
    await page.locator('input[name="confirmPassword"]').fill("Str0ngPass1");
    await page.getByRole("button", { name: /register|রেজিস্টার/i }).click();
    await expect(page).toHaveURL("/");

    // Simulate an expired access token while the refresh cookie is still valid.
    await context.clearCookies({ name: "ph_web_at" });

    await page.goto("/account/sessions");
    await expect(page).toHaveURL(/\/account\/sessions$/);
    await expect(page.locator("main h1, main h2").first()).toBeVisible();
  });

  test("auth forms are inert before hydration", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const path of ["/login", "/register"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const submit = page.locator('form button[type="submit"]').first();
      await expect(submit).toBeDisabled();
      await expect(page.locator("form").first()).toHaveAttribute("inert", "");
      await submit.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(500);
      expect(new URL(page.url()).pathname).toBe(path);
      expect(page.url()).not.toContain("password=");
      expect(page.url()).not.toContain("@");
    }
    await context.close();
  });
});
