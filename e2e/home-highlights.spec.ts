import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

test.setTimeout(180_000);

async function openHome(page: Page, locale: "bn" | "en", width: number) {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
  ]);
  await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
  await page.addInitScript(() => {
    (window as unknown as { __hlCls?: number }).__hlCls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[]) {
        if (!entry.hadRecentInput) {
          (window as unknown as { __hlCls: number }).__hlCls += entry.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator("[data-home-hero] h1").first().waitFor({ state: "visible", timeout: 30000 });
  await page
    .locator("[data-highlight-slide]")
    .first()
    .waitFor({ state: "attached", timeout: 10000 })
    .catch(() => undefined);
  await page.waitForTimeout(1500);
}

async function scrollToHighlights(page: Page) {
  await page.evaluate(() => {
    const section = document.getElementById("home-highlights");
    if (section) section.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1500);
}

for (const locale of ["bn", "en"] as const) {
  for (const width of [1440, 768, 390] as const) {
    test(`highlights render with the right geometry at ${width}px (${locale})`, async ({ page }) => {
      await openHome(page, locale, width);
      const section = page.locator("#home-highlights");
      if ((await section.count()) === 0) {
        test.skip(true, "Highlights are off or have no active slides in this environment");
      }
      await expect(section).toBeVisible();
      const audit = await page.evaluate(() => {
        const box = document.querySelector("#home-highlights")!.closest("section")!;
        const slide = box.querySelector("[data-highlight-slide]") as HTMLElement | null;
        return {
          slideTop: slide ? Math.round(slide.getBoundingClientRect().top) : null,
          slideHeight: slide ? Math.round(slide.getBoundingClientRect().height) : null,
          width: slide?.getBoundingClientRect().width ?? 0,
          overflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          cls: (window as unknown as { __hlCls?: number }).__hlCls ?? 0,
        };
      });
      expect(audit.slideTop).not.toBeNull();
      expect(audit.overflow).toBeLessThanOrEqual(1);
      expect(audit.cls).toBeLessThanOrEqual(0.1);
      if (width >= 768) {
        expect(audit.slideHeight! / audit.width).toBeGreaterThan(0.28);
        expect(audit.slideHeight! / audit.width).toBeLessThan(0.36);
      } else {
        expect(audit.slideHeight! / audit.width).toBeGreaterThan(0.6);
        expect(audit.slideHeight! / audit.width).toBeLessThan(0.72);
      }
    });
  }
}

test("art direction downloads only the matching image variant", async ({ page }) => {
  await openHome(page, "en", 390);
  if ((await page.locator("[data-highlight-slide]").count()) === 0) {
    test.skip(true, "No highlights in this environment");
  }
  await scrollToHighlights(page);
  const mobileSrc = await page
    .locator("[data-highlight-slide] img")
    .first()
    .evaluate((img) => (img as HTMLImageElement).currentSrc);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await scrollToHighlights(page);
  const desktopSrc = await page
    .locator("[data-highlight-slide] img")
    .first()
    .evaluate((img) => (img as HTMLImageElement).currentSrc);
  expect(mobileSrc).not.toBe("");
  expect(desktopSrc).not.toBe("");
  expect(mobileSrc).not.toBe(desktopSrc);
});

test("highlights section is axe clean", async ({ page }) => {
  await openHome(page, "en", 390);
  if ((await page.locator("[data-highlight-slide]").count()) === 0) {
    test.skip(true, "No highlights in this environment");
  }
  const results = await new AxeBuilder({ page })
    .include("#home-highlights")
    .analyze();
  expect(
    results.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length })),
  ).toEqual([]);
});

test("admin highlights page opens at desktop and mobile", async ({ page }) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "ADMIN_EMAIL / ADMIN_PASSWORD are not set for this environment",
  );
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
  const status = await page.evaluate(
    async ([email, password]) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    [ADMIN_EMAIL, ADMIN_PASSWORD],
  );
  expect(status).toBe(200);
  for (const width of [1280, 390] as const) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/admin/highlights", { waitUntil: "domcontentloaded", timeout: 90000 });
    await expect(page.getByRole("heading", { name: /home highlights|হোম হাইলাইট/i }).first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole("button", { name: /add slide|স্লাইড যোগ/i }).first()).toBeVisible();
  }
});
