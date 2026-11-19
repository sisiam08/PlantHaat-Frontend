import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@teststack.local",
  password: process.env.ADMIN_PASSWORD ?? "TestAdmin123!",
};
const createdIds: string[] = [];

test.setTimeout(240_000);
test.describe.configure({ mode: "serial" });

async function adminContext(playwright: {
  request: {
    newContext: (options?: {
      baseURL?: string;
      extraHTTPHeaders?: Record<string, string>;
    }) => Promise<APIRequestContext>;
  };
}): Promise<APIRequestContext> {
  const api = await playwright.request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Origin: BASE },
  });
  const login = await api.post("/api/v1/auth/login", {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(login.ok(), `admin login ${login.status()}`).toBeTruthy();
  return api;
}

async function upload(api: APIRequestContext) {
  const buffer = readFileSync(resolve("public/placeholders/plant-placeholder.webp"));
  const response = await api.post("/api/v1/uploads/images", {
    multipart: {
      purpose: "banner",
      file: {
        name: "highlight.webp",
        mimeType: "image/webp",
        buffer,
      },
    },
  });
  expect(response.ok(), `upload ${response.status()}`).toBeTruthy();
  return (await response.json()).data as {
    url: string;
    key: string;
    width?: number;
    height?: number;
  };
}

async function home(page: Page, locale: "bn" | "en" = "en") {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
  ]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
}

test.afterAll(async ({ playwright }) => {
  const api = await adminContext(playwright);
  for (const id of createdIds) {
    await api.delete(`/api/v1/admin/banners/${id}`).catch(() => undefined);
  }
  await api
    .patch("/api/v1/admin/settings", { data: { values: { "home.highlights.enabled": true } } })
    .catch(() => undefined);
  await api.dispose();
});

test("admin creates, previews, reorders, schedules and turns off highlights", async ({
  page,
  playwright,
}) => {
  const api = await adminContext(playwright);
  const desktop = await upload(api);
  const mobile = await upload(api);

  const create = await api.post("/api/v1/admin/banners", {
    data: {
      placement: "HOME_HIGHLIGHTS",
      imageUrl: desktop.url,
      imagePublicId: desktop.key,
      imageWidth: desktop.width,
      imageHeight: desktop.height,
      mobileImageUrl: mobile.url,
      mobileImagePublicId: mobile.key,
      mobileImageWidth: mobile.width,
      mobileImageHeight: mobile.height,
      imageAltBn: "পরীক্ষামূলক স্লাইড",
      imageAltEn: "Test slide",
      overlayEnabled: true,
      headlineBn: "পরীক্ষামূলক অফার",
      headlineEn: "Test offer",
      subtextBn: "হোম পেজের পরীক্ষা",
      subtextEn: "Home page test",
      buttonEnabled: true,
      buttonLabelBn: "কিনুন",
      buttonLabelEn: "Shop now",
      buttonHref: "https://example.com/plants",
      buttonStyle: "custom",
      buttonBgColor: "#2E4B2B",
      buttonTextColor: "#FFFFFF",
      openInNewTab: true,
      scrimColor: "#0B2116",
      scrimOpacity: 60,
      desktopPosition: "BOTTOM_LEFT",
      mobilePosition: "BOTTOM_LEFT",
      desktopAlign: "left",
      mobileAlign: "left",
      isActive: true,
    },
  });
  expect(create.ok(), `create ${create.status()}`).toBeTruthy();
  const slide = (await create.json()).data;
  createdIds.push(slide.id);

  await home(page);
  await expect(page.locator("[data-home-hero] h1")).toBeVisible({ timeout: 30000 });
  await page.evaluate(() => {
    const section = document.getElementById("home-highlights");
    if (section) section.scrollIntoView({ block: "center" });
  });
  await expect(page.locator("[data-highlight-slide]").first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Test offer")).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop now" })).toHaveAttribute(
    "href",
    "https://example.com/plants",
  );

  // Admin page opens and shows the slide list.
  await page.context().addCookies((await api.storageState()).cookies);
  await page.goto("/admin/highlights", { waitUntil: "domcontentloaded", timeout: 90000 });
  await expect(page.getByRole("heading", { name: /home highlights|হোম হাইলাইট/i }).first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText("Test offer").first()).toBeVisible({ timeout: 30000 });

  // A future slide is hidden from the public payload.
  const future = await api.post("/api/v1/admin/banners", {
    data: {
      placement: "HOME_HIGHLIGHTS",
      imageUrl: desktop.url,
      imageWidth: desktop.width,
      imageHeight: desktop.height,
      imageAltEn: "Future slide",
      overlayEnabled: true,
      headlineEn: "Future slide",
      headlineBn: "ভবিষ্যৎ স্লাইড",
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      isActive: true,
    },
  });
  expect(future.ok()).toBeTruthy();
  createdIds.push((await future.json()).data.id);
  const publicPayload = await api.get("/api/v1/home/highlights");
  const publicSlides = (await publicPayload.json()).data.slides as {
    id: string;
    overlay?: { headline?: { en?: string } };
  }[];
  expect(publicSlides.some((row) => row.id === slide.id)).toBe(true);
  expect(publicSlides.some((row) => row.overlay?.headline?.en === "Future slide")).toBe(false);

  const duplicate = await api.post(`/api/v1/admin/banners/${slide.id}/duplicate`);
  expect(duplicate.ok()).toBeTruthy();
  const copy = (await duplicate.json()).data;
  createdIds.push(copy.id);
  expect(copy.isActive).toBe(false);
  const reorder = await api.patch("/api/v1/admin/banners/reorder", {
    data: { ids: [copy.id, slide.id] },
  });
  expect(reorder.ok()).toBeTruthy();
  const list = await api.get("/api/v1/admin/banners?placement=HOME_HIGHLIGHTS");
  const rows = (await list.json()).data as { id: string }[];
  expect(rows.findIndex((row) => row.id === copy.id)).toBeLessThan(
    rows.findIndex((row) => row.id === slide.id),
  );
  await api.delete(`/api/v1/admin/banners/${copy.id}`);
  createdIds.splice(createdIds.indexOf(copy.id), 1);

  // Whole feature off removes the section and its gap.
  const off = await api.patch("/api/v1/admin/settings", {
    data: { values: { "home.highlights.enabled": false } },
  });
  expect(off.ok()).toBeTruthy();
  await home(page);
  await page.waitForTimeout(1500);
  expect(await page.locator("#home-highlights").count()).toBe(0);
  expect(await page.locator("[data-highlight-slide]").count()).toBe(0);

  const on = await api.patch("/api/v1/admin/settings", {
    data: { values: { "home.highlights.enabled": true } },
  });
  expect(on.ok()).toBeTruthy();
  await home(page);
  await expect(page.locator("#home-highlights")).toBeVisible({ timeout: 30000 });

  await api.delete(`/api/v1/admin/banners/${slide.id}`);
  createdIds.splice(createdIds.indexOf(slide.id), 1);
  await api.dispose();
});
