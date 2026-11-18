import { expect, test, type APIRequestContext } from "@playwright/test";

test.setTimeout(90_000);
test.describe.configure({ mode: "serial" });

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const CUSTOMER = { email: "customer1@planthaat.test", password: "CustomerDemo1" };

async function loginApi(playwright: {
  request: {
    newContext: (options: {
      baseURL: string;
      extraHTTPHeaders: Record<string, string>;
    }) => Promise<APIRequestContext>;
  };
}) {
  const api = await playwright.request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Origin: BASE },
  });
  const login = await api.post("/api/v1/auth/login", { data: CUSTOMER });
  expect(login.ok(), `login ${login.status()}`).toBeTruthy();
  return api;
}

test("saved wishlist state hydrates without attribute mismatches", async ({
  page,
  context,
  playwright,
}) => {
  const api = await loginApi(playwright);
  let addedProductId: string | null = null;
  try {
    const detail = await (await api.get("/api/v1/products/money-tree-bonsai-xokk")).json();
    const product = { id: detail.data.id as string, slug: detail.data.slug as string };
    const wishlist = await (await api.get("/api/v1/wishlist")).json();
    const alreadySaved = (wishlist.data ?? []).some(
      (item: { product: { id: string } }) => item.product.id === product.id,
    );
    if (!alreadySaved) {
      const add = await api.post(`/api/v1/wishlist/${encodeURIComponent(product.id)}`, {
        data: {},
      });
      expect(add.ok(), `wishlist add ${add.status()}`).toBeTruthy();
      addedProductId = product.id;
    }

    const state = await api.storageState();
    await context.addCookies([
      ...state.cookies,
      { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);

    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && /hydrated but some attributes/.test(message.text())) {
        errors.push(message.text());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const heart = page.locator(`[data-card-wishlist][data-slug="${product.slug}"]`).first();
    await expect(heart).toBeVisible({ timeout: 30_000 });
    await expect(heart).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect(heart).toHaveAccessibleName(/remove from wishlist/i);
    expect(errors, errors.join("\n")).toEqual([]);
  } finally {
    if (addedProductId) {
      await api.delete(`/api/v1/wishlist/${addedProductId}`);
    }
    await api.dispose();
  }
});
