export const DEFAULT_BUDGET_CATEGORIES = [
  { key: "social", label: "Social", type: "expense" as const },
  { key: "philanthropy", label: "Philanthropy", type: "expense" as const },
  { key: "operations", label: "Operations", type: "expense" as const },
  { key: "housing", label: "Housing", type: "expense" as const },
  { key: "nationals", label: "Nationals Fees", type: "expense" as const },
  { key: "dues_income", label: "Dues & assessments", type: "income" as const },
  { key: "misc", label: "Misc", type: "expense" as const },
] as const;

const MERCHANT_RULES: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /starbucks|mcdonald|restaurant|grubhub|doordash|uber eats/i, category: "social" },
  { pattern: /habitat|food bank|charity|donation|gofundme/i, category: "philanthropy" },
  { pattern: /rent|housing|apartment|landlord/i, category: "housing" },
  { pattern: /national|ifc|panhellenic|headquarters/i, category: "nationals" },
  { pattern: /dues|assessment|touseos|stripe/i, category: "dues_income" },
  { pattern: /office|supplies|staples|amazon|target|walmart/i, category: "operations" },
];

export function suggestCategory(description: string, merchant?: string | null): string {
  const text = `${merchant ?? ""} ${description}`.trim();
  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return "misc";
}
