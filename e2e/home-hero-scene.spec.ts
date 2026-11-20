import AxeBuilder from "@axe-core/playwright";
import { createRequire } from "node:module";

import { expect, test, type Page } from "@playwright/test";

const nodeRequire = createRequire(`${process.cwd()}/e2e/home-hero-scene.spec.ts`);
interface SharpPipeline {
  removeAlpha(): SharpPipeline;
  raw(): SharpPipeline;
  toBuffer(options: { resolveWithObject: true }): Promise<{
    data: Buffer;
    info: { width: number; height: number };
  }>;
}
const sharp = nodeRequire("../../backend/node_modules/sharp") as (
  input: Buffer | string,
) => SharpPipeline;

test.setTimeout(180_000);

async function openHome(page: Page, locale: "bn" | "en" = "en", width = 1440) {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
  ]);
  await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await expect(page.locator("[data-home-hero] h1").first()).toBeVisible({ timeout: 30000 });
}

test.describe("hero plant scene", () => {
  test("restores the editorial left side and renders four plants", async ({ page }) => {
    for (const locale of ["bn", "en"] as const) {
      await openHome(page, locale, 1440);
      await expect(page.locator("[data-hero-stage]")).toBeVisible();
      await expect(page.locator("[data-home-hero] h1")).toHaveText(
        locale === "en" ? /Fill your home with green/ : /আপনার ঘর সবুজে ভরে তুলুন/,
      );
      await expect(page.getByRole("search")).toBeVisible();
      await expect(page.getByRole("button", { name: /Search products|পণ্য খুঁজুন/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /Explore shops|দোকান ঘুরে দেখুন/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /Browse plants|গাছ দেখুন/ }).first()).toBeVisible();
      const plants = await page.locator("[data-hero-stage] img[data-hero-plant]").count();
      expect(plants).toBe(4);
      const order = await page
        .locator("[data-hero-stage] img[data-hero-plant]")
        .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.order));
      expect(order).toEqual(["0", "1", "2", "3"]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });

  test("static scene remains when WebGL is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...args: unknown[]
      ) {
        if (String(type).includes("webgl")) return null;
        return (
          original as unknown as (
            this: HTMLCanvasElement,
            type: string,
            ...params: unknown[]
          ) => unknown
        ).call(this, type, ...args);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await openHome(page, "en", 1280);
    await page.waitForTimeout(800);
    expect(await page.locator("[data-hero-stage][data-hero-ready]").count()).toBe(0);
    const visible = await page
      .locator("[data-hero-stage] img[data-hero-plant]")
      .evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node as HTMLElement).visibility !== "hidden"),
      );
    expect(visible).toBe(true);
    expect(await page.evaluate(() => window.__heroSway)).toBeUndefined();
  });

  test("canvas never initialises for reduced motion or save-data", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHome(page, "en", 1280);
    await page.waitForTimeout(1000);
    expect(await page.locator("[data-hero-stage][data-hero-ready]").count()).toBe(0);
    expect(await page.evaluate(() => window.__heroSway)).toBeUndefined();
  });

  test("canvas hides the static images after the first frame", async ({ page }) => {
    await openHome(page, "en", 1440);
    await expect(page.locator("[data-hero-stage][data-hero-ready='true']")).toBeVisible({
      timeout: 30000,
    });
    await page.waitForFunction(() => Boolean(window.__heroSway?.ready));
    const state = await page.evaluate(() => window.__heroSway);
    expect(state?.active).toBe(true);
    const hidden = await page
      .locator("[data-hero-stage] img[data-hero-plant]")
      .evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node as HTMLElement).visibility === "hidden"),
      );
    expect(hidden).toBe(true);
    const opacity = await page
      .locator("[data-hero-canvas]")
      .evaluate((node) => getComputedStyle(node as HTMLElement).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.9);
  });

  test("sway moves the fronds but keeps the pots rigid", async ({ page }) => {
    await openHome(page, "en", 1440);
    await expect(page.locator("[data-hero-stage][data-hero-ready='true']")).toBeVisible({
      timeout: 30000,
    });
    await page.waitForFunction(() => (window.__heroSway?.frames ?? 0) > 10);
    const stage = page.locator("[data-hero-stage]");
    const shots: Buffer[] = [];
    for (let index = 0; index < 3; index += 1) {
      shots.push(await stage.screenshot());
      await page.waitForTimeout(400);
    }
    const frames = await Promise.all(
      shots.map(async (shot) => {
        const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({
          resolveWithObject: true,
        });
        return { data, width: info.width, height: info.height };
      }),
    );

    const regionDiff = (a: (typeof frames)[number], b: (typeof frames)[number], top: number, bottom: number) => {
      let sum = 0;
      let count = 0;
      const y0 = Math.floor(a.height * top);
      const y1 = Math.floor(a.height * bottom);
      for (let y = y0; y < y1; y += 1) {
        for (let x = 0; x < a.width; x += 1) {
          const offset = (y * a.width + x) * 3;
          sum += Math.abs(a.data[offset] - b.data[offset]);
          sum += Math.abs(a.data[offset + 1] - b.data[offset + 1]);
          sum += Math.abs(a.data[offset + 2] - b.data[offset + 2]);
          count += 3;
        }
      }
      return sum / Math.max(1, count);
    };

    const upper = Math.max(
      regionDiff(frames[0], frames[1], 0.1, 0.55),
      regionDiff(frames[1], frames[2], 0.1, 0.55),
    );
    const pots = Math.max(
      regionDiff(frames[0], frames[1], 0.86, 0.98),
      regionDiff(frames[1], frames[2], 0.86, 0.98),
    );
    expect(upper).toBeGreaterThan(0.35);
    expect(pots).toBeLessThan(0.6);
  });

  test("animation pauses off-screen and resumes on return", async ({ page }) => {
    await openHome(page, "en", 1440);
    await expect(page.locator("[data-hero-stage][data-hero-ready='true']")).toBeVisible({
      timeout: 30000,
    });
    await page.waitForFunction(() => (window.__heroSway?.frames ?? 0) > 10);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);
    const before = await page.evaluate(() => window.__heroSway?.frames ?? 0);
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => window.__heroSway?.frames ?? 0);
    expect(after).toBe(before);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    const resumed = await page.evaluate(() => window.__heroSway?.frames ?? 0);
    expect(resumed).toBeGreaterThan(after);
  });

  test("stage is not focusable and axe is clean", async ({ page }) => {
    await openHome(page, "en", 390);
    const stageTabIndex = await page
      .locator("[data-hero-stage]")
      .evaluate((node) => (node as HTMLElement).tabIndex);
    expect(stageTabIndex).toBe(-1);
    const results = await new AxeBuilder({ page }).include("[data-home-hero]").analyze();
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.length,
      })),
    ).toEqual([]);
  });

  test("canvas never initialises for save-data", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: true },
      });
    });
    await openHome(page, "en", 1280);
    await page.waitForTimeout(1000);
    expect(await page.locator("[data-hero-stage][data-hero-ready]").count()).toBe(0);
    expect(await page.evaluate(() => window.__heroSway)).toBeUndefined();
  });

  test("admin image override is static and settings text still renders", async ({ page }) => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    test.skip(!email || !password, "ADMIN_EMAIL / ADMIN_PASSWORD are not set");
    await openHome(page, "en", 1440);
    const login = await page.evaluate(
      async ([loginEmail, loginPassword]) => {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        });
        return response.status;
      },
      [email, password],
    );
    expect(login).toBe(200);

    const original = await page.evaluate(async () => {
      const response = await fetch("/api/v1/admin/settings");
      const json = await response.json();
      return {
        headline: json.data["home.hero.headline"],
        subheadline: json.data["home.hero.subheadline"],
        image: json.data["home.hero.image"],
      };
    });
    try {
      const saved = await page.evaluate(async (values) => {
        const response = await fetch("/api/v1/admin/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ values }),
        });
        return response.status;
      }, {
        "home.hero.headline": { bn: "পরীক্ষা শিরোনাম", en: "Test headline" },
        "home.hero.image": {
          url: "/hero/palm.webp",
          mobileUrl: "",
          altBn: "হিরো",
          altEn: "Hero",
          focalX: 50,
          focalY: 50,
        },
      });
      expect(saved).toBe(200);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-home-hero] h1").first()).toHaveText("Test headline", {
        timeout: 30000,
      });
      expect(await page.locator("[data-hero-stage] img[data-hero-plant]").count()).toBe(0);
      await expect(page.locator("[data-home-hero] img[alt='Hero']").first()).toBeVisible();
      expect(await page.locator("[data-hero-stage][data-hero-ready]").count()).toBe(0);
    } finally {
      await page.evaluate(async (values) => {
        await fetch("/api/v1/admin/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ values }),
        });
      }, original);
    }
  });
});
