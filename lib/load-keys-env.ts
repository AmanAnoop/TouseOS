import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/** Load integration keys from config/keys/keys.env (does not override existing env vars). */
export function loadKeysFromConfigFolder(): void {
  const keysPath = resolve(process.cwd(), "config/keys/keys.env");
  if (!existsSync(keysPath)) return;

  const lines = readFileSync(keysPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
