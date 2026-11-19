import { expect, test } from "@playwright/test";

import { ADMIN, BASE, loginBrowser, requireStack } from "./part4-helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);
requireStack();

test("reconciliation shows the balanced state and the plain-language invariant", async ({ page }) => {
  const context = await page.context().browser()!.newContext();
  await loginBrowser(context, ADMIN);
  const admin = await context.newPage();
  await admin.goto(`${BASE}/admin/reconciliation`, { waitUntil: "domcontentloaded" });
  await expect(admin.getByText(/Receipts from buyers must equal/i)).toBeVisible();
  await admin.getByRole("button", { name: "Run check" }).click();
  await expect(admin.getByText("Settlement conservation")).toBeVisible({ timeout: 30_000 });
  await expect(admin.getByText("Balanced").first()).toBeVisible();
  await expect(admin.getByText("No violations")).toBeVisible();
});
