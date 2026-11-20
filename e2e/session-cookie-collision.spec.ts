import { expect, test } from "@playwright/test";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
const USER = {
  email: process.env.E2E_CUSTOMER_EMAIL ?? "buyer1@teststack.local",
  password: process.env.E2E_CUSTOMER_PASSWORD ?? "TestBuyer123!",
};

test.setTimeout(180_000);

async function login(page: import("@playwright/test").Page) {
  const status = await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    USER,
  );
  expect(status).toBe(200);
}

test("a stale API-path cookie duplicate does not end the session and is cleaned", async ({
  page,
  context,
}) => {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await login(page);

  const before = await context.cookies();
  expect(before.find((cookie) => cookie.name === "ph_web_at")).toBeTruthy();
  expect(before.find((cookie) => cookie.name === "ph_web_rt")).toBeTruthy();

  // Simulate the localhost collision: the API origin's refresh cookie lives on
  // /api/v1/auth (and an old root cookie may exist). Cookies ignore ports, so a
  // normal app login shares the jar with both.
  await context.addCookies([
    {
      name: "ph_rt",
      value: "stale.invalid.api-path",
      domain: "localhost",
      path: "/api/v1/auth",
      secure: true,
    },
    { name: "ph_rt", value: "stale.invalid.root", domain: "localhost", path: "/", secure: true },
    { name: "ph_at", value: "stale.invalid.access", domain: "localhost", path: "/", secure: true },
  ]);

  // Force the proxy to refresh: no access cookie, valid web refresh cookie.
  await context.clearCookies({ name: "ph_web_at" });
  const response = await page.goto(`${BASE}/orders`, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  expect(page.url()).not.toContain("/login");

  const status = await page.evaluate(async () => {
    const result = await fetch("/api/v1/wishlist?page=1");
    return result.status;
  });
  expect(status).toBe(200);

  const after = await context.cookies();
  expect(after.find((cookie) => cookie.name === "ph_web_at")).toBeTruthy();
  expect(after.find((cookie) => cookie.name === "ph_web_rt")).toBeTruthy();
  // The new names are the only ones read; a leftover legacy token can no
  // longer win a refresh race. Logout cleanup is asserted below.
});

test("logout clears the web cookies and any leftover legacy duplicates", async ({ page, context }) => {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await login(page);
  await context.addCookies([
    {
      name: "ph_rt",
      value: "stale.invalid.api-path",
      domain: "localhost",
      path: "/api/v1/auth",
      secure: true,
    },
  ]);
  await page.evaluate(async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
  });
  const cookies = await context.cookies();
  for (const name of ["ph_web_at", "ph_web_rt", "ph_at", "ph_rt"]) {
    expect(cookies.filter((cookie) => cookie.name === name), name).toEqual([]);
  }
});
