import { getLaunchReadiness } from "@/lib/launch-env";
import {
  getIntegrationStatuses,
  isAnthropicConfigured,
  isMapboxConfigured,
  isPlaidConfigured,
} from "@/lib/integrations";

export interface DepthGapItem {
  id: string;
  label: string;
  category: "integrations" | "migrations" | "pilot" | "legal" | "module";
  points: number;
  done: boolean;
  hint?: string;
}

export interface ProductDepthReport {
  overallPercent: number;
  remainingPercent: number;
  gaps: DepthGapItem[];
  categories: Array<{ id: string; label: string; percent: number; remaining: number }>;
}

const MIGRATION_LATEST = "056";

function keyConfigured(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

export function getProductDepthReport(): ProductDepthReport {
  const launch = getLaunchReadiness();
  const integrations = getIntegrationStatuses();

  const gaps: DepthGapItem[] = [
    {
      id: "migrations",
      label: `Apply Supabase migrations through ${MIGRATION_LATEST} in production`,
      category: "migrations",
      points: 4,
      done: false,
      hint: "Run scripts in supabase/APPLY_MIGRATIONS.md after merge",
    },
    {
      id: "stripe-live",
      label: "Stripe Connect + webhook pilot (treasurer checkout → paid)",
      category: "pilot",
      points: 3,
      done: launch.paymentsOk && integrations.find((i) => i.id === "stripe")?.live === true,
    },
    {
      id: "twilio-live",
      label: "Twilio live SMS + STOP / quiet hours validation",
      category: "pilot",
      points: 2,
      done: integrations.find((i) => i.id === "twilio")?.live === true,
    },
    {
      id: "cron-secret",
      label: "CRON_SECRET set and all 11 cron jobs firing",
      category: "integrations",
      points: 2,
      done: keyConfigured("CRON_SECRET"),
    },
    {
      id: "anthropic",
      label: "Anthropic API key for AI assistant",
      category: "integrations",
      points: 1,
      done: isAnthropicConfigured(),
    },
    {
      id: "mapbox",
      label: "Mapbox token for hometown autocomplete",
      category: "integrations",
      points: 1,
      done: isMapboxConfigured(),
    },
    {
      id: "plaid",
      label: "Plaid keys for bank connect (finance layer)",
      category: "integrations",
      points: 1,
      done: isPlaidConfigured(),
    },
    {
      id: "resend",
      label: "Resend for live email blasts",
      category: "integrations",
      points: 1,
      done: integrations.find((i) => i.id === "resend")?.configured === true,
    },
    {
      id: "pilot-smoke",
      label: "Pilot smoke: auth → invite → dues → RSVP → check-in",
      category: "pilot",
      points: 3,
      done: false,
      hint: "npm run launch:check && manual chapter walkthrough",
    },
    {
      id: "legal",
      label: "Legal review (privacy, terms, SMS consent copy)",
      category: "legal",
      points: 2,
      done: false,
    },
    {
      id: "nme-depth",
      label: "NME officer workflow depth (modules, quizzes, certificates)",
      category: "module",
      points: 2,
      done: false,
      hint: "~80% module — polish after live pilot",
    },
  ];

  const totalPoints = gaps.reduce((s, g) => s + g.points, 0);
  const donePoints = gaps.filter((g) => g.done).reduce((s, g) => s + g.points, 0);

  const codeBasePercent = 90;
  const opsPercent = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 100;
  const overallPercent = Math.round(codeBasePercent * 0.9 + opsPercent * 0.1);
  const remainingPercent = Math.max(0, 100 - overallPercent);

  const byCategory = ["integrations", "migrations", "pilot", "legal", "module"] as const;
  const categories = byCategory.map((id) => {
    const items = gaps.filter((g) => g.category === id);
    const pts = items.reduce((s, g) => s + g.points, 0);
    const done = items.filter((g) => g.done).reduce((s, g) => s + g.points, 0);
    return {
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      percent: pts ? Math.round((done / pts) * 100) : 100,
      remaining: pts - done,
    };
  });

  return {
    overallPercent,
    remainingPercent,
    gaps,
    categories,
  };
}
