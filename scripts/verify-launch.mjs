#!/usr/bin/env node
/**
 * Local launch env check. Mirrors GET /api/ready env slice.
 * Usage: npm run launch:check
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadKeysFile() {
  const keysPath = resolve(process.cwd(), "config/keys/keys.env");
  if (!existsSync(keysPath)) return;
  for (const line of readFileSync(keysPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadKeysFile();

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const PAYMENTS = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

const PROD = ["CRON_SECRET"];

function ok(key) {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
}

function hasPublicSupabaseKey() {
  return ok("NEXT_PUBLIC_SUPABASE_ANON_KEY") || ok("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

let failed = 0;

console.log("\nTouseOS launch environment check\n");

for (const key of REQUIRED) {
  const pass =
    key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ? hasPublicSupabaseKey() : ok(key);
  console.log(`${pass ? "✓" : "✗"} ${key} (required)`);
  if (!pass) failed++;
}

const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
if (anon.startsWith("eyJ")) {
  try {
    const payload = JSON.parse(
      Buffer.from(anon.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    );
    if (payload.role === "service_role") {
      console.log("✗ NEXT_PUBLIC_SUPABASE_ANON_KEY looks like service_role — use anon/publishable key");
      failed++;
    }
  } catch {
    /* ignore decode errors */
  }
}

console.log("\nStripe (live dues — webhook optional for local dev):");
for (const key of PAYMENTS) {
  const pass = ok(key);
  const optional = key === "STRIPE_WEBHOOK_SECRET";
  console.log(`${pass ? "✓" : optional ? "○" : "✗"} ${key}${optional ? " (optional locally)" : ""}`);
  if (!pass && !optional) failed++;
}

if (process.env.NODE_ENV === "production") {
  console.log("\nProduction cron:");
  for (const key of PROD) {
    const pass = ok(key);
    console.log(`${pass ? "✓" : "✗"} ${key}`);
    if (!pass) failed++;
  }
}

console.log("\nMigrations: apply supabase/migrations/001 through 058 in order.");
console.log("See supabase/APPLY_MIGRATIONS.md for the full table.");
console.log("Ops endpoint after deploy: GET /api/ready\n");

if (failed > 0) {
  console.error(`Missing ${failed} required variable(s). Copy .env.example → .env.local\n`);
  process.exit(1);
}

console.log("Core env looks good. Run npm run build and complete docs/launch-checklist.md.\n");
