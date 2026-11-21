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
};

const budgetsKb = {
  "/": 400,
  "/products": 415,
  "/products/[slug]": 430,
  "/cart": 395,
  "/checkout": 385,
};

let failed = false;
const cache = new Map();
const buildManifest = JSON.parse(readFileSync(resolve(dist, "build-manifest.json"), "utf8"));
const rootChunks = new Set(
  (buildManifest.rootMainFiles ?? []).map((file) =>
    file.startsWith("/_next/") ? file : `/_next/${file.replace(/^\//, "")}`,
  ),
);
for (const [route, manifestPath] of Object.entries(routes)) {
  const full = resolve(dist, manifestPath);
  if (!existsSync(full)) {
    console.error(`missing manifest for ${route}: ${manifestPath}`);
    failed = true;
    continue;
  }
  const sandbox = { globalThis: {} };
  vm.runInNewContext(readFileSync(full, "utf8"), sandbox, { timeout: 5_000 });
  const manifest = Object.values(sandbox.globalThis.__RSC_MANIFEST ?? {})[0];
  const chunks = new Set();
  for (const chunk of rootChunks) chunks.add(chunk);
  for (const clientModule of Object.values(manifest?.clientModules ?? {})) {
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
}
if (failed) process.exitCode = 1;
