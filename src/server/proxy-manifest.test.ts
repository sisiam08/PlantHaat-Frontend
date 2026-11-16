import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regression guard for the Next 16 proxy convention.
 *
 * Next 16 records proxies in `server/functions-config-manifest.json` under
 * `/_middleware` (the legacy `middleware-manifest.json` may legitimately be
 * empty). If a future dependency upgrade drops the proxy file from the build,
 * this fails instead of silently leaving private routes ungated at the edge.
 */
const cwd = process.cwd();
const proxySourcePath = path.join(cwd, "src", "proxy.ts");
const candidates = [".next", ".next-prod", process.env.NEXT_DIST_DIR]
  .filter((entry): entry is string => Boolean(entry))
  .map((entry) => path.join(cwd, entry));

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch {
    return null;
  }
}

const inspected = candidates.flatMap((distDir) => {
  const legacy = path.join(distDir, "server", "middleware-manifest.json");
  const functions = path.join(distDir, "server", "functions-config-manifest.json");
  if (!existsSync(legacy) && !existsSync(functions)) {
    return [];
  }
  const legacyManifest = readJson(legacy) as { middleware?: Record<string, unknown> } | null;
  const functionsManifest = readJson(functions) as
    | { functions?: Record<string, unknown> }
    | null;
  return [
    {
      distDir,
      legacyCount: Object.keys(legacyManifest?.middleware ?? {}).length,
      hasProxyFunction: Boolean(functionsManifest?.functions?.["/_middleware"]),
    },
  ];
});

describe("proxy registration", () => {
  it("keeps src/proxy.ts and its protected matcher", () => {
    expect(existsSync(proxySourcePath)).toBe(true);
    const source = readFileSync(proxySourcePath, "utf8");
    for (const route of [
      "/checkout/:path*",
      "/orders/:path*",
      "/account/:path*",
      "/wishlist/:path*",
      "/notifications/:path*",
      "/complaints/:path*",
      "/seller/:path*",
      "/admin/:path*",
    ]) {
      expect(source, `missing matcher ${route}`).toContain(route);
    }
  });

  it.skipIf(inspected.length === 0)(
    "is registered in a compiled Next build",
    () => {
      for (const build of inspected) {
        expect(
          build.legacyCount > 0 || build.hasProxyFunction,
          `proxy/middleware manifest is empty in ${build.distDir}`,
        ).toBe(true);
      }
    },
  );
});
