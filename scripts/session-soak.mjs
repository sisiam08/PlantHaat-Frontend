/**
 * Long-run session soak in real Chrome.
 *
 * Usage (isolated accelerated stack recommended):
 *   node scripts/session-soak.mjs --base http://localhost:3002 \
 *     --email buyer1@teststack.local --password ... --minutes 5 --tabs 2
 *
 * Never prints token values: the cookie log has name/path/expiry only.
 * Exits non-zero if the session dropped, a refresh failed with an auth error,
 * or a login redirect happened.
 */
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const BASE = arg("base", process.env.SOAK_BASE ?? "http://localhost:3002");
const EMAIL = arg("email", process.env.SOAK_EMAIL);
const PASSWORD = arg("password", process.env.SOAK_PASSWORD);
const MINUTES = Number(arg("minutes", process.env.SOAK_MINUTES ?? 5));
const TABS = Number(arg("tabs", "2"));
const INTERVAL_SECONDS = Number(arg("interval", "20"));
const NAVIGATE_EVERY = Number(arg("navigateEvery", "3"));
const HEADLESS = process.env.SOAK_HEADLESS === "1";

if (!EMAIL || !PASSWORD) {
  console.error("SOAK_EMAIL and SOAK_PASSWORD are required (or --email/--password).");
  process.exit(2);
}

const startedAt = Date.now();
const summary = {
  base: BASE,
  minutes: MINUTES,
  tabs: TABS,
  refreshes: 0,
  refreshAuthFailures: 0,
  unauthorised: 0,
  loginRedirects: 0,
  dialogShown: 0,
  navigations: 0,
  apiCalls: 0,
  errors: [],
  cookies: [],
};

function log(event, details = {}) {
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
      event,
      ...details,
    }),
  );
}

const browser = await chromium.launch({ channel: "chrome", headless: HEADLESS });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const pages = [];
const pageLog = [];

async function cookieJar() {
  const cookies = await context.cookies(BASE);
  return cookies.map((cookie) => ({
    name: cookie.name,
    path: cookie.path,
    expires: cookie.expires,
    hash: createHash("sha256").update(cookie.value).digest("hex").slice(0, 8),
  }));
}

async function attach(page, index) {
  const record = { index, refreshes: 0, auth: 0 };
  pageLog.push(record);
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/v1/auth/refresh")) {
      record.refreshes += 1;
      void response.allHeaders().then((headers) => {
        const setCookie = headers["set-cookie"] ?? "";
        const names = [...setCookie.matchAll(/(?:^|,)\s*(ph_[a-z_]+)=/g)].map((m) => m[1]);
        log("refresh-set-cookie", { tab: index, status: response.status(), names });
      }).catch(() => undefined);
      summary.refreshes += 1;
      if (response.status() === 401 || response.status() === 403) {
        summary.refreshAuthFailures += 1;
        log("refresh-auth-failure", { tab: index, status: response.status() });
      } else {
        log("refresh", { tab: index, status: response.status() });
      }
    }
    if (response.status() === 401) {
      summary.unauthorised += 1;
      if (!url.includes("/auth/me")) {
        log("401", { tab: index, url: url.replace(BASE, ""), refresh: url.includes("/auth/") });
      }
    }
  });
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = frame.url();
    if (url.includes("/login")) {
      summary.loginRedirects += 1;
      log("login-redirect", { tab: index, url: url.replace(BASE, "") });
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error" && /session|refresh|401/i.test(message.text())) {
      log("console", { tab: index, text: message.text().slice(0, 200) });
    }
  });
  page.on("pageerror", (error) => {
    summary.errors.push(`${index}: ${error.message}`);
    log("pageerror", { tab: index, text: error.message.slice(0, 200) });
  });
  return record;
}

try {
  const loginPage = await context.newPage();
  await attach(loginPage, 0);
  pages.push(loginPage);
  await loginPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const loginStatus = await loginPage.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    { email: EMAIL, password: PASSWORD },
  );
  log("login", { status: loginStatus });
  if (loginStatus !== 200) throw new Error(`login failed: ${loginStatus}`);

  for (let index = 1; index < TABS; index += 1) {
    const page = await context.newPage();
    await attach(page, index);
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    pages.push(page);
  }

  const deadline = startedAt + MINUTES * 60_000;
  let cycle = 0;
  while (Date.now() < deadline) {
    cycle += 1;
    const jar = await cookieJar();
    summary.cookies = jar;
    log("cookies", { jar });
    for (const [index, page] of pages.entries()) {
      if (page.isClosed()) continue;
      // Tab 0 drives navigations; other tabs stay idle and do a light fetch.
      if (index === 0 && cycle % NAVIGATE_EVERY === 0) {
        summary.navigations += 1;
        try {
          const response = await page.goto(`${BASE}/account/sessions`, {
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
          log("navigate", { tab: index, status: response?.status(), path: "/account/sessions" });
        } catch (error) {
          summary.errors.push(`navigate: ${error.message}`);
          log("navigate-error", { tab: index, text: error.message.slice(0, 200) });
        }
      } else {
        summary.apiCalls += 1;
        const status = await page
          .evaluate(async () => {
            const response = await fetch("/api/v1/wishlist?page=1");
            return response.status;
          })
          .catch(() => 0);
        log("api", { tab: index, status });
      }
      const dialog = await page.locator("[data-session-expired-dialog]").count().catch(() => 0);
      if (dialog > 0) {
        summary.dialogShown += 1;
        log("session-dialog", { tab: index });
      }
      if (page.url().includes("/login")) {
        summary.loginRedirects += 1;
        log("on-login-page", { tab: index, url: page.url().replace(BASE, "") });
      }
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_SECONDS * 1000));
  }

  log("summary", summary);
  const failed =
    summary.refreshAuthFailures > 0 ||
    summary.loginRedirects > 0 ||
    summary.dialogShown > 0 ||
    summary.errors.length > 0;
  process.exitCode = failed ? 1 : 0;
} catch (error) {
  summary.errors.push(error.message);
  log("fatal", { text: error.message });
  process.exitCode = 1;
} finally {
  await browser.close();
}
