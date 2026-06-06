export interface ConditionalField {
  id: string;
  showWhen?: { fieldId: string; equals: string | boolean };
}

export function isFieldVisible(
  field: ConditionalField,
  answers: Record<string, string | boolean>,
): boolean {
  if (!field.showWhen) return true;
  const actual = answers[field.showWhen.fieldId];
  if (typeof field.showWhen.equals === "boolean") {
    return Boolean(actual) === field.showWhen.equals;
  }
  return String(actual ?? "") === field.showWhen.equals;
}

export function groupFieldsByPage<T extends { page?: number }>(fields: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const field of fields) {
    const page = field.page ?? 1;
    if (!map.has(page)) map.set(page, []);
    map.get(page)!.push(field);
  }
  return map;
}
