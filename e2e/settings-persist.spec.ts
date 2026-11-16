import { expect, test } from "@playwright/test";

const BASE = process.env.SETTINGS_PERSIST_BASE_URL;
const ORIGIN = BASE ?? "http://localhost:3000";
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@planthaat.test",
  password: process.env.ADMIN_PASSWORD ?? "",
};

test.setTimeout(180_000);
test.describe.configure({ mode: "serial" });

test("settings persist: number + provider + advance in one save, five reloads", async ({
  page,
  playwright,
}) => {
  test.skip(!BASE, "set SETTINGS_PERSIST_BASE_URL to the isolated test frontend");
  test.skip(!ADMIN.password, "ADMIN_PASSWORD is not set");

  const api = await playwright.request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Origin: ORIGIN },
  });
  const login = await api.post("/api/v1/auth/login", {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(login.ok()).toBeTruthy();

  const reauth = () =>
    api.post("/api/v1/admin/settings/reauth", {
      data: { keys: ["payment.bkash.number"], password: ADMIN.password },
    });
  const patch = (values: Record<string, unknown>, token?: string) =>
    api.patch("/api/v1/admin/settings", {
      data: { values },
      headers: token ? { "x-settings-reauth": token } : {},
    });

  try {
    await page.context().addCookies([
      { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const status = await page.evaluate(
      async ({ email, password }) => {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        return response.status;
      },
      { email: ADMIN.email, password: ADMIN.password },
    );
    expect(status).toBe(200);
    await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });

    const number = page.getByRole("textbox", { name: /bKash receiving number/ });
    const bkash = page.getByRole("checkbox", { name: /bKash enabled/ });
    const advance = page.getByRole("checkbox", { name: /Advance payment enabled/ });

    await number.fill("01700000000");
    await bkash.check();
    await advance.check();
    await page.getByRole("button", { name: /^Save$/ }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="password"]').fill(ADMIN.password);
    await dialog.getByRole("button", { name: /confirm/i }).click();
    await expect(page.getByText(/Saved\. Customers will see this on new page loads/)).toBeVisible({
      timeout: 20_000,
    });

    for (let attempt = 0; attempt < 5; attempt++) {
      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByRole("textbox", { name: /bKash receiving number/ })).toHaveValue(
        "01700000000",
      );
      await expect(page.getByRole("checkbox", { name: /bKash enabled/ })).toBeChecked();
      await expect(page.getByRole("checkbox", { name: /Advance payment enabled/ })).toBeChecked();
    }

    await page.getByRole("textbox", { name: /bKash receiving number/ }).fill("");
    await expect(page.getByText(/needs a valid receiving number/i)).toBeVisible();
    await expect(page.getByText(/Saved\. Customers/)).toHaveCount(0);
  } finally {
    const token = await reauth();
    if (token.ok()) {
      await patch(
        {
          "payment.bkash.number": "",
          "payment.bkash.enabled": false,
          "payment.advance.enabled": false,
        },
        (await token.json()).data.token,
      );
    }
    await api.dispose();
  }
});
