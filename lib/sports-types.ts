/** Club sports offered during onboarding and org branding. */

export interface SportType {
  value: string;
  label: string;
  /** Short mark shown in sidebar org switcher (emoji or abbreviation). */
  mark: string;
}

export const SPORT_TYPES: SportType[] = [
  { value: "rugby", label: "Rugby", mark: "🏉" },
  { value: "lacrosse", label: "Lacrosse", mark: "🥍" },
  { value: "soccer", label: "Soccer", mark: "⚽" },
  { value: "basketball", label: "Basketball", mark: "🏀" },
  { value: "football", label: "Football", mark: "🏈" },
  { value: "volleyball", label: "Volleyball", mark: "🏐" },
  { value: "baseball", label: "Baseball", mark: "⚾" },
  { value: "softball", label: "Softball", mark: "🥎" },
  { value: "hockey", label: "Hockey", mark: "🏒" },
  { value: "field_hockey", label: "Field hockey", mark: "🏑" },
  { value: "tennis", label: "Tennis", mark: "🎾" },
  { value: "golf", label: "Golf", mark: "⛳" },
  { value: "swimming", label: "Swimming & diving", mark: "🏊" },
  { value: "track_field", label: "Track & field", mark: "🏃" },
  { value: "cross_country", label: "Cross country", mark: "🥾" },
  { value: "wrestling", label: "Wrestling", mark: "🤼" },
  { value: "gymnastics", label: "Gymnastics", mark: "🤸" },
  { value: "rowing", label: "Rowing / crew", mark: "🚣" },
  { value: "water_polo", label: "Water polo", mark: "🤽" },
  { value: "ultimate_frisbee", label: "Ultimate frisbee", mark: "🥏" },
  { value: "cricket", label: "Cricket", mark: "🏏" },
  { value: "fencing", label: "Fencing", mark: "🤺" },
  { value: "skiing", label: "Skiing / snowboarding", mark: "⛷️" },
  { value: "cycling", label: "Cycling", mark: "🚴" },
  { value: "esports", label: "Esports", mark: "🎮" },
  { value: "other", label: "Other sport", mark: "🏆" },
];

export function getSportType(value: string | null | undefined): SportType | undefined {
  if (!value) return undefined;
  return SPORT_TYPES.find((s) => s.value === value);
}

export function inferSportTypeFromName(name: string): SportType | undefined {
  const lower = name.toLowerCase();
  return SPORT_TYPES.find((s) => {
    if (s.value === "other") return false;
    return lower.includes(s.label.toLowerCase()) || lower.includes(s.value.replace(/_/g, " "));
  });
}

export function sportsTypesForSelect(): Array<{ value: string; label: string }> {
  return SPORT_TYPES.map((s) => ({ value: s.value, label: s.label }));
}
