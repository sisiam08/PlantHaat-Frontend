import { expect, test, type APIRequestContext } from "@playwright/test";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const ORIGIN = BASE;
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@planthaat.test",
  password: process.env.ADMIN_PASSWORD ?? "",
};
const SCREENSHOTS = "../docs/design-review/settings";

test.setTimeout(240_000);
test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  test.skip(!ADMIN.password, "ADMIN_PASSWORD is not set");
});

type RequestFactory = {
  request: {
    newContext: (options?: {
      baseURL?: string;
      extraHTTPHeaders?: Record<string, string>;
    }) => Promise<APIRequestContext>;
  };
};

async function adminApi(playwright: RequestFactory) {
  const api = await playwright.request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Origin: ORIGIN },
  });
  const login = await api.post("/api/v1/auth/login", {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(login.ok(), `admin login ${login.status()}`).toBeTruthy();
  return api;
}

async function settingsSnapshot(api: APIRequestContext) {
  const response = await api.get("/api/v1/admin/settings");
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data as Record<string, unknown>;
}

async function patchSettings(
  api: APIRequestContext,
  values: Record<string, unknown>,
  token?: string,
) {
  return api.patch("/api/v1/admin/settings", {
    data: { values },
    headers: token ? { "x-settings-reauth": token } : {},
  });
}

async function reauth(api: APIRequestContext, key: string, password = ADMIN.password) {
  return api.post("/api/v1/admin/settings/reauth", { data: { keys: [key], password } });
}

async function restore(
  api: APIRequestContext,
  snapshot: Record<string, unknown>,
  keys: string[],
) {
  const values = Object.fromEntries(keys.map((key) => [key, snapshot[key]]));
  const response = await patchSettings(api, values);
  if (response.ok()) return;
  const sensitiveKey = keys.find(
    (key) => key.startsWith("commission.") || key.endsWith(".number"),
  );
  if (!sensitiveKey) throw new Error(`restore failed ${response.status()}`);
  const token = await reauth(api, sensitiveKey);
  if (!token.ok()) throw new Error("restore re-auth failed");
  const retry = await patchSettings(api, values, (await token.json()).data.token);
  if (!retry.ok()) {
    throw new Error(`restore failed ${retry.status()}: ${JSON.stringify(await retry.json())}`);
  }
}

async function loginAdminUi(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
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
  await page.goto("/admin/settings", { waitUntil: "networkidle" });
  await expect(
    page.locator("#main").getByRole("heading", { name: /settings|সেটিংস/i }).first(),
  ).toBeVisible();
}

test("settings UI: grouping, sticky save, discard, reset, validation, history", async ({
  page,
  playwright,
}) => {
  const api = await adminApi(playwright);
  const snapshot = await settingsSnapshot(api);
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.context().addCookies([
      { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);
    await loginAdminUi(page);
    await page.screenshot({ path: `${SCREENSHOTS}/settings-1280.png`, fullPage: true });

    const bkashNumber = page.getByRole('textbox', { name: /bKash receiving number/ });
    await bkashNumber.fill("123");
    await expect(page.getByText(/valid 01XXXXXXXXX number/)).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOTS}/settings-validation-1280.png` });
    await page.getByRole("button", { name: /^Discard$/ }).click();

    await page.getByRole("tab", { name: /orders/i }).click();
    const codMax = page.getByRole('spinbutton', { name: /COD maximum amount/ });
    await codMax.fill("500");
    expect(
      await page.evaluate(() => {
        const event = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    ).toBe(true);
    await expect(page.getByText(/1 unsaved change/)).toBeVisible();

    await page
      .getByRole("tabpanel", { name: /orders/i })
      .getByRole("button", { name: /reset to default/i })
      .first()
      .click({ force: true, timeout: 5000 });
    await expect(codMax).toHaveValue("0");
    await expect(page.getByText(/unsaved change/)).toHaveCount(0);

    await codMax.fill("250");
    await page.getByRole("button", { name: /^Save$/ }).click();
    await expect(page.getByText(/Saved\. Customers will see this on new page loads/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("order.codMaxAmount").first()).toBeVisible();

    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: `${SCREENSHOTS}/settings-360.png`, fullPage: true });
  } finally {
    await restore(api, snapshot, ["order.codMaxAmount"]);
    await api.dispose();
  }
});

test("settings UI: sensitive change uses re-auth and writes history", async ({
  page,
  playwright,
}) => {
  const api = await adminApi(playwright);
  const snapshot = await settingsSnapshot(api);
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.context().addCookies([
      { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);
    await loginAdminUi(page);
    await page.getByRole("tab", { name: /wallet/i }).click();

    const commission = page.getByRole("spinbutton", { name: /Default commission/ });
    await commission.fill("11");
    await page.getByRole("button", { name: /^Save$/ }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOTS}/settings-reauth-1280.png` });

    const dialog = page.getByRole("alertdialog");
    await dialog.locator('input[type="password"]').fill("wrong-password");
    await dialog.getByRole("button", { name: /confirm/i }).click();
    await expect(dialog.getByRole("alert")).toContainText(/incorrect|password/i, { timeout: 15_000 });

    await dialog.locator('input[type="password"]').fill(ADMIN.password);
    await dialog.getByRole("button", { name: /confirm/i }).click();
    await expect(page.getByText(/Saved\. Customers will see this on new page loads/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("commission.default").first()).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOTS}/settings-history-1280.png`, fullPage: true });

    expect((await reauth(api, "commission.default", "wrong-password")).status()).toBe(400);

    // On the payment seed Nagad is already enabled with a fake number; only
    // assert the no-number guard when the fixture has no number.
    const nagadNumber = String(snapshot["payment.nagad.number"] ?? "").trim();
    const nagad = await patchSettings(api, { "payment.nagad.enabled": true });
    if (!nagadNumber) {
      expect(nagad.status()).toBe(400);
      expect((await nagad.json()).error.message ?? "").toMatch(/Nagad/i);
    } else {
      expect(nagad.ok()).toBeTruthy();
    }
  } finally {
    await restore(api, snapshot, ["commission.default"]);
    await api.dispose();
  }
});

test("settings customer-side effects: COD limit, WhatsApp, 24h return window", async ({
  page,
  playwright,
}) => {
  const api = await adminApi(playwright);
  const snapshot = await settingsSnapshot(api);
  try {
    const changed = {
      "order.codMaxAmount": 1,
      "support.whatsapp": "01712345678",
      "return.windowHours": 24,
    };
    expect((await patchSettings(api, changed)).ok()).toBeTruthy();
    await page.waitForTimeout(1000);
    const publicSettings = await api.get("/api/v1/settings/public");
    expect((await publicSettings.json()).data["return.windowHours"]).toBe(24);

    await page.context().addCookies([
      { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText("24-hour complaint window").first()).toBeVisible({
        timeout: 5_000,
      });
    }).toPass({ timeout: 70_000, intervals: [5_000] });
    await expect(page.locator("footer").getByText("01712345678")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOTS}/settings-customer-home-1280.png` });

    await page.goto("/products/spray-bottle-2l-adli", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/within 24 hours of delivery/).first()).toBeVisible({
      timeout: 20_000,
    });

    const customerApi = await playwright.request.newContext({
      baseURL: BASE,
      extraHTTPHeaders: { Origin: ORIGIN },
    });
    try {
      const login = await customerApi.post("/api/v1/auth/login", {
        data: { email: "customer5@planthaat.test", password: "CustomerDemo1" },
      });
      expect(login.ok()).toBeTruthy();
      const state = await customerApi.storageState();
      await page.context().addCookies(state.cookies);

      await customerApi.delete("/api/v1/cart");
      for (const [slug, quantity] of [
        ["spray-bottle-2l-adli", 7],
        ["seed-starter-tray-8372", 1],
        ["garden-gloves-lkcw", 1],
      ] as const) {
        const product = await (await customerApi.get(`/api/v1/products/${slug}`)).json();
        const variant = product.data.variants.find(
          (entry: { stockQty: number }) => entry.stockQty > 0,
        );
        const put = await customerApi.put("/api/v1/cart/items", {
          data: { variantId: variant.id, quantity },
        });
        expect(put.ok()).toBeTruthy();
      }
      const cart = await (await customerApi.get("/api/v1/cart")).json();
      expect(cart.data.shops).toHaveLength(3);

      await page.goto("/checkout", { waitUntil: "networkidle" });
      await expect(async () => {
        await page.reload({ waitUntil: "networkidle" });
        await expect(
          page.getByText(/Cash on delivery is available for orders up to/),
        ).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 70_000, intervals: [5_000] });
      await page.screenshot({ path: `${SCREENSHOTS}/settings-cod-blocked-1280.png` });

      const addresses = await (await customerApi.get("/api/v1/addresses")).json();
      const rejected = await customerApi.post("/api/v1/checkout", {
        data: { addressId: addresses.data[0].id, paymentMethod: "COD" },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      expect(rejected.status()).toBe(400);
      expect((await rejected.json()).error.code).toBe("PAYMENT_METHOD_NOT_AVAILABLE");
    } finally {
      await customerApi.dispose();
    }
  } finally {
    await restore(api, snapshot, [
      "order.codMaxAmount",
      "support.whatsapp",
      "return.windowHours",
    ]);
    await api.dispose();
  }
});





