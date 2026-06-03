#!/usr/bin/env node
/**
 * Post-deploy smoke checks (no auth). Usage:
 *   BASE_URL=https://app.example.com node scripts/smoke-pilot.mjs
 */

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function check(path, expectStatus = 200) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url);
    const ok = expectStatus === 200 ? res.ok : res.status === expectStatus;
    console.log(`${ok ? "✓" : "✗"} ${res.status} ${path}`);
    if (!ok) process.exitCode = 1;
    if (path === "/api/ready" && res.ok) {
      const body = await res.json();
      if (body.status !== "ok") {
        console.log("  ⚠ ready status:", body.status, "(set production env vars)");
      }
    }
  } catch (e) {
    console.log(`✗ ${path} — ${e.message}`);
    process.exitCode = 1;
  }
}

console.log(`\nSmoke pilot — ${base}\n`);
await check("/api/ready");
await check("/login");
await check("/terms");
await check("/privacy");
console.log("\nDone. Complete live flows in docs/launch-checklist.md.\n");
