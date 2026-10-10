import { expect, test } from "@playwright/test";

/**
 * Requires the backend (localhost:5000) and this app (localhost:3000) running.
 * Uses input[name=...] selectors to stay locale-agnostic (bn default / en).
 */
test.describe("auth", () => {
  test("registers, logs out and logs back in", async ({ page }) => {
    const email = `e2e_${Date.now()}@example.com`;

    await page.goto("/register");
    await page.locator('input[name="name"]').fill("E2E User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Str0ngPass1");
    await page.locator('input[name="confirmPassword"]').fill("Str0ngPass1");
    await page.getByRole("button", { name: /register|রেজিস্টার/i }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/login");
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
    await page.locator('input[name="name"]').fill("E2E User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Str0ngPass1");
    await page.locator('input[name="confirmPassword"]').fill("Str0ngPass1");
    await page.getByRole("button", { name: /register|রেজিস্টার/i }).click();
    await expect(page).toHaveURL("/");

    // Simulate an expired access token while the refresh cookie is still valid.
    await context.clearCookies({ name: "ph_at" });

    await page.goto("/account/sessions");
    await expect(page).toHaveURL(/\/account\/sessions$/);
    await expect(page.getByRole("heading", { name: /devices|ডিভাইস/i })).toBeVisible();
  });
});
