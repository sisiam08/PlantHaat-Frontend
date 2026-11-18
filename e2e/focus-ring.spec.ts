import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

async function gotoHome(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(document.documentElement.dataset.inputModality));
}

async function tabTo(page: Page, selector: string): Promise<void> {
  for (let index = 0; index < 140; index += 1) {
    await page.keyboard.press("Tab");
    const reached = await page.evaluate(
      (target) => document.activeElement?.matches(target) ?? false,
      selector,
    );
    if (reached) return;
  }
  throw new Error(`tabTo: ${selector} was not reached`);
}

type RingInfo = {
  modality: string | null;
  borderTopColor: string;
  borderTopWidth: string;
  borderStyle: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  zIndex: string;
  pointerEvents: string;
  position: string;
  radius: string;
  wrapperRadius: string;
  linkOutline: string;
};

async function ringInfo(page: Page, selector: string): Promise<RingInfo> {
  return page.evaluate((target) => {
    const element = document.querySelector(target) as HTMLElement;
    const pseudo = getComputedStyle(element, "::after");
    const self = getComputedStyle(element);
    const link = element.matches("a") ? element : element.querySelector("a");
    return {
      modality: document.documentElement.dataset.inputModality ?? null,
      borderTopColor: pseudo.borderTopColor,
      borderTopWidth: pseudo.borderTopWidth,
      borderStyle: pseudo.borderTopStyle,
      top: pseudo.top,
      right: pseudo.right,
      bottom: pseudo.bottom,
      left: pseudo.left,
      zIndex: pseudo.zIndex,
      pointerEvents: pseudo.pointerEvents,
      position: pseudo.position,
      radius: pseudo.borderTopLeftRadius,
      wrapperRadius: self.borderTopLeftRadius,
      linkOutline: link ? getComputedStyle(link).outlineStyle : "none",
    };
  }, selector);
}

function isTransparent(color: string): boolean {
  return color === "rgba(0, 0, 0, 0)" || color === "transparent";
}

function contrastRatio(rgb: string, background = [255, 255, 255]): number {
  const values = rgb.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
  const linear = values.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const bg = background.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const bgLuminance = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
  const lighter = Math.max(luminance, bgLuminance);
  const darker = Math.min(luminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test("product card: click (image and text) then Back leaves no frame", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await gotoHome(page);
  const card = page.locator("[data-product-card]").first();
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await card.scrollIntoViewIfNeeded();

  // image area
  await card.locator("img").first().click();
  await page.waitForURL(/\/products\//, { timeout: 30_000 });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await card.waitFor({ state: "visible" });
  await page.waitForTimeout(600);
  let info = await ringInfo(page, "[data-product-card]");
  expect(info.modality).toBe("pointer");
  expect(isTransparent(info.borderTopColor), "image click frame").toBe(true);
  expect(info.linkOutline).toBe("none");

  // text area
  await card.scrollIntoViewIfNeeded();
  await card.locator("p").first().click();
  await page.waitForURL(/\/products\//, { timeout: 30_000 });
  await page.evaluate(() => history.back());
  await page.waitForTimeout(900);
  info = await ringInfo(page, "[data-product-card]");
  expect(info.modality).toBe("pointer");
  expect(isTransparent(info.borderTopColor), "text click frame").toBe(true);

  const after = await card.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      border: style.borderTopColor,
      borderStyle: style.borderTopStyle,
      shadow: style.boxShadow,
    };
  });
  expect(after.border).toBe("rgb(218, 212, 195)");
  expect(after.borderStyle).toBe("solid");
  expect(after.shadow.includes("inset")).toBe(false);
  await page.screenshot({ path: "../.artifacts/focus/after-back-1280.png" });
});

test("hover and active keep the neutral shadow only", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await gotoHome(page);
  const card = page.locator("[data-product-card]").first();
  await card.waitFor({ state: "visible" });
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height - 20);
  await page.waitForTimeout(200);
  expect(isTransparent((await ringInfo(page, "[data-product-card]")).borderTopColor)).toBe(true);

  await page.mouse.down();
  await page.waitForTimeout(150);
  expect(isTransparent((await ringInfo(page, "[data-product-card]")).borderTopColor)).toBe(true);
  await page.mouse.up();
});

test("Tab: one complete overlay ring above the whole card", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await gotoHome(page);
  await tabTo(page, '[data-product-card] a[href^="/products/"]');
  const info = await ringInfo(page, "[data-product-card]");
  expect(info.modality).toBe("keyboard");
  expect(info.borderTopWidth).toBe("2px");
  expect(isTransparent(info.borderTopColor)).toBe(false);
  expect(info.position).toBe("absolute");
  expect([info.top, info.right, info.bottom, info.left]).toEqual(["0px", "0px", "0px", "0px"]);
  expect(Number(info.zIndex)).toBeGreaterThanOrEqual(10);
  expect(info.pointerEvents).toBe("none");
  expect(info.radius).toBe(info.wrapperRadius);
  expect(info.linkOutline).toBe("none");
  expect(contrastRatio(info.borderTopColor)).toBeGreaterThanOrEqual(3);

  // The overlay is inset 0 on the wrapper, so it covers the image and text.
  const fullyInsideRail = await page.locator("[data-product-card]").first().evaluate((element) => {
    const rail = element.closest("[data-rail-scroller]");
    if (!rail) return true;
    const card = element.getBoundingClientRect();
    const box = rail.getBoundingClientRect();
    return card.top >= box.top - 1 && card.bottom <= box.bottom + 1;
  });
  expect(fullyInsideRail).toBe(true);
  await page.screenshot({ path: "../.artifacts/focus/keyboard-1280.png" });
});

test("last card of a rail keeps the ring inside the rail", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await gotoHome(page);
  const cards = page.locator('[data-product-card] a[href^="/products/"]');
  const count = await cards.count();
  await page.keyboard.press("Tab");
  await cards.nth(Math.min(count, 6) - 1).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const info = await page.evaluate(() => {
    const element = (document.activeElement as HTMLElement).closest(
      "[data-product-card]",
    ) as HTMLElement;
    const pseudo = getComputedStyle(element, "::after");
    return {
      modality: document.documentElement.dataset.inputModality ?? null,
      color: pseudo.borderTopColor,
      width: pseudo.borderTopWidth,
      inside: (() => {
        const rail = element.closest("[data-rail-scroller]");
        if (!rail) return true;
        const card = element.getBoundingClientRect();
        const box = rail.getBoundingClientRect();
        return card.top >= box.top - 1 && card.bottom <= box.bottom + 1;
      })(),
    };
  });
  expect(info.modality).toBe("keyboard");
  expect(isTransparent(info.color)).toBe(false);
  expect(info.width).toBe("2px");
  expect(info.inside).toBe(true);
});

test("programmatic focus after a pointer stays clean; keyboard focus shows", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await gotoHome(page);
  await page.mouse.move(8, 8);
  await page.mouse.down();
  await page.mouse.up();
  await page.locator('[data-product-card] a[href^="/products/"]').first().focus();
  await page.waitForTimeout(200);
  let info = await ringInfo(page, "[data-product-card]");
  expect(info.modality).toBe("pointer");
  expect(isTransparent(info.borderTopColor)).toBe(true);

  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await page.locator('[data-product-card] a[href^="/products/"]').first().focus();
  await page.waitForTimeout(200);
  info = await ringInfo(page, "[data-product-card]");
  expect(info.modality).toBe("keyboard");
  expect(isTransparent(info.borderTopColor)).toBe(false);
});

test("category tile and shop card share the overlay rule", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await gotoHome(page);
  await tabTo(page, "[data-category-tile]");
  const tile = await ringInfo(page, "[data-category-tile]");
  expect(tile.modality).toBe("keyboard");
  expect(tile.borderTopWidth).toBe("2px");
  expect(isTransparent(tile.borderTopColor)).toBe(false);
  expect(contrastRatio(tile.borderTopColor)).toBeGreaterThanOrEqual(3);

  await page.goto("/shops", { waitUntil: "domcontentloaded" });
  if (await page.locator('a[href^="/shops/"]').count()) {
    await tabTo(page, 'a[href^="/shops/"]');
    const shop = await ringInfo(page, '[data-card-focus]:has(a[href^="/shops/"])');
    expect(shop.borderTopWidth).toBe("2px");
    expect(isTransparent(shop.borderTopColor)).toBe(false);
  }
});

test("wishlist heart keeps one button ring and no card frame", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await gotoHome(page);
  await tabTo(page, "[data-card-wishlist]");
  const card = await ringInfo(page, "[data-product-card]");
  expect(isTransparent(card.borderTopColor), "wrapper must not ring for the heart").toBe(true);
  const heart = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const style = getComputedStyle(element);
    return { shadow: style.boxShadow, outline: style.outlineStyle };
  });
  expect(heart.shadow).not.toBe("none");
});

test.describe("touch", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("tap leaves no frame", async ({ page, context }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);
    await gotoHome(page);
    const card = page.locator("[data-product-card]").first();
    await card.waitFor({ state: "visible" });
    await card.locator("a[href^='/products/']").first().tap();
    await page.waitForURL(/\/products\//, { timeout: 30_000 });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await card.waitFor({ state: "visible" });
    const info = await ringInfo(page, "[data-product-card]");
    expect(info.modality).toBe("pointer");
    expect(isTransparent(info.borderTopColor)).toBe(true);
  });
});

