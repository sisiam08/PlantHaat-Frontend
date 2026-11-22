import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import vm from "node:vm";

const dist = resolve(process.env.NEXT_DIST_DIR ?? ".next");

const routes = {
  "/": "server/app/(public)/page_client-reference-manifest.js",
  "/products": "server/app/(public)/products/page_client-reference-manifest.js",
  "/products/[slug]":
    "server/app/(public)/products/[slug]/page_client-reference-manifest.js",
  "/cart": "server/app/(public)/cart/page_client-reference-manifest.js",
  "/checkout": "server/app/(customer)/checkout/page_client-reference-manifest.js",
  "/admin": "server/app/(admin)/admin/page_client-reference-manifest.js",
  "/seller/dashboard":
    "server/app/(seller)/seller/dashboard/page_client-reference-manifest.js",
};

// Public budgets are the documented storefront limits; admin/seller budgets are
// measured from the production build plus a 10% headroom (charts load per route).
const budgetsKb = {
  "/": 400,
  "/products": 415,
  "/products/[slug]": 430,
  "/cart": 395,
  "/checkout": 385,
  "/admin": 500,
  "/seller/dashboard": 500,
};

// Public routes must never pull dashboard/chart code (or the private panel
// features) into their client manifests.
const PUBLIC_ROUTES = new Set(["/", "/products", "/products/[slug]", "/cart", "/checkout"]);
const FORBIDDEN_MODULE_PATTERNS = [
  "/components/dashboard/",
  "/features/admin/",
  "/features/seller/",
  "/recharts/",
];

let failed = false;
const cache = new Map();
const buildManifest = JSON.parse(readFileSync(resolve(dist, "build-manifest.json"), "utf8"));
const rootChunks = new Set(
  (buildManifest.rootMainFiles ?? []).map((file) =>
    file.startsWith("/_next/") ? file : `/_next/${file.replace(/^\//, "")}`,
  ),
);

function loadManifest(manifestPath) {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(readFileSync(resolve(dist, manifestPath), "utf8"), sandbox, {
    timeout: 5_000,
  });
  return Object.values(sandbox.globalThis.__RSC_MANIFEST ?? {})[0];
}

for (const [route, manifestPath] of Object.entries(routes)) {
  const full = resolve(dist, manifestPath);
  if (!existsSync(full)) {
    console.error(`missing manifest for ${route}: ${manifestPath}`);
    failed = true;
    continue;
  }
  const manifest = loadManifest(manifestPath);
  const chunks = new Set();
  for (const chunk of rootChunks) chunks.add(chunk);
  const modulePaths = new Set();
  for (const [modulePath, clientModule] of Object.entries(manifest?.clientModules ?? {})) {
    modulePaths.add(modulePath);
    for (const chunk of clientModule.chunks ?? []) chunks.add(chunk);
  }
  let bytes = 0;
  for (const chunk of chunks) {
    if (!cache.has(chunk)) {
      const file = resolve(dist, chunk.replace(/^\/_next\//, ""));
      cache.set(chunk, existsSync(file) ? gzipSync(readFileSync(file)).length : 0);
    }
    bytes += cache.get(chunk);
  }
  const kb = Math.round(bytes / 1024);
  const budget = budgetsKb[route];
  const status = kb <= budget ? "ok" : "OVER";
  if (kb > budget) failed = true;
  console.log(`${status.padEnd(4)} ${route.padEnd(18)} ${String(kb).padStart(4)} KB / ${budget} KB`);

  if (PUBLIC_ROUTES.has(route)) {
    const leaks = [...modulePaths].filter((modulePath) =>
      FORBIDDEN_MODULE_PATTERNS.some((pattern) => modulePath.includes(pattern)),
    );
    if (leaks.length > 0) {
      failed = true;
      console.error(`LEAK ${route}: public bundle imports private dashboard code:`);
      for (const leak of leaks) console.error(`  - ${leak}`);
    }
  }
}

if (failed) process.exitCode = 1;
