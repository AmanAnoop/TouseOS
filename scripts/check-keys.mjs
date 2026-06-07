#!/usr/bin/env node
/**
 * Verify config/keys/keys.env exists and has required keys.
 * Usage: npm run keys:check
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const keysPath = resolve(process.cwd(), "config/keys/keys.env");
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];

function hasPublicSupabaseKey(vars) {
  return Boolean(vars.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());
}

function parseEnv(content) {
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

console.log("\nTouseOS keys folder check\n");

if (!existsSync(keysPath)) {
  console.log("✗ config/keys/keys.env not found");
  console.log("  Run: cp config/keys/keys.env.example config/keys/keys.env");
  console.log("  Then fill in your keys in that single file.\n");
  process.exit(1);
}

const vars = parseEnv(readFileSync(keysPath, "utf8"));
let failed = 0;

for (const key of REQUIRED) {
  const ok = Boolean(vars[key]?.trim());
  console.log(`${ok ? "✓" : "✗"} ${key}`);
  if (!ok) failed++;
}

const pubOk = hasPublicSupabaseKey(vars);
console.log(`${pubOk ? "✓" : "✗"} NEXT_PUBLIC_SUPABASE_ANON_KEY or PUBLISHABLE_KEY`);
if (!pubOk) failed++;

const optional = ["STRIPE_SECRET_KEY", "TWILIO_ACCOUNT_SID", "ANTHROPIC_API_KEY", "MAPBOX_ACCESS_TOKEN"];
console.log("\nOptional integrations:");
for (const key of optional) {
  console.log(`${vars[key]?.trim() ? "✓" : "○"} ${key}`);
}

console.log(`\nKeys file: config/keys/keys.env (${Object.keys(vars).length} entries)\n`);

if (failed > 0) {
  process.exit(1);
}
