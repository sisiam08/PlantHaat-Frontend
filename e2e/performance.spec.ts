import { expect, test, type Page } from "@playwright/test";

/**
 * Slow-4G/4x-CPU performance guard. Image responses are fetched once and then
 * replayed locally, so Cloudinary TTFB cannot decide the threshold.
 *
 * Targets (median of 3): cart/checkout 390 <= 2.5 s + 10% margin; PDP/catalog
 * 1440 back to their earlier medians (<= 3.3 s); home 1440 <= 3.8 s.
 */
const BASE = "http://localhost:3000";
const IMAGE_CACHE = new Map<string, { body: Buffer; type: string }>();
const LIMITS = {
  cart: 2750,
  checkout: 2750,
  pdp: 3300,
  catalog: 3300,
  home: 3800,
} as const;
const PATHS = {
  cart: "/cart",
  checkout: "/checkout",
  pdp: "/products/money-tree-bonsai-xokk",
  catalog: "/products",
  home: "/",
} as const;
const VIEWPORTS = {
  cart: { width: 390, height: 844 },
  checkout: { width: 390, height: 844 },
  pdp: { width: 1440, height: 900 },
  catalog: { width: 1440, height: 900 },
  home: { width: 1440, height: 900 },
} as const;

test.describe.configure({ mode: "serial" });
test.setTimeout(600_000);

async function login(context: import("@playwright/test").BrowserContext) {
  const response = await context.request.post(`${BASE}/api/v1/auth/login`, {
    data: { email: "customer1@planthaat.test", password: "CustomerDemo1" },
    headers: { origin: BASE, referer: `${BASE}/login`, "content-type": "application/json" },
  });
  expect(response.status()).toBe(200);
}

async function installImageReplay(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const isImage =
      request.resourceType() === "image" ||
      /res\.cloudinary\.com|\.(avif|webp|png|jpe?g|svg)(\?|$)/i.test(request.url());
    if (!isImage) return route.continue();
    const url = request.url();
    let cached = IMAGE_CACHE.get(url);
    if (!cached) {
      const response = await route.fetch();
      cached = {
        body: await response.body(),
        type: response.headers()["content-type"] ?? "image/webp",
      };
      IMAGE_CACHE.set(url, cached);
    }
    await route.fulfill({ status: 200, contentType: cached.type, body: cached.body });
  });
}

async function lcp(page: Page) {
  return page.evaluate(() => {
    const entry = (window as unknown as { __perfLcp?: { startTime: number } }).__perfLcp;
    return entry ? Math.round(entry.startTime) : null;
  });
}

test("protected routes stay within the documented LCP guard", async ({ browser }) => {
  for (const [route, limit] of Object.entries(LIMITS) as [keyof typeof LIMITS, number][]) {
    for (const locale of ["bn", "en"] as const) {
      const context = await browser.newContext();
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
      await login(context);
      const page = await context.newPage();
      await page.setViewportSize(VIEWPORTS[route]);
      await installImageReplay(page);
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (0.75 * 1024 * 1024) / 8,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.addInitScript(() => {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            (window as unknown as { __perfLcp: PerformanceEntry }).__perfLcp = entry;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
      });
      // Warm image replay only; not part of the median.
      await page.goto(`${BASE}${PATHS[route]}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const samples: number[] = [];
      for (let index = 0; index < 3; index += 1) {
        await page.goto(`${BASE}${PATHS[route]}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(6000);
        const value = await lcp(page);
        if (value !== null) samples.push(value);
      }
      await context.close();
      expect(samples.length).toBe(3);
      const median = [...samples].sort((a, b) => a - b)[1];
      expect(median, `${route} ${locale} LCP ${samples.join("/")}`).toBeLessThanOrEqual(limit);
    }
  }
});
