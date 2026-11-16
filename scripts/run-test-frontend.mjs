/**
 * Starts the isolated Part 3 frontend on :3002 against the test API (:5001).
 * Reads the BFF secret from backend/.env.test without printing it.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readEnv(path) {
  const result = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

const backendEnv = readEnv(resolve("../backend/.env.test"));
const env = {
  ...process.env,
  API_INTERNAL_URL: "http://127.0.0.1:5001",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3002",
  NEXT_PUBLIC_REALTIME_URL: "http://localhost:5001",
  NEXT_DIST_DIR: ".next-test",
  PORT: "3002",
  BFF_SHARED_SECRET: backendEnv.BFF_SHARED_SECRET ?? "",
};

const nextBin = resolve("node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", "-p", "3002"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
