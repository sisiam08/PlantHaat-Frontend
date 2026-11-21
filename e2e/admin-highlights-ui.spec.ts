import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@teststack.local",
  password: process.env.ADMIN_PASSWORD ?? "TestAdmin123!",
};

test.setTimeout(240_000);

async function login(page: Page) {
  const status = await page.evaluate(
    async ([email, password]) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    [ADMIN.email, ADMIN.password],
  );
  expect(status).toBe(200);
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
}

test("admin edits a slide in the visible UI and toggles the section", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await login(page);
  await page.goto("/admin/highlights", { waitUntil: "domcontentloaded", timeout: 90000 });
  await expect(page.getByRole("heading", { name: "Home highlights" }).first()).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByText(/Autoplay runs on all screen sizes, pauses on hover\/focus\/touch/),
  ).toBeVisible();

  const files = page.locator("input[type=file]");
  await files.nth(0).setInputFiles(resolve("public/placeholders/plant-placeholder.webp"));
  await expect(page.locator('img[src*="/uploads/"]').first()).toBeVisible({ timeout: 30000 });
  await files.nth(1).setInputFiles(resolve("public/placeholders/plant-placeholder.webp"));
  await expect(page.locator('img[src*="/uploads/"]')).toHaveCount(3, { timeout: 30000 });
  await expect(page.locator("[data-autoplay-status]")).toContainText(
    /Autoplay is on|Autoplay is off|Highlights are off|Add at least 2 active slides|reduced motion/,
  );

  await page.getByLabel(/Headline \(Bangla\)/).fill("ইউআই পরীক্ষা");
  await page.getByLabel(/Headline \(English\)/).fill("UI test offer");
  await page.getByLabel(/Subtext \(English\)/).fill("Created from the admin screen");
  await page.getByLabel("Button label (Bangla)").fill("কিনুন");
  await page.getByLabel("Button label (English)").fill("Shop now");
  await page.getByLabel("Button link").fill("https://example.com/plants");

  await page.getByRole("button", { name: "Save slide" }).first().click();
  await expect(page.getByText(/Saved — customers will see this within seconds/)).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText("UI test offer").first()).toBeVisible({ timeout: 30000 });

  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.evaluate(() => {
    document.getElementById("home-highlights")?.scrollIntoView({ block: "center" });
  });
  await expect(page.getByText("UI test offer")).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("link", { name: "Shop now" })).toHaveAttribute(
    "href",
    "https://example.com/plants",
  );

  await page.goto("/admin/highlights", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.getByRole("switch").first().click();
  await page.waitForTimeout(1200);
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(500);
  expect(await page.locator("#home-highlights").count()).toBe(0);

  await page.goto("/admin/highlights", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.getByRole("switch").first().click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("button", { name: "Delete" }).last().click();
  await expect(page.getByText(/No highlight slides yet|UI test offer/).first()).toBeVisible({
    timeout: 30000,
  });
});
