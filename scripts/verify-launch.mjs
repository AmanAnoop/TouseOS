#!/usr/bin/env node
/**
 * Local launch env check. Mirrors GET /api/ready env slice.
 * Usage: npm run launch:check
 */

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

let failed = 0;

console.log("\nTouseOS launch environment check\n");

for (const key of REQUIRED) {
  const pass = ok(key);
  console.log(`${pass ? "✓" : "✗"} ${key} (required)`);
  if (!pass) failed++;
}

console.log("\nStripe (required for live dues):");
for (const key of PAYMENTS) {
  const pass = ok(key);
  console.log(`${pass ? "✓" : "○"} ${key}`);
  if (!pass) failed++;
}

if (process.env.NODE_ENV === "production") {
  console.log("\nProduction cron:");
  for (const key of PROD) {
    const pass = ok(key);
    console.log(`${pass ? "✓" : "✗"} ${key}`);
    if (!pass) failed++;
  }
}

console.log("\nMigrations: apply supabase/migrations/001 through 024 in order.");
console.log("Optional seed: 005_seed.sql");
console.log("Ops endpoint after deploy: GET /api/ready\n");

if (failed > 0) {
  console.error(`Missing ${failed} required variable(s). Copy .env.example → .env.local\n`);
  process.exit(1);
}

console.log("Core env looks good. Run npm run build and complete docs/launch-checklist.md.\n");
