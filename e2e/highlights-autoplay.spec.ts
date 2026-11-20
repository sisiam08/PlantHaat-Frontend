import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@teststack.local",
  password: process.env.ADMIN_PASSWORD ?? "TestAdmin123!",
};
const createdIds: string[] = [];
let previousAutoplay: boolean | null = null;
let previousInterval: number | null = null;

test.setTimeout(300_000);
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
      file: { name: "autoplay.webp", mimeType: "image/webp", buffer },
    },
  });
  expect(response.ok(), `upload ${response.status()}`).toBeTruthy();
  return (await response.json()).data as { url: string; key: string; width?: number; height?: number };
}

test.beforeAll(async ({ playwright }) => {
  const api = await adminContext(playwright);
  const settings = (await (await api.get("/api/v1/admin/settings")).json()).data as Record<
    string,
    unknown
  >;
  previousAutoplay = settings["home.highlights.autoplay"] === true;
  previousInterval = Number(settings["home.highlights.intervalSeconds"] ?? 6);

  const list = (await (await api.get("/api/v1/admin/banners?placement=HOME_HIGHLIGHTS")).json())
    .data as Array<{ id: string; isActive: boolean }>;
  const active = list.filter((row) => row.isActive).length;
  for (let index = active; index < 3; index += 1) {
    const image = await upload(api);
    const create = await api.post("/api/v1/admin/banners", {
      data: {
        placement: "HOME_HIGHLIGHTS",
        imageUrl: image.url,
        imagePublicId: image.key,
        imageWidth: image.width,
        imageHeight: image.height,
        imageAltEn: `Autoplay test slide ${index + 1}`,
        imageAltBn: `অটোপ্লে পরীক্ষা ${index + 1}`,
        isActive: true,
      },
    });
    expect(create.ok(), `create slide ${create.status()}`).toBeTruthy();
    createdIds.push((await create.json()).data.id);
  }

  const update = await api.patch("/api/v1/admin/settings", {
    data: {
      values: {
        "home.highlights.enabled": true,
        "home.highlights.autoplay": true,
        "home.highlights.intervalSeconds": 5,
      },
    },
  });
  expect(update.ok(), `settings ${update.status()}`).toBeTruthy();
  await api.dispose();
});

test.afterAll(async ({ playwright }) => {
  const api = await adminContext(playwright);
  for (const id of createdIds) {
    await api.delete(`/api/v1/admin/banners/${id}`).catch(() => undefined);
  }
  await api
    .patch("/api/v1/admin/settings", {
      data: {
        values: {
          "home.highlights.autoplay": previousAutoplay ?? false,
          "home.highlights.intervalSeconds": previousInterval ?? 6,
        },
      },
    })
    .catch(() => undefined);
  await api.dispose();
});

async function openHome(page: Page, width: number, locale: "en" | "bn" = "en") {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
  ]);
  await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForLoadState("load").catch(() => undefined);
    await page.waitForTimeout(600);
    const carousel = page.locator("[data-home-highlights-carousel]");
    const attached = await carousel
      .waitFor({ state: "attached", timeout: 60000 })
      .then(() => true)
      .catch(() => false);
    if (!attached) continue;
    await page.evaluate(() => {
      document
        .querySelector("[data-home-highlights-carousel]")
        ?.scrollIntoView({ block: "center" });
    });
    try {
      await carousel.locator("button[aria-label^='Slide ']").first().waitFor({ timeout: 30000 });
      return carousel;
    } catch {
      if (attempt === 2) throw new Error("carousel did not become ready");
    }
  }
  throw new Error("carousel missing on home page");
}

async function indexOf(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-home-highlights-carousel]");
    const dots = [...(root?.querySelectorAll("[aria-current]") ?? [])];
    return dots.findIndex((dot) => dot.getAttribute("aria-current") === "true");
  });
}

test("autoplay advances on desktop 1440", async ({ page }) => {
  await openHome(page, 1440);
  await expect(page.locator("[data-home-highlights-carousel]")).toHaveAttribute(
    "data-autoplay",
    "on",
  );
  await expect(page.getByRole("button", { name: "Pause promotions" })).toBeVisible();
  const start = await indexOf(page);
  await expect.poll(() => indexOf(page), { timeout: 16000 }).not.toBe(start);
});

test("autoplay advances on mobile 390 and keeps the pause control", async ({ page }) => {
  await openHome(page, 390);
  await expect(page.locator("[data-home-highlights-carousel]")).toHaveAttribute(
    "data-autoplay",
    "on",
  );
  await expect(page.getByRole("button", { name: "Pause promotions" })).toBeVisible();
  const start = await indexOf(page);
  await expect.poll(() => indexOf(page), { timeout: 16000 }).not.toBe(start);
});

test("autoplay pauses on hover and resumes after leave", async ({ page }) => {
  const carousel = await openHome(page, 1440);
  await carousel.hover();
  const pausedAt = await indexOf(page);
  await page.waitForTimeout(12_000);
  expect(await indexOf(page)).toBe(pausedAt);
  await page.mouse.move(2, 2);
  await expect.poll(() => indexOf(page), { timeout: 16000 }).not.toBe(pausedAt);
});

test("autoplay pauses while focus is inside and resumes after blur", async ({ page }) => {
  const carousel = await openHome(page, 1440);
  await carousel.focus();
  const pausedAt = await indexOf(page);
  await page.waitForTimeout(12_000);
  expect(await indexOf(page)).toBe(pausedAt);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(() => indexOf(page), { timeout: 16000 }).not.toBe(pausedAt);
});

test("a manual swipe restarts the timer", async ({ page }) => {
  const carousel = await openHome(page, 1440);
  const box = await carousel.boundingBox();
  expect(box).not.toBeNull();
  const y = box!.y + box!.height / 2;
  await page.mouse.move(box!.x + box!.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.2, y, { steps: 12 });
  await page.mouse.up();
  await page.mouse.move(2, 2);
  const afterSwipe = await indexOf(page);
  await expect.poll(() => indexOf(page), { timeout: 16_000 }).not.toBe(afterSwipe);
});

test("autoplay pauses while the tab is hidden", async ({ page }) => {
  await openHome(page, 1440);
  const hiddenAt = await indexOf(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(12_000);
  expect(await indexOf(page)).toBe(hiddenAt);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => indexOf(page), { timeout: 16_000 }).not.toBe(hiddenAt);
});

test("reduced motion disables autoplay but keeps manual controls", async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await openHome(page, 1440);
  await expect(page.locator("[data-home-highlights-carousel]")).toHaveAttribute(
    "data-autoplay",
    "off",
  );
  await expect(page.getByRole("button", { name: "Pause promotions" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next slide" })).toBeVisible();
  const start = await indexOf(page);
  await page.waitForTimeout(12_000);
  expect(await indexOf(page)).toBe(start);
  await context.close();
});

test("admin autoplay toggle off/on reaches the home page quickly", async ({ page, playwright }) => {
  const api = await adminContext(playwright);
  const off = await api.patch("/api/v1/admin/settings", {
    data: { values: { "home.highlights.autoplay": false } },
  });
  expect(off.ok(), `off ${off.status()}`).toBeTruthy();
  await page.waitForTimeout(1500);
  await openHome(page, 1440);
  await expect(page.locator("[data-home-highlights-carousel]")).toHaveAttribute(
    "data-autoplay",
    "off",
  );
  await expect(page.getByRole("button", { name: "Pause promotions" })).toHaveCount(0);

  const on = await api.patch("/api/v1/admin/settings", {
    data: { values: { "home.highlights.autoplay": true } },
  });
  expect(on.ok(), `on ${on.status()}`).toBeTruthy();
  await page.waitForTimeout(1500);
  await openHome(page, 1440);
  await expect(page.locator("[data-home-highlights-carousel]")).toHaveAttribute(
    "data-autoplay",
    "on",
  );
  await api.dispose();
});
